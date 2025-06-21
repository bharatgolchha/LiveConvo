import { createServerSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { BotUsageCalculator } from '@/lib/services/bot-usage-calculator';

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Check if user is authenticated and has admin privileges
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, allow any authenticated user to run backfill
    // In production, you'd want to check for admin role
    
    console.log('🚀 Starting bot usage backfill process...');
    
    const calculator = new BotUsageCalculator();
    await calculator.backfillMissingUsage();
    
    return NextResponse.json({ 
      success: true,
      message: 'Bot usage backfill completed successfully'
    });
    
  } catch (error) {
    console.error('❌ Bot usage backfill failed:', error);
    
    return NextResponse.json({
      error: 'Backfill failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get backfill statistics
    const { data: totalSessions } = await supabase
      .from('sessions')
      .select('id', { count: 'exact' })
      .not('recall_bot_id', 'is', null);

    const { data: processedSessions } = await supabase
      .from('sessions')
      .select('id', { count: 'exact' })
      .not('recall_bot_id', 'is', null)
      .gt('bot_recording_minutes', 0);

    const { data: botUsageRecords } = await supabase
      .from('bot_usage_tracking')
      .select('id', { count: 'exact' });

    return NextResponse.json({
      stats: {
        totalBotSessions: totalSessions?.length || 0,
        processedSessions: processedSessions?.length || 0,
        botUsageRecords: botUsageRecords?.length || 0,
        pendingBackfill: (totalSessions?.length || 0) - (processedSessions?.length || 0)
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting backfill stats:', error);
    
    return NextResponse.json({
      error: 'Failed to get backfill statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 