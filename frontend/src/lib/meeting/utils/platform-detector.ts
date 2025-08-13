import { MeetingPlatform } from '../types/meeting.types';

export function detectMeetingPlatform(url: string): MeetingPlatform | null {
  const normalizedUrl = url.toLowerCase().trim();
  
  // Zoom patterns
  if (normalizedUrl.includes('zoom.us/j/') || 
      normalizedUrl.includes('zoom.us/my/') ||
      normalizedUrl.includes('zoom.com/j/')) {
    return 'zoom';
  }
  
  // Google Meet patterns
  if (normalizedUrl.includes('meet.google.com/') ||
      normalizedUrl.includes('hangouts.google.com/')) {
    return 'google_meet';
  }
  
  // Microsoft Teams patterns
  if (normalizedUrl.includes('teams.microsoft.com/') ||
      normalizedUrl.includes('teams.live.com/')) {
    return 'teams';
  }
  
  return null;
}

export function validateMeetingUrl(url: string): { valid: boolean; platform?: MeetingPlatform; error?: string } {
  if (!url || url.trim().length === 0) {
    return { valid: false, error: 'Meeting URL is required' };
  }
  
  try {
    const urlObj = new URL(url);
    if (!urlObj.protocol.startsWith('http')) {
      return { valid: false, error: 'Invalid URL format' };
    }
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
  
  const platform = detectMeetingPlatform(url);
  if (!platform) {
    return { valid: false, error: 'Unsupported meeting platform. Please use Zoom, Google Meet, or Microsoft Teams.' };
  }
  
  return { valid: true, platform };
}

export function getPlatformIcon(platform: MeetingPlatform): string {
  const icons = {
    zoom: '🎥',
    google_meet: '📹',
    teams: '💼'
  };
  return icons[platform];
}

export function getPlatformName(platform: MeetingPlatform): string {
  const names = {
    zoom: 'Zoom',
    google_meet: 'Google Meet',
    teams: 'Microsoft Teams'
  };
  return names[platform];
}

export function getPlatformLogoPath(platform: MeetingPlatform): string {
  const logos: Record<MeetingPlatform, string> = {
    zoom: '/platform-logos/zoom.png',
    google_meet: '/platform-logos/meet.png',
    teams: '/platform-logos/teams.png',
  };
  return logos[platform];
}