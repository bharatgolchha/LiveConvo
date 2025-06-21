import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Clock, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Video, 
  Users, 
  ChevronDown, 
  ChevronRight,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useBotUsage } from '@/lib/meeting/hooks/useBotUsage';
import { cn } from '@/lib/utils';
import { format, parseISO, formatDistanceToNow } from 'date-fns';

interface BotUsageDisplayProps {
  organizationId?: string;
  className?: string;
}

const platformIcons = {
  google_meet: '🎥',
  zoom: '📹',
  teams: '💼',
  unknown: '🤖'
};

const statusColors = {
  completed: 'text-green-600 bg-green-50',
  failed: 'text-red-600 bg-red-50',
  active: 'text-blue-600 bg-blue-50'
};

const statusIcons = {
  completed: CheckCircle,
  failed: XCircle,
  active: Clock
};

export function BotUsageDisplay({ organizationId, className }: BotUsageDisplayProps) {
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  
  console.log('🤖 BotUsageDisplay received organizationId:', organizationId);
  
  const { sessions, stats, loading, error, refetch } = useBotUsage(organizationId);

  const toggleSession = (sessionId: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}m` : ''}`;
  };

  const formatCurrency = (amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(num);
  };

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Bot Usage
          </h3>
          <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-lg p-4 border animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-6 bg-muted rounded w-3/4"></div>
            </div>
          ))}
        </div>
        
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-lg p-4 border animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Bot Usage
          </h3>
          <button 
            onClick={refetch}
            className="p-2 hover:bg-muted rounded-full transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-medium">Failed to load bot usage</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Bot Usage
        </h3>
        <button 
          onClick={refetch}
          className="p-2 hover:bg-muted rounded-full transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Users className="w-3 h-3" />
            Total Sessions
          </div>
          <div className="text-2xl font-bold">{stats.totalSessions}</div>
        </div>
        
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Clock className="w-3 h-3" />
            Total Minutes
          </div>
          <div className="text-2xl font-bold">{stats.totalMinutes}</div>
        </div>
        
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <DollarSign className="w-3 h-3" />
            Total Cost
          </div>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalCost)}</div>
        </div>
        
        <div className="bg-card rounded-lg p-4 border">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <TrendingUp className="w-3 h-3" />
            Avg. Length
          </div>
          <div className="text-2xl font-bold">{Math.round(stats.avgSessionLength)}m</div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="space-y-3">
        <h4 className="font-medium text-muted-foreground">Recent Bot Sessions</h4>
        
        {sessions.length === 0 ? (
          <div className="bg-muted/30 rounded-lg p-8 text-center">
            <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No bot sessions found</p>
            <p className="text-sm text-muted-foreground">Bot usage will appear here once you start recording meetings with AI bots.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {sessions.map((session, index) => {
                const isExpanded = expandedSessions.has(session.id);
                const StatusIcon = statusIcons[session.status];
                
                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-card rounded-lg border overflow-hidden"
                  >
                    <div 
                      className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => toggleSession(session.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="text-lg">
                            {platformIcons[session.meetingPlatform as keyof typeof platformIcons] || platformIcons.unknown}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium truncate">{session.title}</h5>
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                                statusColors[session.status]
                              )}>
                                <StatusIcon className="w-3 h-3" />
                                {session.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {session.botRecordingMinutes}m
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3" />
                                {formatCurrency(session.botBillableAmount)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDistanceToNow(parseISO(session.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="text-right text-sm">
                            <div className="font-medium">{session.botRecordingMinutes}m</div>
                            <div className="text-muted-foreground">{formatCurrency(session.botBillableAmount)}</div>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t bg-muted/20"
                        >
                          <div className="p-4 space-y-3">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <div className="text-muted-foreground">Platform</div>
                                <div className="font-medium capitalize">{session.meetingPlatform.replace('_', ' ')}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Duration</div>
                                <div className="font-medium">{formatDuration(session.recordingDurationSeconds)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Started</div>
                                <div className="font-medium">
                                  {session.recordingStartedAt ? format(parseISO(session.recordingStartedAt), 'MMM d, HH:mm') : 'N/A'}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">Bot ID</div>
                                <div className="font-mono text-xs">{session.botId.slice(0, 8)}...</div>
                              </div>
                            </div>
                            
                            {session.recordingStartedAt && session.recordingEndedAt && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Video className="w-3 h-3" />
                                <span>
                                  Recorded from {format(parseISO(session.recordingStartedAt), 'HH:mm')} to {format(parseISO(session.recordingEndedAt), 'HH:mm')}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
} 