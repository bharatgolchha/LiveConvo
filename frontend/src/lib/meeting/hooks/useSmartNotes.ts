import { useState, useCallback, useEffect } from 'react';
import { useMeetingContext } from '../context/MeetingContext';
import { SmartNote } from '../types/transcript.types';
import { useAuth } from '@/contexts/AuthContext';

export function useSmartNotes() {
  const { meeting, transcript, addSmartNote } = useMeetingContext();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load existing smart notes for this meeting
  useEffect(() => {
    const loadNotes = async () => {
      if (!meeting?.id) return;

      try {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`/api/meeting/${meeting.id}/smart-notes`, {
          method: 'GET',
          headers
        });

        if (!response.ok) {
          throw new Error('Failed to load smart notes');
        }

        const dbNotes: any[] = await response.json();

        dbNotes.forEach((n: any) => {
          const note: SmartNote = {
            id: String(n.id),
            category: n.category,
            content: n.content,
            importance: n.importance || 'medium',
            timestamp: n.created_at || new Date().toISOString()
          };
          addSmartNote(note);
        });
      } catch (e: any) {
        // Silently capture; generation can still work
        console.error('[useSmartNotes] Failed to load existing notes:', e);
      }
    };

    loadNotes();
    // Only refetch when meeting changes or auth token changes
  }, [meeting?.id, session?.access_token, addSmartNote]);

  const generateNotes = useCallback(async () => {
    if (!meeting?.id || transcript.length < 5) {
      setError(new Error('Not enough conversation to generate notes'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[useSmartNotes] Generating smart notes for meeting:', meeting.id);
      
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      const response = await fetch(`/api/meeting/${meeting.id}/smart-notes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transcriptCount: transcript.length,
          context: meeting.context
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate smart notes');
      }

      const { notes } = await response.json();
      console.log('[useSmartNotes] Generated notes from API:', notes);

      // Add generated notes
      notes.forEach((note: any) => {
        const smartNote: SmartNote = {
          id: `generated-${Date.now()}-${Math.random()}`,
          category: note.category,
          content: note.content,
          importance: note.importance || 'medium',
          timestamp: new Date().toISOString()
        };
        console.log('[useSmartNotes] Adding generated note:', smartNote);
        addSmartNote(smartNote);
      });
      
      console.log('[useSmartNotes] Successfully added', notes.length, 'generated notes');
    } catch (err) {
      console.error('Error generating smart notes:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [meeting, transcript, addSmartNote, session]);

  /** Load existing smart notes from database */
  const loadNotes = useCallback(async () => {
    if (!meeting?.id || !session?.access_token) return;

    try {
      setLoading(true);
      setError(null);

      const headers: HeadersInit = {
        Authorization: `Bearer ${session.access_token}`,
      };

      console.log('[useSmartNotes] Fetching existing smart notes...');
      const response = await fetch(`/api/meeting/${meeting.id}/smart-notes`, {
        headers,
      });

      if (!response.ok) {
        console.error('[useSmartNotes] API response not OK:', response.status, response.statusText);
        throw new Error('Failed to fetch smart notes');
      }

      const notes: any[] = await response.json();
      console.log('[useSmartNotes] Raw API response:', notes);
      console.log('[useSmartNotes] Found', notes.length, 'notes in database');

      if (notes.length === 0) {
        console.log('[useSmartNotes] No smart notes found in database for session:', meeting.id);
      }

      notes.forEach((note, index) => {
        console.log(`[useSmartNotes] Processing note ${index + 1}:`, {
          id: note.id,
          category: note.category,
          content: note.content,
          importance: note.importance,
          created_at: note.created_at
        });

        const smartNote: SmartNote = {
          id: note.id,
          category: note.category,
          content: note.content,
          importance: (note.importance || 'medium') as 'high' | 'medium' | 'low',
          timestamp: note.created_at || new Date().toISOString(),
        };
        
        console.log('[useSmartNotes] Adding smart note to context:', smartNote);
        addSmartNote(smartNote);
      });

      console.log('[useSmartNotes] Finished loading notes');
    } catch (err) {
      console.error('Error loading smart notes:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [meeting?.id, session?.access_token, addSmartNote]);

  // Load notes once when meeting + auth ready
  useEffect(() => {
    if (meeting?.id && session?.access_token) {
      loadNotes();
    }
  }, [meeting?.id, session?.access_token, loadNotes]);

  return { loading, error, generateNotes, loadNotes };
}