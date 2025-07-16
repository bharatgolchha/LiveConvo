'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  BellIcon, 
  PlusIcon,
  MicrophoneIcon,
  ClockIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  TrashIcon,
  XCircleIcon,
  CalendarIcon,
  Bars3Icon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardDataWithFallback } from '@/lib/hooks/useDashboardDataWithFallback';
// Removed useSessionThreads import - no longer needed for grouped view
import { useSessionData } from '@/lib/hooks/useSessionData';
import { useDebounce } from '@/lib/utils/debounce';
import type { Session } from '@/lib/hooks/useSessions';
import { defaultStats } from '@/lib/hooks/useUserStats';
import { useUpcomingMeetings } from '@/lib/hooks/useUpcomingMeetings';
import { useRealtimeDashboard } from '@/lib/hooks/useRealtimeDashboard';
import { useAutoRefresh } from '@/lib/hooks/useAutoRefresh';
import { DeleteConfirmationModal } from '@/components/ui/DeleteConfirmationModal';
import { PricingModal } from '@/components/ui/PricingModal';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { ConversationListDate } from '@/components/ui/ConversationDateIndicator';
import { LoadingModal } from '@/components/ui/LoadingModal';
import type { ConversationConfig } from '@/types/app';
// Removed ConversationThread import - no longer needed for grouped view
import { Pagination } from '@/components/ui/Pagination';
import { DashboardChatProvider } from '@/contexts/DashboardChatContext';
import { DashboardChatbot } from '@/components/dashboard/DashboardChatbot';
import dynamic from 'next/dynamic';

// Dynamically load smaller components to reduce initial bundle size
const DashboardHeader = dynamic(() => import('@/components/dashboard/DashboardHeader'));
const DashboardSidebar = dynamic(() => import('@/components/dashboard/DashboardSidebar'));
const UpcomingMeetingsSidebar = dynamic(() => import('@/components/dashboard/UpcomingMeetingsSidebar').then(mod => ({ default: mod.UpcomingMeetingsSidebar })), { ssr: false });
const CalendarConnectionBanner = dynamic(() => import('@/components/calendar/CalendarConnectionBanner').then(mod => ({ default: mod.CalendarConnectionBanner })));

// Newly extracted components (loaded lazily to reduce initial JS)
const ConversationInboxItem = dynamic(() => import('@/components/dashboard/ConversationInboxItem'));
const MeetingCardAdapter = dynamic(() => import('@/components/dashboard/MeetingCardAdapter').then(mod => ({ default: mod.MeetingCardAdapter })));
const EmptyState = dynamic(() => import('@/components/dashboard/EmptyState'));
const NewConversationModal = dynamic(() => import('@/components/dashboard/NewConversationModal'));
const ContextUploadWidget = dynamic(() => import('@/components/dashboard/ContextUploadWidget'));
const NewConversationButton = dynamic(() => import('@/components/dashboard/NewConversationButton').then(mod => ({ default: mod.NewConversationButton })));
const CreateMeetingModal = dynamic(() => import('@/components/meeting/create/CreateMeetingModal').then(mod => ({ default: mod.CreateMeetingModal })));
const UsageWarningBanner = dynamic(() => import('@/components/dashboard/UsageWarningBanner').then(mod => ({ default: mod.UsageWarningBanner })));

// Types (using Session from useSessions hook)

interface User {
  name: string;
  email: string;
  avatar?: string;
  plan: 'free' | 'pro' | 'team';
  is_admin?: boolean;
}

interface UsageStats {
  monthlyAudioHours: number;
  monthlyAudioLimit: number;
  monthlyMinutesUsed?: number;
  monthlyMinutesLimit?: number;
  minutesRemaining?: number;
  totalSessions: number;
  completedSessions: number;
}

// No mock data - using real data from hooks

// Main Dashboard Component
const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showMobileMeetings, setShowMobileMeetings] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Read 'tab' query parameter to set initial active path
  const tabParam = searchParams.get('tab');
  const initialActivePath = tabParam || 'conversations';
  
  const [activePath, setActivePath] = useState(initialActivePath);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationSessionTitle, setNavigationSessionTitle] = useState('');
  const [isNewSession, setIsNewSession] = useState(false);
  // Removed groupByThread state - always use list view
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20); // Number of items per page

  // Get all dashboard data from unified hook
  const { 
    data: dashboardData,
    loading: dataLoading,
    error: dataError,
    fetchDashboardData,
    updateSession,
    deleteSession,
    refreshData,
    addSession,
    removeSession
  } = useDashboardDataWithFallback();
  
  // Extract data from dashboard response
  const sessions = dashboardData?.sessions || [];
  const totalCount = dashboardData?.total_count || 0;
  const hasMore = dashboardData?.has_more || false;
  const pagination = dashboardData?.pagination || null;
  const userStats = dashboardData?.stats || null;
  const subscription = dashboardData?.subscription || null;
  const sessionsLoading = dataLoading;
  const sessionsError = dataError;

  // Debug: Log userStats to check minutes data
  React.useEffect(() => {
    if (userStats) {
      console.log('📊 Dashboard userStats:', {
        monthlyMinutesUsed: userStats.monthlyMinutesUsed,
        monthlyMinutesLimit: userStats.monthlyMinutesLimit,
        minutesRemaining: userStats.minutesRemaining,
        fullStats: userStats
      });
    }
  }, [userStats]);

  // Unified real-time dashboard updates
  const { isConnected: realtimeConnected } = useRealtimeDashboard({
    onSessionInsert: (newSession) => {
      console.log('🆕 Real-time new session:', newSession);
      // Add the new session to local state
      addSession(newSession);
    },
    onSessionUpdate: (updatedSession) => {
      console.log('🔄 Real-time session update:', updatedSession);
      // Update the session in local state
      updateSession(updatedSession.id, updatedSession);
    },
    onSessionDelete: (sessionId) => {
      console.log('🗑️ Real-time session delete:', sessionId);
      // Remove the session from local state
      removeSession(sessionId);
    },
    onBotStatusUpdate: (update) => {
      console.log('🤖 Real-time bot status update:', update);
      // Update the session in local state
      updateSession(update.session_id, {
        recall_bot_status: update.status as Session['recall_bot_status'],
        recall_bot_id: update.bot_id,
        updated_at: update.updated_at
      });
    }
  });

  // Auto-refresh fallback when real-time is not connected
  useAutoRefresh({
    onRefresh: refreshData,
    interval: 30000, // Refresh every 30 seconds
    enabled: !realtimeConnected && !dataLoading // Only enable when real-time is down and not already loading
  });

  // Show a small notification when using fallback mode
  React.useEffect(() => {
    if (!realtimeConnected && sessions.length > 0) {
      console.log('ℹ️ Real-time updates unavailable - using auto-refresh mode (30s intervals)');
    }
  }, [realtimeConnected, sessions.length]);

  // Debug logging
  React.useEffect(() => {
    if (dashboardData) {
      console.log('Dashboard data received:', {
        sessionsCount: sessions.length,
        totalCount,
        hasMore,
        dashboardData
      });
    }
  }, [dashboardData, sessions.length, totalCount, hasMore]);

  // Get session data management hooks
  const { 
    uploadDocuments, 
    saveContext,
    documentsLoading,
    contextLoading 
  } = useSessionData();

  // Extract subscription data
  const planType: 'free' | 'pro' | 'team' = subscription?.plan.name === 'pro' 
    ? 'pro' 
    : subscription?.plan.name === 'team' 
    ? 'team' 
    : 'free';

  // Removed thread grouping - always use list view

  // Get auth session for API calls
  const { session: authSession } = useAuth();

  // Create user object from auth data
  const currentUser: User = {
    name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    plan: planType
  };

  // Update URL when activePath changes
  useEffect(() => {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    if (activePath && activePath !== 'conversations') {
      newSearchParams.set('tab', activePath);
    } else {
      newSearchParams.delete('tab');
    }
    const newUrl = `${window.location.pathname}${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [activePath, searchParams]);

  // Debug subscription status
  useEffect(() => {
    if (subscription) {
      console.log('Dashboard - Subscription loaded:', {
        plan: subscription.plan.name,
        displayName: subscription.plan.displayName,
        status: subscription.subscription.status,
        planType
      });
    }
  }, [subscription, planType]);

  // Check if user needs onboarding (only once)
  useEffect(() => {
    if (!sessionsError) return;
    
    console.log('🔍 Dashboard - checking onboarding:', { sessionsError, user: !!user });
    if (sessionsError.includes('Setup required') || sessionsError.includes('Please complete onboarding first')) {
      console.log('🚀 Dashboard - redirecting to onboarding page');
      router.push('/onboarding?redirect=' + encodeURIComponent(window.location.pathname));
    }
  }, [sessionsError, router]);

  // For paginated data, we use the current sessions directly since filtering is done server-side
  const filtered = useMemo(() => {
    // Always use list view with original sessions (server-side filtered)
    return { sessions: sessions };
  }, [sessions]);
  
  // Use totalCount from API response for pagination
  // Always use the API's totalCount for accurate pagination
  const totalFilteredCount = totalCount || sessions.length;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const offset = (page - 1) * itemsPerPage;
    fetchDashboardData({ 
      ...getCurrentFilters(), 
      limit: itemsPerPage, 
      offset 
    });
  };

  const getCurrentFilters = () => ({
    status: activePath === 'archive' ? 'archived' : undefined,
    search: debouncedSearchQuery || undefined,
  });

  // Update data fetching when filters change (but not pagination)
  React.useEffect(() => {
    if (user && authSession) {
      setCurrentPage(1); // Reset to first page when filters change
      fetchDashboardData({ 
        ...getCurrentFilters(), 
        limit: itemsPerPage, 
        offset: 0 
      });
    }
  }, [activePath, debouncedSearchQuery]); // Only depend on actual filter changes

  const handleNewConversation = () => {
    // Regular conversations are deprecated, redirect to meeting
    setShowNewMeetingModal(true);
  };

  const handleNewMeeting = () => {
    setShowNewMeetingModal(true);
  };

  const handleStartConversation = async (_config: ConversationConfig) => {
    // Regular conversations are deprecated - redirect to meeting creation
    console.warn('Regular conversations are deprecated. Please use meetings.');
    setShowNewMeetingModal(true);
  };
  
  // Helper function to create session via API
  const createSession = async (data: any) => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (authSession?.access_token) {
      headers['Authorization'] = `Bearer ${authSession.access_token}`;
    }

    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || errorData.message || 'Failed to create session');
    }

    const { session } = await response.json();
    // Refresh dashboard data to include new session
    await refreshData();
    return session;
  };

  const handleStartMeeting = async (data: any) => {
    try {
      setIsNavigating(true);
      setNavigationSessionTitle(data.title);
      setIsNewSession(true);

      // Create meeting via API
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (authSession?.access_token) {
        headers['Authorization'] = `Bearer ${authSession.access_token}`;
      }

      const response = await fetch('/api/meeting/create', {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to create meeting');
      }

      const { meeting } = await response.json();

      if (meeting && typeof window !== 'undefined') {
        // Navigate to meeting page
        window.location.href = `/meeting/${meeting.id}`;
      }
    } catch (error) {
      console.error('❌ Failed to create meeting:', error);
      setIsNavigating(false);
      setIsNewSession(false);
      // TODO: Show error toast to user
    }
  };

  const handleResumeSession = (sessionId: string) => {
    // Find the session to get its details
    const session = sessions.find(s => s.id === sessionId);
    if (session && typeof window !== 'undefined') {
      setIsNavigating(true);
      setNavigationSessionTitle(session.title);
      setIsNewSession(false);
      
      // Check if this is a meeting session
      // const isVideoConference = !!(session as any).meeting_url || !!(session as any).meeting_platform;
      
      // All conversations now use the meeting interface
      window.location.href = `/meeting/${sessionId}`;
    }
  };

  const handleViewSummary = (sessionId: string) => {
    window.location.href = `/report/${sessionId}`;
  };

  const handleArchiveSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      // Toggle between archived and previous status
      const newStatus = session.status === 'archived' 
        ? (session.recording_ended_at ? 'completed' : 'draft')
        : 'archived';
      await updateSession(sessionId, { status: newStatus });
    }
  };

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    sessionId: string | null;
    sessionTitle: string | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    sessionId: null,
    sessionTitle: null,
    isLoading: false
  });

  const handleDeleteSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    setDeleteModal({
      isOpen: true,
      sessionId,
      sessionTitle: session?.title || 'Untitled Conversation',
      isLoading: false
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.sessionId) return;

    setDeleteModal(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Perform a hard delete
      const success = await deleteSession(deleteModal.sessionId, true);
      if (success) {
        setDeleteModal({
          isOpen: false,
          sessionId: null,
          sessionTitle: null,
          isLoading: false
        });
      } else {
        // Error handling is done in the hook
        setDeleteModal(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      setDeleteModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleCloseDeleteModal = () => {
    if (deleteModal.isLoading) return;
    setDeleteModal({
      isOpen: false,
      sessionId: null,
      sessionTitle: null,
      isLoading: false
    });
  };

  const handleSessionSelect = (sessionId: string) => {
    setSelectedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allSessionIds = filtered.sessions?.map(s => s.id) || [];
    
    if (selectedSessions.size === allSessionIds.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(allSessionIds));
    }
  };

  const handleBulkArchive = async () => {
    // Update all selected sessions
    const updatePromises = Array.from(selectedSessions).map(sessionId => {
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        const newStatus = session.status === 'archived' 
          ? (session.recording_ended_at ? 'completed' : 'draft')
          : 'archived';
        return updateSession(sessionId, { status: newStatus });
      }
      return Promise.resolve();
    });
    await Promise.all(updatePromises);
    setSelectedSessions(new Set());
  };

  const [bulkDeleteModal, setBulkDeleteModal] = useState({
    isOpen: false,
    count: 0,
    isLoading: false
  });

  const handleBulkDelete = async () => {
    setBulkDeleteModal({
      isOpen: true,
      count: selectedSessions.size,
      isLoading: false
    });
  };

  const handleConfirmBulkDelete = async () => {
    if (!bulkDeleteModal.isOpen || bulkDeleteModal.isLoading) return;

    setBulkDeleteModal(prev => ({ ...prev, isLoading: true }));

    try {
      // Use Promise.all to delete all selected sessions
      const deletePromises = Array.from(selectedSessions).map(id => deleteSession(id, true));
      const results = await Promise.all(deletePromises);
      
      const successfulDeletes = results.filter(Boolean).length;
      console.log(`✅ Bulk delete successful for ${successfulDeletes} sessions.`);
      
      // Clear selection and close modal
      setSelectedSessions(new Set());
      setBulkDeleteModal({ isOpen: false, isLoading: false, count: 0 });

    } catch (error) {
      console.error('❌ Error during bulk delete:', error);
      setBulkDeleteModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleCloseBulkDeleteModal = () => {
    if (bulkDeleteModal.isLoading) return;
    setBulkDeleteModal({
      isOpen: false,
      count: 0,
      isLoading: false
    });
  };


  const activeSessions = sessions.filter(s => s.status === 'active');
  const hasAnySessions = sessions.length > 0;

  // Get upcoming meetings data
  const { count: upcomingMeetingsCount, todayCount: todayMeetingsCount, hasCalendarConnection: hasCalendar } = useUpcomingMeetings();


  const handleCreateFollowUp = async (originalSession: Session) => {
    try {
      setIsNavigating(true);
      setNavigationSessionTitle(`${originalSession.title} – Follow-up`);
      setIsNewSession(true);

      const previousIds = [
        originalSession.id,
        ...(originalSession.linkedConversations?.map(c => c.id) || [])
      ];

      // Create follow-up as a meeting (since regular conversations are deprecated)
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (authSession?.access_token) {
        headers['Authorization'] = `Bearer ${authSession.access_token}`;
      }

      const response = await fetch('/api/meeting/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: `${originalSession.title} – Follow-up`,
          type: originalSession.conversation_type || 'meeting',
          linkedConversationIds: previousIds,
          participantMe: originalSession.participant_me,
          participantThem: originalSession.participant_them,
          context: {
            metadata: {
              selectedPreviousConversations: previousIds,
              created_from: 'follow_up'
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create follow-up meeting');
      }

      const { meeting } = await response.json();

      if (meeting && typeof window !== 'undefined') {
        window.location.href = `/meeting/${meeting.id}`;
      }
    } catch (error) {
      console.error('❌ Failed to create follow-up meeting:', error);
      setIsNavigating(false);
      setIsNewSession(false);
    }
  };

  // Show loading state while checking authentication
  if (!user && !sessionsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-6">Please sign in to access your dashboard.</p>
          <div className="space-x-4">
            <Button onClick={() => window.location.href = '/auth/login'}>
              Sign In
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/auth/signup'}>
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if there are errors
  if (sessionsError && sessionsError.includes('sign in')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Authentication Expired</h1>
          <p className="text-muted-foreground mb-6">Your session has expired. Please sign in again.</p>
          <div className="space-x-4">
            <Button onClick={() => window.location.href = '/auth/login'}>
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while data is being fetched
  if (sessionsLoading && sessions.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-app-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your meetings...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardChatProvider>
      <div className="h-screen bg-background flex flex-col relative overflow-hidden">
        <DashboardHeader 
          user={currentUser} 
          onSearch={handleSearch}
          onNavigateToSettings={() => setActivePath('settings')}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      
      {/* Usage Warning Banner */}
      {userStats && (
        <UsageWarningBanner
          monthlyMinutesUsed={userStats.monthlyMinutesUsed}
          monthlyMinutesLimit={userStats.monthlyMinutesLimit}
          minutesRemaining={userStats.minutesRemaining}
        />
      )}
      
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar - Mobile Drawer */}
        <div className={`
          fixed lg:relative inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out bg-card
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <DashboardSidebar 
            usageStats={userStats || defaultStats}
            activePath={activePath}
            onNavigate={(path) => {
              setIsSidebarOpen(false); // Close sidebar on mobile after navigation
              if (path === 'pricing') {
                setIsPricingModalOpen(true);
              } else if (path === 'referrals') {
                router.push('/dashboard/referrals');
              } else {
                setActivePath(path);
              }
            }}
            currentUser={currentUser}
            onCloseMobile={() => setIsSidebarOpen(false)}
          />
        </div>
        
        <main className="flex-1 overflow-hidden flex">
          {/* Main content area */}
          <div className="flex-1 p-4 sm:p-6 flex flex-col overflow-auto">
            {/* Hero Section */}
            {hasAnySessions && activePath !== 'settings' && activePath !== 'referrals' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-lg sm:text-2xl font-bold mb-2 text-foreground">Welcome back, {currentUser.name}!</h1>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {hasCalendar && upcomingMeetingsCount > 0 ? (
                        todayMeetingsCount > 0 
                          ? `You have ${todayMeetingsCount} meeting${todayMeetingsCount === 1 ? '' : 's'} today${upcomingMeetingsCount > todayMeetingsCount ? ` and ${upcomingMeetingsCount - todayMeetingsCount} more this week` : ''}`
                          : `You have ${upcomingMeetingsCount} upcoming meeting${upcomingMeetingsCount === 1 ? '' : 's'} this week`
                      ) : activeSessions.length > 0 ? (
                        `You have ${activeSessions.length} active meeting${activeSessions.length === 1 ? '' : 's'}`
                      ) : (
                        'Ready to start a new meeting?'
                      )}
                    </p>
                  </div>
                  <NewConversationButton 
                    onNewConversation={handleNewConversation}
                    onNewMeeting={handleNewMeeting}
                  />
                </div>
              </motion.div>
            )}

            {/* Calendar Connection Banner */}
            {activePath === 'conversations' && (
              <CalendarConnectionBanner />
            )}

            {/* Main Content */}
            {activePath === 'settings' ? (
              <SettingsPanel 
                onSessionsDeleted={() => {
                  refreshData(); // Refresh dashboard data after deletion
                  setActivePath('conversations'); // Return to conversations view
                }}
              />
            ) : !hasAnySessions && activePath !== 'archive' && !searchQuery ? (
              <EmptyState onNewConversation={handleNewConversation} onNewMeeting={handleNewMeeting} />
            ) : (
              <div className="flex flex-col flex-1">
                {/* Search Results Header */}
                {searchQuery && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-4"
                  >
                    <p className="text-muted-foreground">
                      {totalFilteredCount} result{totalFilteredCount === 1 ? '' : 's'} for &quot;{searchQuery}&quot;
                    </p>
                  </motion.div>
                )}

                {/* Meetings Inbox List */}
                {totalFilteredCount > 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-lg shadow-sm border border-border overflow-hidden flex flex-col flex-1"
                  >
                    {/* List Header */}
                    <div className="px-3 sm:px-6 py-2 sm:py-3 bg-muted/30 border-b border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Select All Checkbox */}
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedSessions.size === totalFilteredCount && totalFilteredCount > 0}
                              onChange={handleSelectAll}
                              className="rounded border-input text-app-primary focus:ring-app-primary"
                            />
                          </label>
                          
                          <h2 className="text-sm font-medium text-foreground">
                            {selectedSessions.size > 0 ? (
                              `${selectedSessions.size} selected`
                            ) : (
                              activePath === 'archive' 
                                ? `Archived Meetings (${totalFilteredCount})`
                                : `Meetings (${totalFilteredCount})`
                            )}
                          </h2>
                          
                          {/* Bulk Actions */}
                          {selectedSessions.size > 0 && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBulkArchive}
                                className="text-xs"
                              >
                                {activePath === 'archive' ? 'Unarchive Selected' : 'Archive Selected'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBulkDelete}
                                className="text-xs text-destructive"
                              >
                                Delete Selected
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedSessions(new Set())}
                                className="text-xs text-muted-foreground"
                              >
                                Clear
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        {selectedSessions.size === 0 && (
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-app-success"></div>
                              Active ({activeSessions.length})
                            </span>
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-app-primary"></div>
                              Completed ({sessions.filter(s => s.status === 'completed').length})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Meeting List */}
                    <div className="flex-1 p-3 sm:p-4 space-y-2 sm:space-y-3">
                      {/* Always render as list view */}
                      {sessions?.map((session) => (
                        <MeetingCardAdapter
                          key={`session-${session.id}`}
                          session={session}
                          selected={selectedSessions.has(session.id)}
                          onSelect={(id, checked) => {
                            if (checked) {
                              setSelectedSessions(prev => new Set([...prev, id]))
                            } else {
                              setSelectedSessions(prev => {
                                const newSet = new Set(prev)
                                newSet.delete(id)
                                return newSet
                              })
                            }
                          }}
                          onOpen={handleResumeSession}
                          onFollowUp={(id) => {
                            const session = sessions.find(s => s.id === id)
                            if (session) {
                              handleCreateFollowUp(session)
                            }
                          }}
                          onReport={handleViewSummary}
                        />
                      )) || <div>No sessions found</div>}
                    </div>

                    {/* Pagination */}
                    {totalFilteredCount > itemsPerPage && (
                      <Pagination
                        currentPage={currentPage}
                        totalItems={totalFilteredCount}
                        itemsPerPage={itemsPerPage}
                        onPageChange={handlePageChange}
                        disabled={sessionsLoading}
                        className="sticky bottom-0 bg-card"
                      />
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-card rounded-lg shadow-sm border border-border overflow-hidden"
                  >
                    <div className="text-center py-16">
                      {activePath === 'archive' ? (
                        <>
                          <ArchiveBoxIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-2">No archived meetings</h3>
                          <p className="text-muted-foreground mb-6">
                            {searchQuery 
                              ? "No archived meetings match your search" 
                              : "Archived meetings will appear here when you archive them"}
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => setActivePath('conversations')}
                            className="hover:bg-muted"
                          >
                            View Active Meetings
                          </Button>
                        </>
                      ) : (
                        <>
                          <MagnifyingGlassIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-2">No results found</h3>
                          <p className="text-muted-foreground mb-6">
                            {searchQuery 
                              ? `No meetings match your search for "${searchQuery}"`
                              : "Try adjusting your search terms or start a new meeting."}
                          </p>
                          <Button
                            onClick={handleNewConversation}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          >
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Start New Meeting
                          </Button>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
          
          {/* Upcoming Meetings Sidebar - Desktop */}
          <UpcomingMeetingsSidebar className="hidden xl:flex" />
        </main>
      </div>


      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={showNewConversationModal}
        onClose={() => setShowNewConversationModal(false)}
        onStart={handleStartConversation}
        sessions={sessions}
      />

      {/* Create Meeting Modal */}
      <CreateMeetingModal
        isOpen={showNewMeetingModal}
        onClose={() => setShowNewMeetingModal(false)}
        onStart={handleStartMeeting}
      />


      {/* Pricing Modal */}
      <PricingModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        title={`Delete "${deleteModal.sessionTitle}"?`}
        description="Are you sure you want to permanently delete this conversation? This action cannot be undone."
        isLoading={deleteModal.isLoading}
      />

      {/* Bulk Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={bulkDeleteModal.isOpen}
        onClose={handleCloseBulkDeleteModal}
        onConfirm={handleConfirmBulkDelete}
        title="Delete Multiple Conversations"
        description={`Are you sure you want to permanently delete ${bulkDeleteModal.count} conversation${bulkDeleteModal.count === 1 ? '' : 's'}? This action cannot be undone.`}
        isLoading={bulkDeleteModal.isLoading}
      />

      {/* Navigation Loading Modal */}
      <LoadingModal
        isOpen={isNavigating}
        title={navigationSessionTitle || (isNewSession ? "Starting conversation" : "Loading conversation")}
        description={isNewSession ? "Setting up your session" : "Please wait a moment"}
        isNewSession={isNewSession}
      />

      {/* Mobile Meetings Toggle Button */}
      {hasAnySessions && (
        <button
          onClick={() => setShowMobileMeetings(!showMobileMeetings)}
          className="xl:hidden fixed bottom-28 right-6 z-30 bg-primary text-primary-foreground rounded-full p-3 shadow-lg"
          aria-label="View upcoming meetings"
        >
          <CalendarIcon className="h-5 w-5" />
        </button>
      )}
      
      {/* Mobile Meetings Drawer */}
      {showMobileMeetings && (
        <div className="xl:hidden fixed inset-0 z-30">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowMobileMeetings(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold">Upcoming Meetings</h3>
              <button
                onClick={() => setShowMobileMeetings(false)}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                aria-label="Close"
              >
                <XCircleIcon className="w-5 h-5" />
              </button>
            </div>
            <UpcomingMeetingsSidebar 
              className="flex h-full"
            />
          </div>
        </div>
      )}

      {/* Dashboard Chatbot */}
      <DashboardChatbot />
    </div>
    </DashboardChatProvider>
  );
};

const ProtectedDashboard = () => (
  <ProtectedRoute>
    <DashboardPage />
  </ProtectedRoute>
);

export default ProtectedDashboard; 