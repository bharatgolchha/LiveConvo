import { useMemo } from 'react';
import { Session } from './useSessions';

export interface SessionThread {
  id: string;
  rootSession: Session;
  sessions: Session[];
  totalDuration: number;
  totalWords: number;
  participants: {
    me: string[];
    them: string[];
  };
  latestActivity: string;
  threadSize: number;
}

export interface SessionWithThread extends Session {
  threadId?: string;
  threadPosition?: number;
  threadSize?: number;
  isThreadRoot?: boolean;
}

/**
 * Groups sessions into conversation threads based on their linked relationships
 */
export function useSessionThreads(sessions: Session[], groupByThread: boolean = true) {
  const threads = useMemo(() => {
    if (!groupByThread) {
      return null;
    }

    // Create a map to track which sessions belong to which thread
    const sessionToThread = new Map<string, string>();
    const threads = new Map<string, SessionThread>();
    const processedSessions = new Set<string>();

    // Helper function to find all connected sessions
    const findConnectedSessions = (sessionId: string, visited: Set<string> = new Set()): string[] => {
      if (visited.has(sessionId)) return [];
      visited.add(sessionId);

      const session = sessions.find(s => s.id === sessionId);
      if (!session) return [sessionId];

      const connected = [sessionId];

      // Find sessions that link to this one
      const linkedToThis = sessions.filter(s => 
        s.linkedConversations?.some(link => link.id === sessionId)
      );

      // Find sessions this one links to
      const linkedFromThis = session.linkedConversations?.map(link => link.id) || [];

      // Recursively find all connected sessions
      [...linkedToThis.map(s => s.id), ...linkedFromThis].forEach(id => {
        connected.push(...findConnectedSessions(id, visited));
      });

      return Array.from(new Set(connected));
    };

    // Process each session to build threads
    sessions.forEach(session => {
      if (processedSessions.has(session.id)) return;

      // Find all sessions connected to this one
      const connectedIds = findConnectedSessions(session.id);
      const connectedSessions = connectedIds
        .map(id => sessions.find(s => s.id === id))
        .filter((s): s is Session => s !== null)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      if (connectedSessions.length > 1) {
        // This is part of a thread
        const rootSession = connectedSessions[0];
        const threadId = rootSession.id;

        // Calculate thread statistics
        const totalDuration = connectedSessions.reduce((sum, s) => 
          sum + (s.recording_duration_seconds || 0), 0
        );
        const totalWords = connectedSessions.reduce((sum, s) => 
          sum + (s.total_words_spoken || 0), 0
        );

        // Collect unique participants
        const participantsMe = new Set<string>();
        const participantsThem = new Set<string>();
        
        connectedSessions.forEach(s => {
          if (s.participant_me) participantsMe.add(s.participant_me);
          if (s.participant_them) participantsThem.add(s.participant_them);
        });

        // Find latest activity
        const latestActivity = connectedSessions
          .map(s => s.updated_at)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

        const thread: SessionThread = {
          id: threadId,
          rootSession,
          sessions: connectedSessions,
          totalDuration,
          totalWords,
          participants: {
            me: Array.from(participantsMe),
            them: Array.from(participantsThem)
          },
          latestActivity,
          threadSize: connectedSessions.length
        };

        threads.set(threadId, thread);

        // Mark all sessions in this thread
        connectedSessions.forEach(s => {
          sessionToThread.set(s.id, threadId);
          processedSessions.add(s.id);
        });
      } else {
        // Single session, not part of a thread
        processedSessions.add(session.id);
      }
    });

    return { threads, sessionToThread };
  }, [sessions, groupByThread]);

  // Enhance sessions with thread information
  const enhancedSessions = useMemo((): SessionWithThread[] => {
    if (!threads) return sessions;

    const { threads: threadMap, sessionToThread } = threads;

    return sessions.map(session => {
      const threadId = sessionToThread.get(session.id);
      if (!threadId) {
        return session;
      }

      const thread = threadMap.get(threadId);
      if (!thread) {
        return session;
      }

      const position = thread.sessions.findIndex(s => s.id === session.id) + 1;

      return {
        ...session,
        threadId,
        threadPosition: position,
        threadSize: thread.threadSize,
        isThreadRoot: position === 1
      };
    });
  }, [sessions, threads]);

  // Get root sessions for thread view
  const threadRoots = useMemo(() => {
    if (!threads) return [];
    return Array.from(threads.threads.values());
  }, [threads]);

  // Get sessions that are not part of any thread
  const standaloneSessions = useMemo(() => {
    if (!threads) return sessions;
    const { sessionToThread } = threads;
    return sessions.filter(s => !sessionToThread.has(s.id));
  }, [sessions, threads]);

  return {
    enhancedSessions,
    threads: threadRoots,
    standaloneSessions,
    isGrouped: groupByThread && threads !== null
  };
}