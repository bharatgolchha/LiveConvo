import React, { useState, useEffect, useRef } from 'react';
import { 
  XMarkIcon, 
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  ClockIcon,
  FunnelIcon,
  CheckIcon,
  ChevronDownIcon,
  VideoCameraIcon,
  PhoneIcon,
  UserGroupIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  HeartIcon,
  SparklesIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface SessionOption {
  id: string;
  title: string;
  conversation_type?: string;
  created_at: string;
  recording_duration_seconds?: number;
  status?: string;
  total_words_spoken?: number;
  user_id?: string;
  organization_id?: string;
}

interface Props {
  selected: SessionOption[];
  setSelected: (sessions: SessionOption[]) => void;
}

// Helper function to format conversation type
const formatConversationType = (type?: string) => {
  if (!type) return 'Meeting';
  return type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

// Helper function to get conversation type icon
const getConversationIcon = (type?: string) => {
  switch (type) {
    case 'sales': return <BriefcaseIcon className="w-4 h-4" />;
    case 'support': return <HeartIcon className="w-4 h-4" />;
    case 'interview': return <AcademicCapIcon className="w-4 h-4" />;
    case 'team_meeting': return <UserGroupIcon className="w-4 h-4" />;
    case 'coaching': return <SparklesIcon className="w-4 h-4" />;
    default: return <VideoCameraIcon className="w-4 h-4" />;
  }
};

// Helper function to format duration
const formatDuration = (seconds?: number) => {
  if (!seconds) return 'No recording';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

// Helper function to format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

const conversationTypeOptions = [
  { value: '', label: 'All Types' },
  { value: 'sales', label: 'Sales' },
  { value: 'support', label: 'Support' },
  { value: 'interview', label: 'Interview' },
  { value: 'team_meeting', label: 'Team Meeting' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'custom', label: 'Custom' }
];

/**
 * Enhanced multi-select component to pick previous meetings (sessions) as context.
 * Features:
 * - Better visual design with meeting cards
 * - Search with live results 
 * - Filter by conversation type
 * - Show recent meetings by default
 * - Display meeting metadata (type, date, duration)
 * - Smooth animations and interactions
 * - Shows both own and shared meetings
 */
export function PreviousConversationsMultiSelect({ selected, setSelected }: Props) {
  const { session: authSession, user } = useAuth();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [options, setOptions] = useState<SessionOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load recent meetings on component mount
  useEffect(() => {
    if (!hasInitialLoad) {
      fetchRecentMeetings();
      setHasInitialLoad(true);
    }
  }, [hasInitialLoad]);

  // Search when query or filter changes
  useEffect(() => {
    if (query.length >= 2 || typeFilter) {
      searchMeetings();
    } else if (query.length === 0 && !typeFilter) {
      fetchRecentMeetings();
    }
  }, [query, typeFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRecentMeetings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        limit: '10',
        status: 'completed', // Only show completed meetings
        includeShared: 'true' // Include meetings shared with the user
      });
      
      const res = await fetch(`/api/sessions?${params.toString()}`, {
        headers: authSession?.access_token
          ? { Authorization: `Bearer ${authSession.access_token}` }
          : undefined
      });
      
      if (res.ok) {
        const data = await res.json();
        setOptions((data.sessions || []).map(mapSessionToOption));
      }
    } catch (err) {
      console.error('Recent meetings fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  const searchMeetings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        limit: '15',
        status: 'completed', // Only show completed meetings
        includeShared: 'true' // Include meetings shared with the user
      });
      
      if (query.length >= 2) {
        params.set('search', query);
      }
      if (typeFilter) {
        params.set('conversation_type', typeFilter);
      }
      
      const res = await fetch(`/api/sessions?${params.toString()}`, {
        headers: authSession?.access_token
          ? { Authorization: `Bearer ${authSession.access_token}` }
          : undefined
      });
      
      if (res.ok) {
        const data = await res.json();
        setOptions((data.sessions || []).map(mapSessionToOption));
      }
    } catch (err) {
      console.error('Meeting search error', err);
    } finally {
      setLoading(false);
    }
  };

  const mapSessionToOption = (session: any): SessionOption => ({
    id: session.id,
    title: session.title || 'Untitled Meeting',
    conversation_type: session.conversation_type,
    created_at: session.created_at,
    recording_duration_seconds: session.recording_duration_seconds,
    status: session.status,
    total_words_spoken: session.total_words_spoken,
    user_id: session.user_id,
    organization_id: session.organization_id
  });

  const addSession = (session: SessionOption) => {
    if (selected.some(s => s.id === session.id)) return;
    setSelected([...selected, session]);
    setIsDropdownOpen(false);
  };

  const removeSession = (id: string) => {
    setSelected(selected.filter(s => s.id !== id));
  };

  const isSelected = (sessionId: string) => {
    return selected.some(s => s.id === sessionId);
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">
        Previous Meetings <span className="text-muted-foreground font-normal">(optional)</span>
      </label>
      
      <p className="text-xs text-muted-foreground">
        Add context from your own or shared meetings to help the AI understand background and history
      </p>

      {/* Selected meetings display */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Selected ({selected.length})
            </div>
            <div className="space-y-2 max-h-24 sm:max-h-32 overflow-y-auto">
              {selected.map(session => (
                <motion.div
                  key={`selected-conversation-${session.id}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="flex-shrink-0 text-primary">
                      {getConversationIcon(session.conversation_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground truncate">
                        {session.title}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        {session.user_id !== user?.id && <ShareIcon className="w-3 h-3" />}
                        {formatConversationType(session.conversation_type)} • {formatDate(session.created_at)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeSession(session.id)}
                    className="flex-shrink-0 ml-2 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and filter controls */}
      <div className="relative" ref={dropdownRef}>
        <div className="flex gap-2">
          {/* Search input */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Search by meeting title..."
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
            />
          </div>

          {/* Type filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none bg-background border border-border rounded-lg px-3 py-2.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            >
              {conversationTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Meeting options dropdown */}
        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-lg shadow-lg max-h-60 sm:max-h-72 md:max-h-80 overflow-hidden"
            >
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="ml-2 text-sm text-muted-foreground">Loading meetings...</span>
                </div>
              ) : options.length === 0 ? (
                <div className="p-4 text-center">
                  <div className="text-muted-foreground mb-2">
                    <CalendarDaysIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {query || typeFilter ? 'No meetings found' : 'No completed meetings yet'}
                  </div>
                  {query || typeFilter ? (
                    <div className="text-xs text-muted-foreground mt-1">
                      Try adjusting your search or filter
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground mt-1">
                      Complete some meetings first to use them as context
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-h-60 sm:max-h-72 md:max-h-80 overflow-y-auto">
                  {options.map((session) => (
                    <div
                      key={`dropdown-conversation-${session.id}`}
                      onClick={() => addSession(session)}
                      className={`
                        flex items-center gap-2 sm:gap-3 p-2 sm:p-3 hover:bg-muted/50 cursor-pointer transition-colors border-b border-border/50 last:border-b-0
                        ${isSelected(session.id) ? 'bg-primary/5 border-primary/20' : ''}
                      `}
                    >
                      <div className="flex-shrink-0">
                        {isSelected(session.id) ? (
                          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <CheckIcon className="w-3 h-3 text-primary-foreground" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 border-2 border-border rounded-full" />
                        )}
                      </div>
                      
                      <div className="flex-shrink-0 text-muted-foreground">
                        {getConversationIcon(session.conversation_type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {session.title}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {session.user_id !== user?.id && (
                            <span className="flex items-center gap-1 text-primary">
                              <ShareIcon className="w-3 h-3" />
                              <span>Shared</span>
                            </span>
                          )}
                          <span>{formatConversationType(session.conversation_type)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <CalendarDaysIcon className="w-3 h-3" />
                            {formatDate(session.created_at)}
                          </span>
                          {session.recording_duration_seconds && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <ClockIcon className="w-3 h-3" />
                                {formatDuration(session.recording_duration_seconds)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Helper text */}
      {options.length > 0 && !loading && (
        <div className="text-xs text-muted-foreground">
          {query || typeFilter ? `Found ${options.length} meeting${options.length !== 1 ? 's' : ''}` : `Showing ${options.length} recent meeting${options.length !== 1 ? 's' : ''}`}
        </div>
      )}
    </div>
  );
} 