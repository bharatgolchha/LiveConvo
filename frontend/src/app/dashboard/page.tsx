'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  XCircleIcon
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { OnboardingModal } from '@/components/auth/OnboardingModal';
import { useAuth } from '@/contexts/AuthContext';
import { useSessions, type Session } from '@/lib/hooks/useSessions';
import { useUserStats, defaultStats } from '@/lib/hooks/useUserStats';
import { useSessionData } from '@/lib/hooks/useSessionData';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { DeleteConfirmationModal } from '@/components/ui/DeleteConfirmationModal';
import { PricingModal } from '@/components/ui/PricingModal';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { ConversationListDate } from '@/components/ui/ConversationDateIndicator';
import { LoadingModal } from '@/components/ui/LoadingModal';
import type { ConversationConfig } from '@/types/app';
import dynamic from 'next/dynamic';

// Dynamically load smaller components to reduce initial bundle size
const DashboardHeader = dynamic(() => import('@/components/dashboard/DashboardHeader'));
const DashboardSidebar = dynamic(() => import('@/components/dashboard/DashboardSidebar'));

// Newly extracted components (loaded lazily to reduce initial JS)
const ConversationInboxItem = dynamic(() => import('@/components/dashboard/ConversationInboxItem'));
const EmptyState = dynamic(() => import('@/components/dashboard/EmptyState'));
const NewConversationModal = dynamic(() => import('@/components/dashboard/NewConversationModal'));
const ContextUploadWidget = dynamic(() => import('@/components/dashboard/ContextUploadWidget'));
const NewConversationButton = dynamic(() => import('@/components/dashboard/NewConversationButton').then(mod => ({ default: mod.NewConversationButton })));
const CreateMeetingModal = dynamic(() => import('@/components/meeting/create/CreateMeetingModal').then(mod => ({ default: mod.CreateMeetingModal })));

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
  const [activePath, setActivePath] = useState('conversations');
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationSessionTitle, setNavigationSessionTitle] = useState('');
  const [isNewSession, setIsNewSession] = useState(false);

  // Get sessions and stats from hooks
  const { 
    sessions, 
    loading: sessionsLoading, 
    error: sessionsError,
    fetchSessions,
    updateSession,
    deleteSession,
    createSession 
  } = useSessions();
  
  const { 
    stats: userStats, 
    loading: statsLoading,
    error: statsError 
  } = useUserStats();

  // Get session data management hooks
  const { 
    uploadDocuments, 
    saveContext,
    documentsLoading,
    contextLoading 
  } = useSessionData();

  // Get subscription data
  const {
    subscription,
    loading: subscriptionLoading,
    error: subscriptionError,
    planType
  } = useSubscription();

  // Get auth session for API calls
  const { session: authSession } = useAuth();

  // Create user object from auth data
  const currentUser: User = {
    name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    plan: planType
  };

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

  // Check if user needs onboarding
  useEffect(() => {
    console.log('🔍 Dashboard - checking onboarding:', { sessionsError, user: !!user });
    if (sessionsError && (sessionsError.includes('Setup required') || sessionsError.includes('Please complete onboarding first'))) {
      console.log('🚀 Dashboard - showing onboarding modal');
      setShowOnboardingModal(true);
    }
  }, [sessionsError]);

  // Filter sessions based on search query and active path
  const filteredSessions = sessions.filter(session => {
    // Filter by archive status
    if (activePath === 'archive' && session.status !== 'archived') return false;
    if (activePath === 'conversations' && session.status === 'archived') return false;
    
    // Filter by search query
    if (!searchQuery) return true;
    return session.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           session.conversation_type?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleNewConversation = () => {
    // Regular conversations are deprecated, redirect to meeting
    setShowNewMeetingModal(true);
  };

  const handleNewMeeting = () => {
    setShowNewMeetingModal(true);
  };

  const handleStartConversation = async (config: ConversationConfig) => {
    // Regular conversations are deprecated - redirect to meeting creation
    console.warn('Regular conversations are deprecated. Please use meetings.');
    setShowNewMeetingModal(true);
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
      const isVideoConference = !!(session as any).meeting_url || !!(session as any).meeting_platform;
      
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
    if (selectedSessions.size === filteredSessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(filteredSessions.map(s => s.id)));
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

  const handleOnboardingComplete = () => {
    setShowOnboardingModal(false);
    // Refresh the page to reload data with the new organization
    window.location.reload();
  };

  const activeSessions = filteredSessions.filter(s => s.status === 'active');
  const hasAnySessions = sessions.length > 0;

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
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        user={currentUser} 
        onSearch={handleSearch}
        onNavigateToSettings={() => setActivePath('settings')}
      />
      
      <div className="flex h-[calc(100vh-80px)]">
        <DashboardSidebar 
          usageStats={userStats || defaultStats}
          activePath={activePath}
          onNavigate={(path) => {
            if (path === 'pricing') {
              setIsPricingModalOpen(true);
            } else {
              setActivePath(path);
            }
          }}
          currentUser={currentUser}
          sessions={sessions}
        />
        
        <main className="flex-1 overflow-auto flex flex-col">
          <div className="p-6 flex flex-col flex-1">
            {/* Hero Section */}
            {hasAnySessions && activePath !== 'settings' && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-lg p-6 mb-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold mb-2 text-foreground">Welcome back, {currentUser.name}!</h1>
                    <p className="text-muted-foreground">
                      {activeSessions.length > 0 
                        ? `You have ${activeSessions.length} active meeting${activeSessions.length === 1 ? '' : 's'}`
                        : 'Ready to start a new meeting?'}
                    </p>
                  </div>
                  <NewConversationButton 
                    onNewConversation={handleNewConversation}
                    onNewMeeting={handleNewMeeting}
                  />
                </div>
              </motion.div>
            )}

            {/* Main Content */}
            {activePath === 'settings' ? (
              <SettingsPanel 
                onSessionsDeleted={() => {
                  fetchSessions(); // Refresh sessions after deletion
                  setActivePath('conversations'); // Return to conversations view
                }}
              />
            ) : !hasAnySessions ? (
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
                      {filteredSessions.length} result{filteredSessions.length === 1 ? '' : 's'} for &quot;{searchQuery}&quot;
                    </p>
                  </motion.div>
                )}

                {/* Meetings Inbox List */}
                {filteredSessions.length > 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card rounded-lg shadow-sm border border-border overflow-hidden flex flex-col flex-1"
                  >
                    {/* List Header */}
                    <div className="px-6 py-3 bg-muted/30 border-b border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {/* Select All Checkbox */}
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedSessions.size === filteredSessions.length && filteredSessions.length > 0}
                              onChange={handleSelectAll}
                              className="rounded border-input text-app-primary focus:ring-app-primary"
                            />
                          </label>
                          
                          <h2 className="text-sm font-medium text-foreground">
                            {selectedSessions.size > 0 ? (
                              `${selectedSessions.size} selected`
                            ) : (
                              activePath === 'archive' 
                                ? `Archived Meetings (${filteredSessions.length})`
                                : `Meetings (${filteredSessions.length})`
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
                              Active ({filteredSessions.filter(s => s.status === 'active').length})
                            </span>
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-app-primary"></div>
                              Completed ({filteredSessions.filter(s => s.status === 'completed').length})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Meeting List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {filteredSessions.map((session) => (
                        <ConversationInboxItem
                          key={session.id}
                          session={session}
                          isSelected={selectedSessions.has(session.id)}
                          onClick={() => handleSessionSelect(session.id)}
                          onResume={handleResumeSession}
                          onViewSummary={handleViewSummary}
                          onArchive={handleArchiveSession}
                          onDelete={handleDeleteSession}
                          onCreateFollowUp={handleCreateFollowUp}
                        />
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-card rounded-lg shadow-sm border border-border overflow-hidden"
                  >
                    <div className="text-center py-16">
                      <MagnifyingGlassIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No meetings found</h3>
                      <p className="text-muted-foreground mb-6">Try adjusting your search terms or start a new meeting.</p>
                                              <Button
                        onClick={handleNewConversation}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Start New Meeting
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
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

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        onComplete={handleOnboardingComplete}
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
    </div>
  );
};

const ProtectedDashboard = () => (
  <ProtectedRoute>
    <DashboardPage />
  </ProtectedRoute>
);

export default ProtectedDashboard; 