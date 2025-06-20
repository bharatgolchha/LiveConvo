import React from 'react';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';

interface SpeakerAvatarProps {
  speaker: string;
  isHost?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function SpeakerAvatar({ speaker, isHost, size = 'md' }: SpeakerAvatarProps) {
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

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  const colorClasses = isHost
    ? 'bg-primary text-primary-foreground'
    : 'bg-muted text-muted-foreground';

  return (
    <div className={`
      ${sizeClasses[size]} 
      ${colorClasses}
      rounded-full flex items-center justify-center font-medium
    `}>
      {getInitials(getSpeakerName())}
    </div>
  );
}