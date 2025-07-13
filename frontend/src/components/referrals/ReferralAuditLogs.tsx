'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';

interface AuditLog {
  id: string;
  event_type: string;
  user_id: string | null;
  referrer_id: string | null;
  referee_id: string | null;
  referral_id: string | null;
  referral_code: string | null;
  ip_address: string | null;
  event_data: any;
  error_message: string | null;
  created_at: string;
}

const eventTypeColors: Record<string, string> = {
  'link_clicked': 'bg-blue-500',
  'code_validated': 'bg-green-500',
  'code_invalid': 'bg-red-500',
  'signup_attempted': 'bg-yellow-500',
  'signup_completed': 'bg-green-600',
  'self_referral_blocked': 'bg-orange-500',
  'payment_completed': 'bg-green-700',
  'credit_scheduled': 'bg-blue-600',
  'credit_granted': 'bg-green-800',
  'credit_failed': 'bg-red-600',
  'refund_processed': 'bg-purple-500',
  'fraud_detected': 'bg-red-700',
  'error': 'bg-gray-500'
};

export function ReferralAuditLogs() {
  const { user, session } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [pagination, setPagination] = useState({
    limit: 20,
    offset: 0,
    total: 0,
    hasMore: false
  });

  const fetchLogs = async () => {
    if (!session?.access_token) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pagination.limit.toString(),
        offset: pagination.offset.toString()
      });
      
      if (selectedEventType !== 'all') {
        params.append('event_type', selectedEventType);
      }

      const response = await fetch(`/api/referrals/audit-logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setEventCounts(data.eventCounts);
        setPagination(prev => ({
          ...prev,
          total: data.total,
          hasMore: data.pagination.hasMore
        }));
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [session, selectedEventType, pagination.offset]);

  const handleNextPage = () => {
    setPagination(prev => ({
      ...prev,
      offset: prev.offset + prev.limit
    }));
  };

  const handlePrevPage = () => {
    setPagination(prev => ({
      ...prev,
      offset: Math.max(0, prev.offset - prev.limit)
    }));
  };

  const formatEventType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Referral Activity Log</CardTitle>
          <div className="flex gap-2">
            <Select value={selectedEventType} onValueChange={setSelectedEventType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {Object.keys(eventTypeColors).map(type => (
                  <SelectItem key={type} value={type}>
                    {formatEventType(type)} ({eventCounts[type] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={fetchLogs} 
              variant="outline" 
              size="sm"
              disabled={loading}
              className="w-9 h-9 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No activity logs found
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Badge 
                    className={`${eventTypeColors[log.event_type]} text-white`}
                  >
                    {formatEventType(log.event_type)}
                  </Badge>
                  
                  <div className="flex-1">
                    <div className="text-sm">
                      {log.referral_code && (
                        <span className="font-medium">Code: {log.referral_code}</span>
                      )}
                      {log.ip_address && (
                        <span className="text-muted-foreground ml-2">
                          IP: {log.ip_address}
                        </span>
                      )}
                    </div>
                    
                    {log.event_data && Object.keys(log.event_data).length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {JSON.stringify(log.event_data)}
                      </div>
                    )}
                    
                    {log.error_message && (
                      <div className="text-xs text-red-500 mt-1">
                        Error: {log.error_message}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handlePrevPage}
                  variant="outline"
                  size="sm"
                  disabled={pagination.offset === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  onClick={handleNextPage}
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasMore}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}