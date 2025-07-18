import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface BotUsageSession {
  id: string; // Unique tracking ID from bot_usage_tracking table
  sessionId: string; // The actual session ID
  title: string;
  meetingPlatform: string;
  recordingStartedAt: string;
  recordingEndedAt: string;
  recordingDurationSeconds: number;
  botRecordingMinutes: number;
  botBillableAmount: string;
  createdAt: string;
  botId: string;
  status: 'completed' | 'failed' | 'active';
}

export interface BotUsageStats {
  totalSessions: number;
  totalMinutes: number;
  totalCost: number;
  avgSessionLength: number;
  currentMonthMinutes: number;
  currentMonthCost: number;
  monthlyBotMinutesLimit: number;
  remainingMinutes: number;
  overageMinutes: number;
  overageCost: number;
  planName: string;
  planDisplayName: string;
}

export interface BotUsageData {
  sessions: BotUsageSession[];
  stats: BotUsageStats;
  loading: boolean;
  error: string | null;
}

export function useBotUsage(organizationId?: string, showAllTime: boolean = false) {
  const [data, setData] = useState<BotUsageData>({
    sessions: [],
    stats: {
      totalSessions: 0,
      totalMinutes: 0,
      totalCost: 0,
      avgSessionLength: 0,
      currentMonthMinutes: 0,
      currentMonthCost: 0,
      monthlyBotMinutesLimit: 60,
      remainingMinutes: 60,
      overageMinutes: 0,
      overageCost: 0,
      planName: 'individual_free',
      planDisplayName: 'Free',
    },
    loading: true,
    error: null,
  });

  const { session } = useAuth();

  const fetchBotUsage = async () => {
    console.log('🎯 fetchBotUsage called with:', {
      hasSession: !!session?.access_token,
      organizationId,
      sessionLength: session?.access_token?.length
    });

    if (!session?.access_token) {
      console.log('❌ No session token available');
      setData(prev => ({ ...prev, loading: false, error: 'Not authenticated' }));
      return;
    }

    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const params = new URLSearchParams();
      if (organizationId) {
        params.append('organization_id', organizationId);
        console.log('✅ Using organization ID:', organizationId);
      } else {
        console.log('⚠️ No organization ID provided, API will auto-detect');
      }
      
      // Add parameter to show all-time data
      if (showAllTime) {
        params.append('all_time', 'true');
        console.log('📅 Requesting all-time bot usage data');
      }

      const url = `/api/usage/bot-minutes?${params}`;
      console.log('📡 Fetching bot usage from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 Bot usage API response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Bot usage API error:', errorText);
        throw new Error(`Failed to fetch bot usage: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Bot usage data received:', result);
      console.log('📊 Bot usage stats summary:', {
        monthlyBotMinutesLimit: result.data?.summary?.monthlyBotMinutesLimit,
        remainingMinutes: result.data?.summary?.remainingMinutes,
        overageMinutes: result.data?.summary?.overageMinutes,
        totalMinutes: result.data?.summary?.totalBillableMinutes
      });
      
      // Map API response to expected format
      const sessions: BotUsageSession[] = result.data?.sessions?.map((session: any) => {
        // Calculate cost per session based on plan limits
        const remainingMinutesAtSessionTime = Math.max(0, 
          (result.data?.summary?.monthlyBotMinutesLimit || 60) - 
          (result.data?.sessions?.filter((s: any) => s.createdAt < session.createdAt)
            .reduce((sum: number, s: any) => sum + s.billableMinutes, 0) || 0)
        );
        const sessionCost = session.billableMinutes <= remainingMinutesAtSessionTime 
          ? 0 
          : (session.billableMinutes - remainingMinutesAtSessionTime) * 0.10;

        return {
          id: session.id, // Use the unique bot_usage_tracking ID
          sessionId: session.sessionId, // Keep the actual session ID
          title: session.sessionTitle,
          meetingPlatform: session.platform,
          recordingStartedAt: session.recordingStarted,
          recordingEndedAt: session.recordingEnded,
          recordingDurationSeconds: session.recordingSeconds,
          botRecordingMinutes: session.billableMinutes,
          botBillableAmount: sessionCost.toFixed(2),
          createdAt: session.createdAt,
          botId: session.botId,
          status: session.status,
        };
      }) || [];

      const stats: BotUsageStats = {
        totalSessions: result.data?.summary?.totalSessions || 0,
        totalMinutes: result.data?.summary?.totalBillableMinutes || 0,
        totalCost: result.data?.summary?.totalCost || 0,
        avgSessionLength: result.data?.summary?.averageMinutesPerSession || 0,
        currentMonthMinutes: result.data?.summary?.totalBillableMinutes || 0,
        currentMonthCost: result.data?.summary?.totalCost || 0,
        monthlyBotMinutesLimit: result.data?.summary?.monthlyBotMinutesLimit || 60,
        remainingMinutes: result.data?.summary?.remainingMinutes || 0,
        overageMinutes: result.data?.summary?.overageMinutes || 0,
        overageCost: result.data?.summary?.overageCost || 0,
        planName: result.data?.subscription?.planName || 'individual_free',
        planDisplayName: result.data?.subscription?.planDisplayName || 'Free',
      };
      
      setData(prev => ({
        ...prev,
        sessions,
        stats,
        loading: false,
        error: null,
      }));
    } catch (error) {
      console.error('Error fetching bot usage:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch bot usage',
      }));
    }
  };

  useEffect(() => {
    fetchBotUsage();
  }, [session?.access_token, organizationId, showAllTime]);

  const refetch = () => {
    fetchBotUsage();
  };

  return {
    ...data,
    refetch,
  };
} 