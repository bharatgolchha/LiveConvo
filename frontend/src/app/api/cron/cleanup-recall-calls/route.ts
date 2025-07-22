import { NextResponse } from 'next/server';

const RECALL_API_KEY = process.env.RECALL_AI_API_KEY;
const RECALL_BASE_URL = 'https://us-east-1.recall.ai/api/v1';
const DAYS_TO_KEEP = 7;

export async function GET(request: Request) {
  // Verify this is called by Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!RECALL_API_KEY) {
    return NextResponse.json({ error: 'RECALL_AI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP);

    // Fetch all bots
    const bots = await fetchAllBots();
    
    // Filter old bots
    const oldBots = bots.filter(bot => {
      const createdAt = new Date(bot.created_at as string | number | Date);
      return createdAt < cutoffDate;
    });

    console.log(`Found ${oldBots.length} bots older than ${DAYS_TO_KEEP} days`);

    // Delete old bots
    let deletedCount = 0;
    let failedCount = 0;

    for (const bot of oldBots) {
      try {
        await deleteBot(bot.id);
        deletedCount++;
        // Rate limit: 300 requests per min = 5 per second
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to delete bot ${bot.id}:`, error);
        failedCount++;
      }
    }

    const result = {
      message: 'Cleanup completed',
      totalBots: bots.length,
      oldBots: oldBots.length,
      deleted: deletedCount,
      failed: failedCount,
      cutoffDate: cutoffDate.toISOString()
    };

    console.log('Cleanup result:', result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Cleanup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

interface Bot {
  id: string;
  [key: string]: unknown;
}

async function fetchAllBots(): Promise<Bot[]> {
  const bots: Bot[] = [];
  let nextUrl: string | null = `${RECALL_BASE_URL}/bot/`;
  
  const headers = {
    'Authorization': `Token ${RECALL_API_KEY}`,
    'Content-Type': 'application/json'
  };

  while (nextUrl) {
    const response: Response = await fetch(nextUrl, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch bots: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    bots.push(...(data.results || []));
    nextUrl = data.next;
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return bots;
}

async function deleteBot(botId: string): Promise<void> {
  const url = `${RECALL_BASE_URL}/bot/${botId}/`;
  const headers = {
    'Authorization': `Token ${RECALL_API_KEY}`,
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, {
    method: 'DELETE',
    headers
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to delete bot: ${response.status} ${response.statusText}`);
  }
}