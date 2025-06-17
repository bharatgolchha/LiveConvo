import React from 'react';
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
  const getStatusConfig = (status: Session['status']) => {
    switch (status) {
      case 'active':
        return {
          color: 'bg-emerald-500',
          textColor: 'text-emerald-700',
          bgColor: 'bg-emerald-50',
          label: 'Live',
          pulse: true,
        };
      case 'completed':
        return {
          color: 'bg-blue-500',
          textColor: 'text-blue-700',
          bgColor: 'bg-blue-50',
          label: 'Done',
          pulse: false,
        };
      case 'archived':
        return {
          color: 'bg-gray-400',
          textColor: 'text-gray-600',
          bgColor: 'bg-gray-50',
          label: 'Archived',
          pulse: false,
        };
      case 'draft':
        return {
          color: 'bg-amber-500',
          textColor: 'text-amber-700',
          bgColor: 'bg-amber-50',
          label: 'Draft',
          pulse: false,
        };
      default:
        return {
          color: 'bg-gray-400',
          textColor: 'text-gray-600',
          bgColor: 'bg-gray-50',
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
    if (!type) return '💬';

    const normalized = type.toLowerCase();

    switch (normalized) {
      case 'sales':
      case 'sales_call':
        return '💼';
      case 'support':
        return '🤝';
      case 'meeting':
        return '📋';
      case 'interview':
        return '👥';
      case 'consultation':
        return '💡';
      default:
        return '💬';
    }
  };

  const statusConfig = getStatusConfig(session.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
      transition={{ duration: 0.15 }}
      className={`group relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 cursor-pointer transition-all duration-150 ${
        isSelected ? 'ring-2 ring-blue-500 border-blue-300' : 'hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      onClick={onClick}
    >
      {/* Header Row - More Compact */}
      <div className="flex items-center justify-between mb-2">
        {/* Left: Icon, Title, Status Badge */}
        <div className="flex items-center space-x-1.5 flex-1 min-w-0">
          <span className="text-sm">{getConversationTypeIcon(session.conversation_type)}</span>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {session.title}
          </h3>

          {/* Status Badge - Compact */}
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor} border border-current border-opacity-20 flex-shrink-0`}>
            {statusConfig.label}
          </span>
        </div>

        {/* Right: Time + Status Indicator */}
        <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
          </span>

          {/* Status Indicator - Smaller, now at far right */}
          <div className="relative flex-shrink-0">
            <div className={`w-2 h-2 rounded-full ${statusConfig.color} ${statusConfig.pulse ? 'animate-pulse' : ''}`} />
            {statusConfig.pulse && (
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-40" />
            )}
          </div>
        </div>
      </div>

      {/* Metadata Row - More Compact */}
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
        <div className="flex items-center space-x-3">
          {/* Duration */}
          {session.recording_duration_seconds && (
            <div className="flex items-center space-x-1">
              <MicrophoneIcon className="w-3 h-3 text-gray-400" />
              <span>{formatDuration(session.recording_duration_seconds)}</span>
            </div>
          )}

          {/* Word Count */}
          {session.total_words_spoken && (
            <div className="flex items-center space-x-1">
              <ChatBubbleLeftRightIcon className="w-3 h-3 text-gray-400" />
              <span>{session.total_words_spoken}w</span>
            </div>
          )}

          {/* Linked Conversations - Compact */}
          {session.linkedConversationsCount && session.linkedConversationsCount > 0 && (
            <div className="relative group/tooltip">
              <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="text-xs font-medium">{session.linkedConversationsCount}</span>
              </div>

              {/* Tooltip - Smaller */}
              {session.linkedConversations && session.linkedConversations.length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 z-10 pointer-events-none">
                  <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-md shadow-lg p-2 min-w-[180px] max-w-[250px]">
                    <div className="font-medium mb-1">Previous conversations:</div>
                    <div className="space-y-0.5">
                      {session.linkedConversations.slice(0, 3).map((conv, index) => (
                        <div key={conv.id} className="truncate text-xs">
                          {index + 1}. {conv.title}
                        </div>
                      ))}
                      {session.linkedConversations.length > 3 && (
                        <div className="text-gray-400 text-xs">
                          +{session.linkedConversations.length - 3} more...
                        </div>
                      )}
                    </div>
                    <div className="absolute top-full left-3 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900 dark:border-t-gray-700" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons - Compact, hidden by default */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {/* Primary Action Button - Smaller */}
          {session.status === 'active' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResume(session.id);
              }}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded transition-colors duration-150"
            >
              <PlayCircleIcon className="w-3 h-3 mr-1" />
              Resume
            </button>
          )}

          {session.status === 'completed' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewSummary(session.id);
              }}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded transition-colors duration-150"
            >
              <EyeIcon className="w-3 h-3 mr-1" />
              View
            </button>
          )}

          {session.status === 'completed' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResume(session.id);
              }}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors duration-150"
            >
              <ArrowTopRightOnSquareIcon className="w-3 h-3 mr-1" />
              Open
            </button>
          )}

          {session.status === 'draft' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResume(session.id);
              }}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded transition-colors duration-150"
            >
              <PlayCircleIcon className="w-3 h-3 mr-1" />
              Continue
            </button>
          )}

          {session.status === 'completed' && onCreateFollowUp && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateFollowUp(session);
              }}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded transition-colors duration-150"
            >
              <ArrowPathIcon className="w-3 h-3 mr-1" />
              Follow-Up
            </button>
          )}

          {/* Secondary Actions - Smaller */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onArchive(session.id);
            }}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors duration-150"
            title={session.status === 'archived' ? 'Unarchive' : 'Archive'}
          >
            <ArchiveBoxIcon className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(session.id);
            }}
            className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors duration-150"
            title="Delete"
          >
            <TrashIcon className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Selection Checkbox - Smaller */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ConversationInboxItem; 