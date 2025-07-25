'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  Clock,
  Users,
  Share2,
  Calendar,
  AlertCircle,
  Shield,
  Loader2
} from 'lucide-react';
import { SharedTabbedReport } from '@/components/report/SharedTabbedReport';
import { SharedReportHeader } from '@/components/report/SharedReportHeader';
import { Button } from '@/components/ui/Button';
import { CollaborationPanel } from '@/components/collaboration/CollaborationPanel';

interface Participant {
  name: string;
  initials: string;
  color: string;
}

interface SharedReportData {
  report: {
    id: string;
    title: string;
    type: string;
    duration: number;
    wordCount?: number;
    speakingTime?: { me: number; them: number };
    participants: {
      me: string;
      them: string;
    };
    participantsList?: Participant[];
    createdAt: string;
    sharedBy: string;
    shareMessage?: string;
    expiresAt?: string;
    allowedTabs: string[];
    summary: any;
    recall_recording_url?: string;
  };
  isShared: boolean;
  sessionId?: string;
}

export default function SharedReportPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [reportData, setReportData] = useState<SharedReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  useEffect(() => {
    if (!hasInitiallyLoaded) {
      fetchSharedReport();
      setHasInitiallyLoaded(true);
    }
  }, [hasInitiallyLoaded, token]);

  const fetchSharedReport = async () => {
    try {
      // Only set loading on initial load, not on refresh
      if (!hasInitiallyLoaded) {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(`/api/reports/shared/${token}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        if (response.status === 404) {
          throw new Error(errorData.error || 'Share link not found or has been removed');
        } else if (response.status === 410) {
          throw new Error(errorData.error || 'This share link has expired');
        } else {
          throw new Error(errorData.error || `Failed to load shared report (${response.status})`);
        }
      }

      const data = await response.json();
      setReportData(data);

      // Set initial tab to first allowed tab
      if (data.report.allowedTabs?.length > 0) {
        const tabMap: { [key: string]: string } = {
          'overview': 'overview',
          'insights': 'insights',
          'actions': 'actions',
          'analytics': 'analytics',
          'followup': 'followup',
          'transcript': 'transcript',
          'custom': 'custom'
        };
        
        const firstAllowedTab = data.report.allowedTabs.find((tab: string) => tabMap[tab]);
        if (firstAllowedTab) {
          setActiveTab(tabMap[firstAllowedTab]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch shared report:', err);
      setError(err instanceof Error ? err.message : 'Failed to load shared report');
    } finally {
      // Only set loading false if we were loading
      if (!hasInitiallyLoaded || loading) {
        setLoading(false);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    alert('Share link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <SharedReportHeader />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center space-y-4">
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading shared report...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <SharedReportHeader />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center space-y-4 max-w-md">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Unable to Load Report</h2>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  const { report } = reportData;

  // Filter tabs based on allowed tabs
  const isTabAllowed = (tabId: string) => {
    const tabMapping: { [key: string]: string } = {
      'overview': 'overview',
      'insights': 'insights',
      'actions': 'actions',
      'analytics': 'analytics',
      'followup': 'followup',
      'transcript': 'transcript',
      'custom': 'custom'
    };
    
    return report.allowedTabs?.includes(tabMapping[tabId]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <SharedReportHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Shared Report Info Card */}
          <div className="mb-6 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 rounded-xl border border-border shadow-sm">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center shadow-sm">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                      Shared Report
                      <span className="text-xs px-2 py-1 bg-muted rounded-full font-normal text-muted-foreground">View Only</span>
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Shared by {report.sharedBy}
                      </span>
                      {report.expiresAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Expires {formatDate(report.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button onClick={copyLink} variant="outline" size="sm" className="shadow-sm">
                  <Share2 className="w-3 h-3 mr-1.5" />
                  Copy Link
                </Button>
              </div>
              {report.shareMessage && (
                <div className="mt-4 p-4 bg-background/80 rounded-lg border border-border/50">
                  <p className="text-sm text-foreground leading-relaxed">
                    <span className="font-medium text-muted-foreground">Message:</span> {report.shareMessage}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Report Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {report.title}
                </h1>
                <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(report.duration)}
                  </span>
                  {report.participantsList && report.participantsList.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <Users className="w-3 h-3" />
                      {report.participantsList.map((participant, index) => (
                        <span key={index} className="flex items-center gap-1">
                          {index > 0 && <span className="text-muted-foreground">&</span>}
                          <span>{participant.name}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {report.participants.me} & {report.participants.them}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(report.createdAt)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="h-px bg-border mt-4" />
          </div>

          {/* Tabbed Report Component with filtered tabs */}
          <SharedTabbedReport 
            report={{
              ...report,
              analytics: {
                wordCount: report.wordCount || 0,
                speakingTime: report.speakingTime || { me: 50, them: 50 },
                sentiment: 'neutral'
              },
              id: report.id,
              recordingUrl: report.recall_recording_url
            }}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            allowedTabs={report.allowedTabs || []}
            sharedToken={token}
          />

          {/* Collaboration Panel for shared view */}
          {report && (
            <CollaborationPanel
              sessionId={report.id}
              currentSection={activeTab}
              isSharedView={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}