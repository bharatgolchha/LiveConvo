import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  CheckSquare,
  Activity,
  Users,
  X,
  Bell,
  Eye,
  UserCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CommentSidebar } from './CommentSidebar';
import { ActionItemsList } from './ActionItemsList';
import { useAuth } from '@/contexts/AuthContext';
import { GuestNameDialog } from './GuestNameDialog';
import { useSharedComments } from '@/hooks/useSharedComments';

interface CollaborationPanelProps {
  sessionId: string;
  currentSection?: string;
  isSharedView?: boolean;
}

export function CollaborationPanel({ 
  sessionId, 
  currentSection,
  isSharedView = false 
}: CollaborationPanelProps) {
  const { user, session } = useAuth();
  const [activePanel, setActivePanel] = useState<'comments' | 'tasks' | 'activity' | null>(null);
  const [unreadComments, setUnreadComments] = useState(0);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [notifications, setNotifications] = useState(0);
  const { guestIdentity, showGuestDialog, setShowGuestDialog, setGuestName } = useSharedComments(sessionId);

  useEffect(() => {
    // Log view activity
    if (user && !isSharedView) {
      logActivity('viewed');
    }

    // Start polling for updates
    const interval = setInterval(() => {
      fetchCollaborationStats();
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [sessionId]);

  const logActivity = async (type: string, details?: any) => {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/reports/${sessionId}/activity`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ activityType: type, details })
      });
      
      if (!response.ok && response.status === 401) {
        console.warn('User not authenticated, skipping activity log');
        return;
      }
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  };

  const fetchCollaborationStats = async () => {
    // TODO: Implement fetching collaboration stats
    // This would get unread counts, active users, etc.
  };

  // For shared view, we now allow guest collaboration
  const showIdentity = isSharedView && !user && guestIdentity;
  const showTasks = !isSharedView || user; // Only show tasks for authenticated users

  return (
    <>
      {/* Collaboration Toolbar */}
      <div className="fixed bottom-6 right-6 z-40">
        <div className="flex items-center gap-3 bg-background/95 backdrop-blur-sm border border-border rounded-full p-2 shadow-lg">
          {/* Comments Button */}
          <Button
            variant={activePanel === 'comments' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActivePanel(activePanel === 'comments' ? null : 'comments')}
            className="relative rounded-full"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="ml-2 hidden sm:inline">Comments</span>
            {unreadComments > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                {unreadComments}
              </span>
            )}
          </Button>

          {/* Tasks Button - Only for authenticated users */}
          {showTasks && (
            <Button
              variant={activePanel === 'tasks' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActivePanel(activePanel === 'tasks' ? null : 'tasks')}
              className="relative rounded-full"
            >
              <CheckSquare className="w-4 h-4" />
              <span className="ml-2 hidden sm:inline">Tasks</span>
              {pendingTasks > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center">
                  {pendingTasks}
                </span>
              )}
            </Button>
          )}

          {/* Activity Button */}
          <Button
            variant={activePanel === 'activity' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActivePanel(activePanel === 'activity' ? null : 'activity')}
            className="rounded-full"
          >
            <Activity className="w-4 h-4" />
            <span className="ml-2 hidden sm:inline">Activity</span>
          </Button>

          {/* Guest Identity Display */}
          {showIdentity && (
            <div className="flex items-center gap-2 px-3 border-l border-border">
              <UserCircle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {guestIdentity.name}
              </span>
            </div>
          )}

          {/* Active Users */}
          {activeUsers.length > 0 && (
            <div className="flex items-center gap-1 px-3 border-l border-border">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <div className="flex -space-x-2">
                {activeUsers.slice(0, 3).map((userId, index) => (
                  <div
                    key={userId}
                    className="w-6 h-6 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center"
                    title={`User ${index + 1} is viewing`}
                  >
                    <span className="text-xs font-medium">
                      {userId.substring(0, 1).toUpperCase()}
                    </span>
                  </div>
                ))}
                {activeUsers.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                    <span className="text-xs">+{activeUsers.length - 3}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notifications */}
          {notifications > 0 && (
            <div className="relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                {notifications}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Comment Sidebar */}
      <CommentSidebar
        sessionId={sessionId}
        isOpen={activePanel === 'comments'}
        onClose={() => setActivePanel(null)}
        currentSection={currentSection}
        isSharedView={isSharedView}
      />

      {/* Guest Name Dialog */}
      <GuestNameDialog
        isOpen={showGuestDialog}
        onClose={() => setShowGuestDialog(false)}
        onSubmit={setGuestName}
      />

      {/* Tasks Panel */}
      {activePanel === 'tasks' && (
        <div className="fixed right-0 top-0 h-full w-96 bg-background border-l border-border shadow-xl z-50 flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Action Items</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActivePanel(null)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <ActionItemsList 
              sessionId={sessionId}
              onCommentConvert={(commentId) => {
                // Switch to comments panel and highlight the comment
                setActivePanel('comments');
              }}
            />
          </div>
        </div>
      )}

      {/* Activity Panel */}
      {activePanel === 'activity' && (
        <div className="fixed right-0 top-0 h-full w-96 bg-background border-l border-border shadow-xl z-50 flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Activity Feed
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActivePanel(null)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <ActivityFeed sessionId={sessionId} authToken={session?.access_token} />
          </div>
        </div>
      )}
    </>
  );
}

interface ActivityFeedProps {
  sessionId: string;
  authToken?: string;
}

function ActivityFeed({ sessionId, authToken }: ActivityFeedProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActivities();
  }, [sessionId]);

  const fetchActivities = async () => {
    try {
      setError(null);
      const headers: HeadersInit = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`/api/reports/${sessionId}/activity`, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.warn('User not authenticated for activity feed');
          setActivities([]);
          return;
        }
        throw new Error('Failed to fetch activities');
      }
      
      const data = await response.json();
      setActivities(data.activities || []);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      setError('Failed to load activity feed');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'commented': return MessageSquare;
      case 'task_created': return CheckSquare;
      case 'task_completed': return CheckSquare;
      case 'viewed': return Eye;
      default: return Activity;
    }
  };

  const getActivityText = (activity: any) => {
    const userName = activity.user?.full_name || activity.user?.email || 'Someone';
    
    switch (activity.activity_type) {
      case 'commented':
        return `${userName} added a comment`;
      case 'task_created':
        return `${userName} created a task`;
      case 'task_completed':
        return `${userName} completed a task`;
      case 'viewed':
        return `${userName} viewed the report`;
      default:
        return `${userName} performed an action`;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading activity...</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map(activity => {
        const Icon = getActivityIcon(activity.activity_type);
        return (
          <div key={activity.id} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">{getActivityText(activity)}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(activity.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}