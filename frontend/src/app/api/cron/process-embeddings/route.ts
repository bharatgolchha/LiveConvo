import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { triggerEmbeddingsGeneration } from '@/lib/services/embeddings';

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = (await headers()).get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Cron job: Processing embeddings...');
    
    const result = await triggerEmbeddingsGeneration({ 
      batchSize: 20 // Process more in cron job
    });
    
    console.log('✅ Cron job completed:', result);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result
    });
    
  } catch (error) {
    console.error('❌ Cron job error:', error);
    return NextResponse.json(
      { 
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}