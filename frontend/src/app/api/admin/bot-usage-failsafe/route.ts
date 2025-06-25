import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

/**
 * Manual trigger for bot usage failsafe system
 * This endpoint allows admins to manually run the orphan detection and auto-completion
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Run the failsafe function
    const { data, error } = await supabase.rpc('auto_complete_orphaned_recordings');

    if (error) {
      console.error('❌ Failsafe execution failed:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failsafe execution failed',
          details: error.message 
        },
        { status: 500 }
      );
    }

    const result = data[0];
    
    console.log('✅ Manual failsafe completed:', result);

    return NextResponse.json({
      success: true,
      message: 'Failsafe completed successfully',
      results: {
        sessions_fixed: result.sessions_fixed,
        bot_records_fixed: result.bot_records_fixed,
        total_minutes_recovered: result.total_minutes_recovered,
        estimated_revenue_recovered: (result.total_minutes_recovered * 0.10).toFixed(2)
      }
    });

  } catch (error) {
    console.error('❌ Manual failsafe error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get status of bot usage tracking system
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();

    // Get overview of bot usage tracking status
    const { data: stats, error } = await supabase
      .from('bot_usage_tracking')
      .select('status')
      .then(async (result) => {
        if (result.error) throw result.error;

        const statusCounts = result.data.reduce((acc: any, record: any) => {
          acc[record.status] = (acc[record.status] || 0) + 1;
          return acc;
        }, {});

        // Get total sessions with recall bots
        const { data: sessionStats } = await supabase
          .from('sessions')
          .select('recall_bot_status, bot_recording_minutes')
          .not('recall_bot_id', 'is', null);

        const sessionStatusCounts = sessionStats?.reduce((acc: any, record: any) => {
          acc[record.recall_bot_status || 'unknown'] = (acc[record.recall_bot_status || 'unknown'] || 0) + 1;
          return acc;
        }, {}) || {};

        const totalMinutes = sessionStats?.reduce((sum: number, record: any) => sum + (record.bot_recording_minutes || 0), 0) || 0;

        return { 
          data: {
            bot_tracking_status: statusCounts,
            session_status: sessionStatusCounts,
            total_recorded_minutes: totalMinutes,
            estimated_total_revenue: (totalMinutes * 0.10).toFixed(2)
          },
          error: null 
        };
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Status check error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 