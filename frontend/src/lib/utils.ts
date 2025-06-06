import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date for conversation displays with context-aware formatting
 */
export const formatConversationDate = (dateString: string, context: 'dashboard' | 'detail' | 'relative' = 'dashboard') => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
  const diffInDays = Math.floor(diffInHours / 24);

  // For dashboard context - compact format
  if (context === 'dashboard') {
    if (diffInHours < 1) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (diffInDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else if (diffInDays < 365) {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: '2-digit'
      });
    }
  }

  // For detail context - full readable format
  if (context === 'detail') {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  // For relative context - human readable relative time
  if (context === 'relative') {
    if (diffInHours < 1) {
      const minutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return minutes <= 1 ? 'Just now' : `${minutes} minutes ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    } else if (diffInDays < 7) {
      return diffInDays === 1 ? 'Yesterday' : `${diffInDays} days ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    } else {
      const years = Math.floor(diffInDays / 365);
      return years === 1 ? '1 year ago' : `${years} years ago`;
    }
  }

  return date.toLocaleDateString('en-US');
};

/**
 * Format a date range for conversations (started -> ended)
 */
export const formatConversationDateRange = (
  startDate: string, 
  endDate?: string, 
  context: 'dashboard' | 'detail' = 'dashboard'
) => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  
  if (context === 'dashboard') {
    if (!end) {
      return `Started ${formatConversationDate(startDate, 'relative')}`;
    }
    
    // If same day, show time range
    if (start.toDateString() === end.toDateString()) {
      return `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else {
      return `${formatConversationDate(startDate, 'dashboard')} - ${formatConversationDate(endDate!, 'dashboard')}`;
    }
  }
  
  if (context === 'detail') {
    if (!end) {
      return `Started on ${formatConversationDate(startDate, 'detail')}`;
    }
    
    return `${formatConversationDate(startDate, 'detail')} - ${formatConversationDate(endDate!, 'detail')}`;
  }
  
  return formatConversationDate(startDate, context);
};

/**
 * Get conversation duration from start and end dates
 */
export const getConversationDuration = (startDate: string, endDate?: string) => {
  if (!endDate) return null;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationMs = end.getTime() - start.getTime();
  const durationSeconds = Math.floor(durationMs / 1000);
  
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Determine the appropriate end date for a conversation
 * Priority: finalized_at > recording_ended_at > null
 */
export const getConversationEndDate = (session: {
  finalized_at?: string;
  recording_ended_at?: string;
  status: string;
}) => {
  // If finalized, use finalized_at
  if (session.finalized_at) {
    return session.finalized_at;
  }
  
  // If recording ended, use recording_ended_at
  if (session.recording_ended_at) {
    return session.recording_ended_at;
  }
  
  // For completed status but no explicit end date, return null
  return null;
};

/**
 * Get a conversation status with date context
 */
export const getConversationStatusWithDate = (session: {
  status: string;
  created_at: string;
  recording_started_at?: string;
  recording_ended_at?: string;
  finalized_at?: string;
}) => {
  const endDate = getConversationEndDate(session);
  
  switch (session.status) {
    case 'active':
      if (session.recording_started_at) {
        return `Recording since ${formatConversationDate(session.recording_started_at, 'relative')}`;
      }
      return `Created ${formatConversationDate(session.created_at, 'relative')}`;
      
    case 'completed':
      if (endDate) {
        return `Completed ${formatConversationDate(endDate, 'relative')}`;
      }
      return `Created ${formatConversationDate(session.created_at, 'relative')}`;
      
    case 'draft':
      return `Draft created ${formatConversationDate(session.created_at, 'relative')}`;
      
    case 'archived':
      return `Archived conversation from ${formatConversationDate(session.created_at, 'dashboard')}`;
      
    default:
      return `Created ${formatConversationDate(session.created_at, 'relative')}`;
  }
}; 