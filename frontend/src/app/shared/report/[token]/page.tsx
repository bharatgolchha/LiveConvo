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
  Loader2,
  FileText,
  Lightbulb,
  Target,
  BarChart3,
  MessageSquare,
  Sparkles,
  Home
} from 'lucide-react';
import { TabbedReport } from '@/components/report/TabbedReport';
import { ParticipantsList } from '@/components/report/ParticipantsList';
import { Button } from '@/components/ui/Button';

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

  // Filter tabs based on allowed tabs - moved before conditionals
  const isTabAllowed = (tabId: string) => {
    if (!reportData?.report) return false;
    const tabMapping: { [key: string]: string } = {
      'overview': 'overview',
      'insights': 'insights',
      'actions': 'actions',
      'analytics': 'analytics',
      'followup': 'followup',
      'transcript': 'transcript',
      'custom': 'custom'
    };
    
    return reportData.report.allowedTabs?.includes(tabMapping[tabId]);
  };

  // Get allowed tabs for navigation
  const tabs = reportData?.report ? [
    { id: 'overview', label: 'Overview', icon: FileText, badge: null },
    { id: 'insights', label: 'Insights', icon: Lightbulb, badge: reportData.report.summary?.keyDecisions?.length || 0 },
    { id: 'actions', label: 'Actions', icon: Target, badge: reportData.report.summary?.actionItems?.length || 0 },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: null },
    { id: 'followup', label: 'Follow-up', icon: Calendar, badge: null },
    { id: 'transcript', label: 'Transcript', icon: MessageSquare, badge: null },
    { id: 'custom', label: 'Custom', icon: Sparkles, badge: null }
  ].filter(tab => isTabAllowed(tab.id)) : [];

  // Ensure activeTab is valid - this hook must always be called
  useEffect(() => {
    if (reportData?.report && !isTabAllowed(activeTab) && tabs.length > 0) {
      setActiveTab(tabs[0].id);
    }
  }, [activeTab, tabs.length, reportData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading shared report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Unable to Load Report</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.href = '/'} variant="outline" className="mt-4">
            Go to Home
          </Button>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  const { report } = reportData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Modern Sticky Header with Integrated Tabs */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-background/95 backdrop-blur-xl border-b border-border/40 shadow-sm">
        <div className="container mx-auto px-4">
          {/* Top Header Row */}
          <div className="flex h-12 items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Shared Report</span>
                <span className="text-[10px] px-2 py-0.5 bg-muted rounded-full text-muted-foreground">View Only</span>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              <Button onClick={copyLink} variant="ghost" size="sm" className="h-8 px-3 text-xs">
                <Share2 className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Copy Link</span>
              </Button>
              <Button 
                onClick={() => window.location.href = '/'} 
                variant="ghost" 
                size="sm" 
                className="h-8 px-3 text-xs"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline ml-1">Home</span>
              </Button>
            </div>
          </div>
          
          {/* Integrated Tab Navigation */}
          <div className="flex items-center justify-between border-t border-border/30">
            <nav className="flex-1 flex gap-0.5 sm:gap-1 px-1 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative py-2.5 px-2 sm:px-3 text-[10px] sm:text-xs font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 group ${
                      activeTab === tab.id
                        ? 'text-primary bg-primary/5'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">
                        {tab.id === 'overview' ? 'View' :
                         tab.id === 'insights' ? 'Insights' :
                         tab.id === 'actions' ? 'Tasks' :
                         tab.id === 'analytics' ? 'Stats' :
                         tab.id === 'followup' ? 'Next' :
                         tab.id === 'transcript' ? 'Text' :
                         'Custom'}
                      </span>
                      {tab.badge !== null && tab.badge > 0 && (
                        <span className={`ml-1 px-1.5 py-0.5 text-[10px] rounded-full transition-all duration-200 ${
                          activeTab === tab.id 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {tab.badge}
                        </span>
                      )}
                    </div>
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-primary/70 rounded-t-full animate-in slide-in-from-bottom-1 duration-200" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Add padding top to account for fixed header */}
      <div className="container mx-auto px-4 pt-[108px] sm:pt-[112px] pb-4">
        <div className="max-w-6xl mx-auto">
          {/* Compact Shared Info Section */}
          <div className="mb-4 p-3 bg-card border border-border rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              {/* Meeting Details */}
              <div className="flex-1">
                <div className="mb-1">
                  <div className="flex items-start sm:items-center gap-2 flex-col sm:flex-row">
                    <h1 className="text-base sm:text-lg font-bold text-foreground">
                      {report.title || 'Untitled Conversation'}
                    </h1>
                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border bg-muted text-muted-foreground border-border">
                      {report.type === 'meeting' ? 'Meeting' : report.type}
                    </span>
                  </div>
                  {report.shareMessage && (
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                      Message: {report.shareMessage}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(report.duration)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(report.createdAt)}
                  </span>
                  <div className="flex items-center gap-1">
                    <ParticipantsList
                      sessionId={report.id}
                      showLabel={false}
                      fallbackParticipants={{ me: report.participants.me, them: report.participants.them }}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
              
              {/* Shared Info */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="text-center">
                  <div className="font-medium text-foreground">Shared by</div>
                  <div className="text-[10px]">{report.sharedBy}</div>
                </div>
                {report.expiresAt && (
                  <div className="text-center">
                    <div className="font-medium text-foreground">Expires</div>
                    <div className="text-[10px]">{new Date(report.expiresAt).toLocaleDateString()}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabbed Report Component - Now without its own tabs */}
          <TabbedReport 
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
            hideNavigation={true}
            sharedToken={token}
          />
        </div>
      </div>
    </div>
  );
}