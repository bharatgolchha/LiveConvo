import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  XCircle,
  Zap,
  ArrowRight,
  Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

interface WebhookLog {
  id: string;
  webhook_type: string;
  event_type: string;
  bot_id?: string;
  session_id?: string;
  payload: any;
  processed: boolean;
  processing_time_ms?: number;
  created_at: string;
}

interface WebhookStats {
  total: number;
  processed: number;
  failed: number;
  avgProcessingTime: number;
  recentEvents: WebhookLog[];
}

export function WebhookMonitor({ sessionId }: { sessionId?: string }) {
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchWebhookData = async () => {
    
    try {
      // Build query
      let query = supabase
        .from('webhook_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }
      
      if (selectedType !== 'all') {
        query = query.eq('webhook_type', selectedType);
      }
      
      const { data: logs, error } = await query;
      
      if (error) throw error;
      
      // Calculate stats
      const total = logs?.length || 0;
      const processed = logs?.filter(l => l.processed).length || 0;
      const failed = total - processed;
      const avgProcessingTime = logs && logs.length > 0
        ? logs
            .filter(l => l.processing_time_ms)
            .reduce((sum, l) => sum + (l.processing_time_ms || 0), 0) / processed
        : 0;
      
      setStats({
        total,
        processed,
        failed,
        avgProcessingTime,
        recentEvents: logs || []
      });
    } catch (error) {
      console.error('Failed to fetch webhook data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhookData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchWebhookData, 5000);
      return () => clearInterval(interval);
    }
  }, [sessionId, selectedType, autoRefresh]);

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('bot')) return <Zap className="w-3 h-3" />;
    if (eventType.includes('transcript')) return <Activity className="w-3 h-3" />;
    if (eventType.includes('participant')) return <ArrowRight className="w-3 h-3" />;
    return <Clock className="w-3 h-3" />;
  };

  const getStatusColor = (processed: boolean) => {
    return processed 
      ? 'bg-green-100 text-green-700' 
      : 'bg-red-100 text-red-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Webhook Monitor</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "px-3 py-1 rounded-lg text-sm transition-colors",
              autoRefresh 
                ? "bg-blue-100 text-blue-700" 
                : "bg-gray-100 text-gray-700"
            )}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button
            onClick={fetchWebhookData}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Activity className="w-3 h-3" />
            Total Events
          </div>
          <div className="text-2xl font-bold">{stats?.total || 0}</div>
        </div>
        
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
            <CheckCircle className="w-3 h-3" />
            Processed
          </div>
          <div className="text-2xl font-bold text-green-600">{stats?.processed || 0}</div>
        </div>
        
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center gap-2 text-red-600 text-sm mb-1">
            <XCircle className="w-3 h-3" />
            Failed
          </div>
          <div className="text-2xl font-bold text-red-600">{stats?.failed || 0}</div>
        </div>
        
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Clock className="w-3 h-3" />
            Avg Time
          </div>
          <div className="text-2xl font-bold">
            {stats?.avgProcessingTime ? `${Math.round(stats.avgProcessingTime)}ms` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-1 rounded-lg border bg-background text-sm"
        >
          <option value="all">All Events</option>
          <option value="bot_status">Bot Status</option>
          <option value="transcript">Transcripts</option>
          <option value="participant">Participants</option>
          <option value="bot_monitor">Monitoring</option>
        </select>
      </div>

      {/* Event List */}
      <div className="space-y-2">
        <h4 className="font-medium text-muted-foreground">Recent Events</h4>
        
        {stats?.recentEvents.length === 0 ? (
          <div className="bg-muted/30 rounded-lg p-8 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No webhook events found</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {stats?.recentEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-lg p-3 border hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {getEventIcon(event.event_type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{event.event_type}</span>
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            getStatusColor(event.processed)
                          )}>
                            {event.processed ? 'Processed' : 'Failed'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{event.webhook_type}</span>
                          {event.processing_time_ms && (
                            <span>{event.processing_time_ms}ms</span>
                          )}
                          <span title={format(new Date(event.created_at), 'PPpp')}>
                            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        {event.bot_id && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Bot: {event.bot_id.slice(0, 8)}...
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Payload
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs max-w-md overflow-auto">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </details>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}