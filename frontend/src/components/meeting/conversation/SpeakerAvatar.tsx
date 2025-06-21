import React from 'react';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';

interface SpeakerAvatarProps {
  speaker: string;
  isHost?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
}

export function SpeakerAvatar({ speaker, isHost, size = 'md', showStatus = false }: SpeakerAvatarProps) {
  const { meeting } = useMeetingContext();
  
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getSpeakerName = () => {
    if (speaker === 'ME') return meeting?.participantMe || 'ME';
    if (speaker === 'THEM') return meeting?.participantThem || 'THEM';
    return speaker;
  };

  // Generate consistent color based on speaker name
  const getAvatarColor = (name: string) => {
    if (isHost) {
      return 'bg-primary text-primary-foreground border-primary/20';
    }
    
    // Generate a consistent color based on the name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      'bg-blue-500 text-white border-blue-500/20',
      'bg-green-500 text-white border-green-500/20',
      'bg-purple-500 text-white border-purple-500/20',
      'bg-orange-500 text-white border-orange-500/20',
      'bg-pink-500 text-white border-pink-500/20',
      'bg-indigo-500 text-white border-indigo-500/20',
      'bg-teal-500 text-white border-teal-500/20',
      'bg-red-500 text-white border-red-500/20',
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const speakerName = getSpeakerName();
  const colorClasses = getAvatarColor(speakerName);

  return (
    <div className="relative">
      <div className={`
        ${sizeClasses[size]} 
        ${colorClasses}
        rounded-full flex items-center justify-center font-semibold
        border-2 shadow-sm transition-all duration-200
        hover:scale-105 hover:shadow-md
      `}>
        {getInitials(speakerName)}
      </div>
      
      {/* Host indicator */}
      {isHost && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary border-2 border-background rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-primary-foreground rounded-full" />
        </div>
      )}
      
      {/* Status indicator */}
      {showStatus && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
      )}
    </div>
  );
}