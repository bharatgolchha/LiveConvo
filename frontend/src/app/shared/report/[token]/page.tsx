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
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { CollaborationPanel } from '@/components/collaboration/CollaborationPanel';

interface SharedReportData {
  report: any;
  isShared: boolean;
}

export default function SharedReportPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [reportData, setReportData] = useState<SharedReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

  useEffect(() => {
    fetchSharedReport();
  }, [token]);

  const fetchSharedReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/reports/shared/${token}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Share link not found or has been removed');
        } else if (response.status === 410) {
          throw new Error('This share link has expired');
        } else {
          throw new Error('Failed to load shared report');
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
          'followup': 'followup'
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
      setLoading(false);
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading shared report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Unable to Load Report</h2>
          <p className="text-muted-foreground">{error}</p>
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
      'followup': 'followup'
    };
    
    return report.allowedTabs?.includes(tabMapping[tabId]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Shared Report Banner */}
          <div className="mb-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground flex items-center gap-2">
                    Shared Report
                    <span className="text-xs px-2 py-0.5 bg-primary/20 rounded-full">Read Only</span>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Shared by {report.sharedBy}
                    {report.expiresAt && (
                      <span className="ml-2">
                        • Expires {formatDate(report.expiresAt)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle className="h-8 w-8" />
                <Button onClick={copyLink} variant="outline" size="sm">
                  <Share2 className="w-3 h-3 mr-1.5" />
                  Copy Link
                </Button>
              </div>
            </div>
            {report.shareMessage && (
              <div className="mt-3 p-3 bg-background/50 rounded-lg">
                <p className="text-sm text-foreground">{report.shareMessage}</p>
              </div>
            )}
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
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {report.participants.me} & {report.participants.them}
                  </span>
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
                wordCount: 0,
                speakingTime: { me: 50, them: 50 },
                sentiment: 'neutral'
              }
            }}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            allowedTabs={report.allowedTabs || []}
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