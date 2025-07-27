import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Participant {
  name: string;
  initials: string;
  color: string;
}

interface ParticipantsListProps {
  sessionId: string;
  showLabel?: boolean; // If false, hides the "Participants:" text label
  maxVisible?: number; // Max participants visible before collapsing (undefined = show all)
  fallbackParticipants?: {
    me: string;
    them: string;
  };
  participants?: Participant[]; // Pre-loaded participants data to avoid API calls
  size?: 'sm' | 'md'; // Size variant for mobile optimization
}

export function ParticipantsList({ sessionId, showLabel = true, maxVisible, fallbackParticipants, participants: providedParticipants, size = 'md' }: ParticipantsListProps) {
  const [participants, setParticipants] = useState<Participant[]>(providedParticipants || []);
  const [loading, setLoading] = useState(!providedParticipants);
  const [expanded, setExpanded] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    // Only fetch if participants are not provided
    if (!providedParticipants) {
      fetchParticipants();
    } else {
      setParticipants(providedParticipants);
      setLoading(false);
    }
  }, [sessionId, providedParticipants]);

  const fetchParticipants = async () => {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/sessions/${sessionId}/participants`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        setParticipants(data.participants);
      } else {
        // Fallback to provided participants
        if (fallbackParticipants) {
          const fallbackList: Participant[] = [];
          if (fallbackParticipants.me && fallbackParticipants.me !== 'You') {
            fallbackList.push({
              name: fallbackParticipants.me,
              initials: getInitials(fallbackParticipants.me),
              color: getColorForName(fallbackParticipants.me)
            });
          }
          if (fallbackParticipants.them && fallbackParticipants.them !== 'Participant' && fallbackParticipants.them !== 'Participants') {
            fallbackList.push({
              name: fallbackParticipants.them,
              initials: getInitials(fallbackParticipants.them),
              color: getColorForName(fallbackParticipants.them)
            });
          }
          setParticipants(fallbackList);
        }
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
      // Use fallback if available
      if (fallbackParticipants) {
        const fallbackList: Participant[] = [];
        if (fallbackParticipants.me && fallbackParticipants.me !== 'You') {
          fallbackList.push({
            name: fallbackParticipants.me,
            initials: getInitials(fallbackParticipants.me),
            color: getColorForName(fallbackParticipants.me)
          });
        }
        if (fallbackParticipants.them && fallbackParticipants.them !== 'Participant' && fallbackParticipants.them !== 'Participants') {
          fallbackList.push({
            name: fallbackParticipants.them,
            initials: getInitials(fallbackParticipants.them),
            color: getColorForName(fallbackParticipants.them)
          });
        }
        setParticipants(fallbackList);
      }
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string): string => {
    const words = name.trim().split(' ').filter(w => w.length > 0);
    if (words.length === 0) return '??';
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    // Get first letter of first and last name
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const getColorForName = (name: string): string => {
    // Generate a consistent color based on the name using theme colors
    const colorClasses = [
      { bg: 'bg-primary', text: 'text-primary-foreground' },
      { bg: 'bg-secondary', text: 'text-secondary-foreground' },
      { bg: 'bg-accent', text: 'text-accent-foreground' },
      { bg: 'bg-blue-500', text: 'text-white' },
      { bg: 'bg-green-500', text: 'text-white' },
      { bg: 'bg-purple-500', text: 'text-white' },
      { bg: 'bg-pink-500', text: 'text-white' },
      { bg: 'bg-indigo-500', text: 'text-white' },
      { bg: 'bg-teal-500', text: 'text-white' },
      { bg: 'bg-orange-500', text: 'text-white' }
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colorClasses[Math.abs(hash) % colorClasses.length].bg;
  };

  const getTextColorForBg = (bgClass: string): string => {
    const colorMap: { [key: string]: string } = {
      'bg-primary': 'text-primary-foreground',
      'bg-secondary': 'text-secondary-foreground',
      'bg-accent': 'text-accent-foreground',
      'bg-blue-500': 'text-white',
      'bg-green-500': 'text-white',
      'bg-purple-500': 'text-white',
      'bg-pink-500': 'text-white',
      'bg-indigo-500': 'text-white',
      'bg-teal-500': 'text-white',
      'bg-orange-500': 'text-white'
    };
    return colorMap[bgClass] || 'text-white';
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          {showLabel && <span className="font-medium">Participants:</span>}
        </div>
        <div className="flex items-center gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-muted/20 rounded-full animate-pulse">
              <div className="w-7 h-7 bg-muted/40 rounded-full" />
              <div className="w-20 h-4 bg-muted/40 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (participants.length === 0) {
    return null;
  }

  const visibleParticipants = expanded || maxVisible === undefined ? participants : participants.slice(0, maxVisible);
  const remainingCount = maxVisible !== undefined && !expanded ? participants.length - visibleParticipants.length : 0;

  const isSmall = size === 'sm';

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Users className={isSmall ? "w-3 h-3" : "w-4 h-4"} />
        {showLabel && <span className="font-medium">Participants:</span>}
      </div>
      <div className={`flex items-center ${isSmall ? 'gap-1' : 'gap-1.5'} flex-wrap`}>
        {visibleParticipants.map((participant, index) => (
          <div
            key={index}
            className={`group flex items-center ${isSmall ? 'gap-1 px-1.5 py-0.5' : 'gap-1.5 px-2.5 py-1'} bg-muted/50 dark:bg-muted/30 border border-border hover:border-primary/50 rounded-full transition-all duration-200 hover:shadow-sm cursor-default`}
            title={participant.name}
          >
            <div
              className={`${isSmall ? 'w-4 h-4' : 'w-6 h-6'} ${participant.color} ${getTextColorForBg(participant.color)} rounded-full flex items-center justify-center ${isSmall ? 'text-[8px]' : 'text-[10px]'} font-bold shadow-sm ring-2 ring-white dark:ring-background transition-transform duration-200 group-hover:scale-110`}
            >
              {participant.initials}
            </div>
            <span className={`${isSmall ? 'text-[10px]' : 'text-xs'} text-foreground font-medium`}>{participant.name}</span>
          </div>
        ))}
        {remainingCount > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={`${isSmall ? 'text-[10px]' : 'text-xs'} text-muted-foreground focus:outline-none`}
          >
            (+{remainingCount} more)
          </button>
        )}
      </div>
    </div>
  );
}