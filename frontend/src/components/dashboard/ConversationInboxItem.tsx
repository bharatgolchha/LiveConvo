import React, { useMemo } from 'react';
import {
  PlayCircleIcon,
  EyeIcon,
  ArchiveBoxIcon,
  TrashIcon,
  MicrophoneIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  ArrowTopRightOnSquareIcon,
  ArrowPathIcon,
  VideoCameraIcon,
  UserGroupIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import type { Session } from '@/lib/hooks/useSessions';

interface Props {
  session: Session;
  onResume: (id: string) => void;
  onViewSummary: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateFollowUp?: (session: Session) => void;
  isSelected?: boolean;
  onClick?: () => void;
}

const ConversationInboxItem: React.FC<Props> = ({
  session,
  onResume,
  onViewSummary,
  onArchive,
  onDelete,
  onCreateFollowUp,
  isSelected = false,
  onClick,
}) => {
  // Helper function to get unique participants from transcript speakers data only
  const getParticipants = useMemo(() => {
    // Use transcript_speakers as the single source of truth for participants
    if (session.transcript_speakers && Array.isArray(session.transcript_speakers)) {
      const uniqueSpeakers = session.transcript_speakers
        .filter((speaker: string) => speaker && speaker.trim() && !['me', 'them', 'user', 'other'].includes(speaker.toLowerCase()))
        .map((speaker: string) => speaker.trim());
      
      return [...new Set(uniqueSpeakers)];
    }
    
    // Return empty array if no transcript speakers available
    return [];
  }, [session.transcript_speakers]);

  // Helper function to get participant initials for avatar
  const getInitials = (name: string): string => {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return words.map(word => word.charAt(0)).join('').substring(0, 2).toUpperCase();
  };

  // Helper function to get avatar color based on name
  const getAvatarColor = (name: string): string => {
    const colors = [
      'bg-primary',
      'bg-secondary', 
      'bg-accent',
      'bg-primary/80',
      'bg-secondary/80',
      'bg-accent/80',
      'bg-primary/60',
      'bg-secondary/60'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = ((hash << 5) - hash) + name.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const getStatusConfig = (status: Session['status']) => {
    switch (status) {
      case 'active':
        return {
          color: 'bg-primary',
          textColor: 'text-primary',
          bgColor: 'bg-primary/10',
          label: 'Live',
          pulse: true,
        };
      case 'completed':
        return {
          color: 'bg-secondary',
          textColor: 'text-secondary',
          bgColor: 'bg-secondary/10',
          label: 'Done',
          pulse: false,
        };
      case 'archived':
        return {
          color: 'bg-muted-foreground',
          textColor: 'text-muted-foreground',
          bgColor: 'bg-muted/50',
          label: 'Archived',
          pulse: false,
        };
      case 'draft':
        return {
          color: 'bg-accent',
          textColor: 'text-accent-foreground',
          bgColor: 'bg-accent/10',
          label: 'Draft',
          pulse: false,
        };
      default:
        return {
          color: 'bg-muted-foreground',
          textColor: 'text-muted-foreground',
          bgColor: 'bg-muted/50',
          label: 'Unknown',
          pulse: false,
        };
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0m';
    const mins = Math.floor(seconds / 60);
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMins}m`;
    }
    return `${mins}m`;
  };

  // Safely return an icon based on the conversation type string.
  // Gracefully handles null/undefined values to avoid runtime errors.
  const getConversationTypeIcon = (type?: string | null) => {
    if (!type) return <ChatBubbleLeftRightIcon className="w-4 h-4" />;

    const normalized = type.toLowerCase();

    switch (normalized) {
      case 'sales':
      case 'sales_call':
        return <span className="text-base">💼</span>;
      case 'support':
        return <span className="text-base">🤝</span>;
      case 'team_meeting':
      case 'meeting':
        return <span className="text-base">📋</span>;
      case 'interview':
        return <span className="text-base">👥</span>;
      case 'consultation':
        return <span className="text-base">💡</span>;
      case 'one_on_one':
        return <span className="text-base">👤</span>;
      case 'training':
        return <span className="text-base">🎓</span>;
      case 'brainstorming':
        return <span className="text-base">🧠</span>;
      case 'demo':
        return <span className="text-base">🎯</span>;
      case 'standup':
        return <span className="text-base">⚡</span>;
      case 'custom':
        return <span className="text-base">⚙️</span>;
      default:
        return <ChatBubbleLeftRightIcon className="w-4 h-4" />;
    }
  };

  // Format conversation type for display
  const formatConversationType = (type?: string | null) => {
    if (!type) return '';

    const typeMap: Record<string, string> = {
      'sales': 'Sales Call',
      'sales_call': 'Sales Call',
      'support': 'Support',
      'team_meeting': 'Team Meeting',
      'meeting': 'Meeting',
      'interview': 'Interview',
      'consultation': 'Consultation',
      'one_on_one': 'One-on-One',
      'training': 'Training',
      'brainstorming': 'Brainstorming',
      'demo': 'Demo',
      'standup': 'Standup',
      'custom': 'Custom'
    };

    return typeMap[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
  };

  const statusConfig = getStatusConfig(session.status);
  const participants = getParticipants;
  const maxDisplayParticipants = 4;
  const displayParticipants = participants.slice(0, maxDisplayParticipants);
  const remainingCount = Math.max(0, participants.length - maxDisplayParticipants);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ 
        y: -1, 
        boxShadow: isSelected 
          ? '0 8px 25px hsla(var(--primary) / 0.15)' 
          : '0 4px 12px hsla(var(--foreground) / 0.08)',
        zIndex: 50
      }}
      transition={{ duration: 0.15 }}
      className={`group relative rounded-lg p-2.5 cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'bg-primary/10 border-2 border-primary shadow-lg shadow-primary/20' 
          : session.linkedConversationsCount && session.linkedConversationsCount > 0
            ? 'bg-card border border-primary/20 hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm hover:shadow-primary/10'
            : 'bg-card border border-border hover:border-border/80 hover:bg-card/80'
      }`}
      style={{ position: 'relative' }}
      onClick={onClick}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        {/* Left: Title with status dot and type */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {/* Status dot integrated with title */}
            <div className="relative flex-shrink-0">
              <div className={`w-2 h-2 rounded-full ${statusConfig.color} ${statusConfig.pulse ? 'animate-pulse' : ''}`} />
              {statusConfig.pulse && (
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-40" />
              )}
            </div>
            
            {/* Meeting Type Icon */}
            <div className="flex items-center justify-center w-5 h-5 flex-shrink-0" title={formatConversationType(session.conversation_type)}>
              {getConversationTypeIcon(session.conversation_type)}
            </div>
            
            {/* Meeting platform icon if it has meeting_url */}
            {session.meeting_url && (
              <VideoCameraIcon className="w-4 h-4 text-primary flex-shrink-0" />
            )}
            
            <h3 className="text-sm font-medium text-foreground truncate flex-1">
              {/* Defensive fix: Clean title to remove any trailing numbers that might be linkedConversationsCount */}
              {(() => {
                const title = session.title?.toString() || '';
                const count = session.linkedConversationsCount || 0;
                // Remove trailing count if it matches linkedConversationsCount
                if (count > 0 && title.endsWith(count.toString())) {
                  return title.slice(0, -count.toString().length);
                }
                // Also handle case where 0 is appended for sessions with no links
                if (count === 0 && title.endsWith('0')) {
                  return title.slice(0, -1);
                }
                return title;
              })()}
            </h3>
          </div>
          
          {/* Meeting Type Label - Show below title for better visibility */}
          {session.conversation_type && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                {formatConversationType(session.conversation_type)}
              </span>
            </div>
          )}
        </div>

        {/* Right: Time */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Participants Row - Enhanced with avatars */}
      {participants.length > 0 && (
        <div className="flex items-center gap-2 mb-1.5">
          <UserGroupIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {/* Participant Avatars */}
            <div className="flex items-center -space-x-1">
              {displayParticipants.map((participant: string, index: number) => (
                <div
                  key={`${participant}-${index}`}
                  className={`w-6 h-6 rounded-full ${getAvatarColor(participant)} flex items-center justify-center border-2 border-background relative`}
                  title={participant}
                >
                  <span className="text-xs font-medium text-white">
                    {getInitials(participant)}
                  </span>
                </div>
              ))}
              
              {/* +X More indicator */}
              {remainingCount > 0 && (
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center border-2 border-background text-xs font-medium text-muted-foreground">
                  +{remainingCount}
                </div>
              )}
            </div>
            
            {/* Participant Names (truncated for small screens) */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0 ml-2">
              <span className="truncate">
                {displayParticipants.join(', ')}
                {remainingCount > 0 && `, +${remainingCount} more`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Metadata and Actions Row */}
      <div className="flex items-center justify-between">
        {/* Left: Metadata */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {/* Status Badge */}
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
            {statusConfig.label}
          </span>

          {/* Duration */}
          {session.recording_duration_seconds ? (
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              {formatDuration(session.recording_duration_seconds)}
            </span>
          ) : null}

          {/* Word Count - Only show for longer conversations */}
          {session.total_words_spoken && session.total_words_spoken > 100 && (
            <span className="hidden sm:flex items-center gap-1">
              <ChatBubbleLeftRightIcon className="w-3 h-3" />
              {session.total_words_spoken}w
            </span>
          )}

          {/* Linked Conversations - Enhanced Display */}
          {session.linkedConversationsCount && session.linkedConversationsCount > 0 && (
            <div className="relative group/tooltip" style={{ zIndex: 1 }}>
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium transition-all duration-200 hover:bg-primary/20">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                {session.linkedConversationsCount} {session.linkedConversationsCount === 1 ? 'linked' : 'linked'}
              </span>

              {/* Enhanced Tooltip - Positioned below to avoid overlaps */}
              {session.linkedConversations && session.linkedConversations.length > 0 && (
                <div className="absolute top-full left-0 mt-2 opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 z-[9999] pointer-events-none">
                  <motion.div 
                    initial={{ scale: 0.95, y: -5 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-popover/95 backdrop-blur-sm text-popover-foreground rounded-lg shadow-xl border border-border p-3 min-w-[220px] max-w-[320px]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1 bg-primary/10 rounded">
                        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-sm">Previous Context</div>
                        <div className="text-xs text-muted-foreground">Building on past discussions</div>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      {session.linkedConversations.slice(0, 3).map((conv, index) => (
                        <div key={conv.id} className="flex items-start gap-2 p-1.5 rounded hover:bg-muted/50 transition-colors">
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-semibold text-primary">{index + 1}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-foreground truncate">
                              {conv.title}
                            </div>
                          </div>
                        </div>
                      ))}
                      {session.linkedConversations.length > 3 && (
                        <div className="text-center pt-1 border-t border-border">
                          <span className="text-xs text-muted-foreground font-medium">
                            +{session.linkedConversations.length - 3} more conversation{session.linkedConversations.length - 3 > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="absolute -top-1 left-6 w-2 h-2 bg-popover/95 border-l border-t border-border transform rotate-45" />
                  </motion.div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {/* Primary Action */}
          {session.status === 'active' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResume(session.id);
              }}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded transition-colors duration-150"
            >
              <PlayCircleIcon className="w-3 h-3 mr-0.5" />
              Resume
            </button>
          )}

          {session.status === 'completed' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewSummary(session.id);
                }}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-secondary bg-secondary/10 hover:bg-secondary/20 rounded transition-colors duration-150"
              >
                <DocumentTextIcon className="w-3 h-3 mr-0.5" />
                Report
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onResume(session.id);
                }}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded transition-colors duration-150"
              >
                <ArrowTopRightOnSquareIcon className="w-3 h-3 mr-0.5" />
                Open
              </button>
              {onCreateFollowUp && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateFollowUp(session);
                  }}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-accent-foreground bg-accent/20 hover:bg-accent/30 rounded transition-colors duration-150"
                >
                  <ArrowPathIcon className="w-3 h-3 mr-0.5" />
                  Follow-Up
                </button>
              )}
            </>
          )}

          {session.status === 'draft' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResume(session.id);
              }}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-accent-foreground bg-accent/20 hover:bg-accent/30 rounded transition-colors duration-150"
            >
              <PlayCircleIcon className="w-3 h-3 mr-0.5" />
              Continue
            </button>
          )}

          {/* More actions menu */}
          <div className="relative group/menu">
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors duration-150"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>

            {/* Dropdown menu - positioned above to avoid being hidden */}
            <div className="absolute right-0 bottom-full mb-1 w-36 bg-card rounded-md shadow-lg border border-border opacity-0 group-hover/menu:opacity-100 pointer-events-none group-hover/menu:pointer-events-auto transition-opacity duration-150 z-50">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(session.id);
                }}
                className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-muted/50 flex items-center gap-2"
              >
                <ArchiveBoxIcon className="w-3 h-3" />
                {session.status === 'archived' ? 'Unarchive' : 'Archive'}
              </button>
              
              <div className="border-t border-border my-1"></div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(session.id);
                }}
                className="w-full text-left px-3 py-2 text-xs text-destructive hover:bg-destructive/10 flex items-center gap-2"
              >
                <TrashIcon className="w-3 h-3" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="w-5 h-5 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg shadow-primary/25 ring-2 ring-background"
          >
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </motion.div>
        </div>
      )}

      {/* Left border accent for selected cards */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-lg"></div>
      )}
    </motion.div>
  );
};

export default ConversationInboxItem; 