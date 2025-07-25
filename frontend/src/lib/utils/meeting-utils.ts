import type { Session } from '@/lib/hooks/useSessions';

/**
 * Determines if a session/meeting is currently live/active
 */
export function isLiveMeeting(session: Session): boolean {
  // 1. If the session status is explicitly marked as active, it's live.
  if (session.status === 'active') {
    return true;
  }

  // 2. Derive liveness from the bot state. Historically we only stored singular
  //    values like "in_call" or "recording", but Recall.AI now returns combined
  //    states such as "in_call_recording". Instead of keeping a hard-coded list,
  //    treat any state that *starts with* an active prefix as live. This makes
  //    the check future-proof if new compound states are introduced (e.g.
  //    "in_call_transcribing").

  const activePrefixes: Array<Session['recall_bot_status']> = [
    'joining',
    'in_call',
    'recording',
    'waiting',
  ];

  if (session.recall_bot_status) {
    return activePrefixes.some((prefix) =>
      (session.recall_bot_status as string).startsWith(prefix)
    );
  }

  return false;
}

/**
 * Determines if a session/meeting is completed
 */
export function isCompletedMeeting(session: Session): boolean {
  return session.status === 'completed';
}

/**
 * Filters sessions based on view type
 */
export function filterSessionsByView(
  sessions: Session[], 
  view: 'live' | 'all'
): Session[] {
  switch (view) {
    case 'live':
      return sessions.filter(isLiveMeeting);
    case 'all':
    default:
      return sessions;
  }
}

/**
 * Counts sessions by status
 */
export function getSessionCounts(sessions: Session[]): {
  live: number;
  total: number;
} {
  return {
    live: sessions.filter(isLiveMeeting).length,
    total: sessions.length
  };
}

/**
 * Sorts sessions with live ones first, then by most recent activity
 */
export function sortSessionsWithLiveFirst(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => {
    // Live sessions come first
    const aIsLive = isLiveMeeting(a);
    const bIsLive = isLiveMeeting(b);
    
    if (aIsLive && !bIsLive) return -1;
    if (!aIsLive && bIsLive) return 1;
    
    // Within the same category, sort by most recent activity
    const aTime = new Date(a.updated_at || a.created_at).getTime();
    const bTime = new Date(b.updated_at || b.created_at).getTime();
    
    return bTime - aTime;
  });
}