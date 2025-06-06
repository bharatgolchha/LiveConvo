'use client';

import React from 'react';
import { Clock, Calendar, CheckCircle } from 'lucide-react';
import { 
  formatConversationDate, 
  formatConversationDateRange, 
  getConversationEndDate,
  getConversationStatusWithDate
} from '@/lib/utils';

interface ConversationDateIndicatorProps {
  session: {
    id: string;
    status: string;
    created_at: string;
    recording_started_at?: string;
    recording_ended_at?: string;
    finalized_at?: string;
  };
  context?: 'dashboard' | 'detail' | 'compact';
  showIcon?: boolean;
  showStatus?: boolean;
  className?: string;
}

/**
 * A reusable component for displaying conversation date information
 * with appropriate formatting based on context and session status
 */
export const ConversationDateIndicator: React.FC<ConversationDateIndicatorProps> = ({
  session,
  context = 'dashboard',
  showIcon = true,
  showStatus = false,
  className = ''
}) => {
  const endDate = getConversationEndDate(session);
  
  const getDisplayInfo = () => {
    switch (context) {
      case 'detail':
        return {
          main: session.recording_started_at 
            ? formatConversationDateRange(session.recording_started_at, endDate || undefined, 'detail')
            : formatConversationDate(session.created_at, 'detail'),
          secondary: showStatus ? getConversationStatusWithDate(session) : null,
          icon: endDate ? CheckCircle : Calendar
        };
        
      case 'compact':
        return {
          main: session.recording_started_at 
            ? formatConversationDate(session.recording_started_at, 'dashboard')
            : formatConversationDate(session.created_at, 'dashboard'),
          secondary: null,
          icon: Clock
        };
        
      default: // dashboard
        return {
          main: session.recording_started_at && endDate
            ? formatConversationDateRange(session.recording_started_at, endDate, 'dashboard')
            : session.recording_started_at
            ? `Started ${formatConversationDate(session.recording_started_at, 'relative')}`
            : formatConversationDate(session.created_at, 'dashboard'),
          secondary: showStatus ? getConversationStatusWithDate(session) : null,
          icon: session.recording_started_at ? Clock : Calendar
        };
    }
  };

  const { main, secondary, icon: IconComponent } = getDisplayInfo();

  const getStatusColor = () => {
    switch (session.status) {
      case 'active':
        return 'text-green-600';
      case 'completed':
        return 'text-blue-600';
      case 'draft':
        return 'text-yellow-600';
      case 'archived':
        return 'text-gray-500';
      default:
        return 'text-muted-foreground';
    }
  };

  if (context === 'detail') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {showIcon && <IconComponent className="w-4 h-4" />}
          <span>{main}</span>
        </div>
        {secondary && showStatus && (
          <div className={`text-xs ${getStatusColor()}`}>
            {secondary}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {showIcon && <IconComponent className="w-3 h-3" />}
      <span className="text-xs text-muted-foreground">
        {main}
      </span>
      {secondary && showStatus && (
        <span className={`text-xs ml-2 ${getStatusColor()}`}>
          • {secondary}
        </span>
      )}
    </div>
  );
};

/**
 * A simplified version for use in conversation headers
 */
export const ConversationHeaderDate: React.FC<{
  session: ConversationDateIndicatorProps['session'];
  className?: string;
}> = ({ session, className = '' }) => {
  return (
    <ConversationDateIndicator
      session={session}
      context="detail"
      showIcon={true}
      showStatus={true}
      className={className}
    />
  );
};

/**
 * A compact version for use in lists and cards
 */
export const ConversationListDate: React.FC<{
  session: ConversationDateIndicatorProps['session'];
  className?: string;
}> = ({ session, className = '' }) => {
  return (
    <ConversationDateIndicator
      session={session}
      context="dashboard"
      showIcon={true}
      showStatus={false}
      className={className}
    />
  );
}; 