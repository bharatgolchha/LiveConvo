import { useState, useCallback } from 'react';
import { useMeetingContext } from '../context/MeetingContext';
import { SmartNote } from '../types/transcript.types';

export function useSmartNotes() {
  const { meeting, transcript, addSmartNote } = useMeetingContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateNotes = useCallback(async () => {
    if (!meeting?.id || transcript.length < 5) {
      setError(new Error('Not enough conversation to generate notes'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/meeting/${meeting.id}/smart-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptCount: transcript.length,
          context: meeting.context
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate smart notes');
      }

      const { notes } = await response.json();

      // Add generated notes
      notes.forEach((note: any) => {
        const smartNote: SmartNote = {
          id: `generated-${Date.now()}-${Math.random()}`,
          category: note.category,
          content: note.content,
          importance: note.importance || 'medium',
          timestamp: new Date().toISOString()
        };
        addSmartNote(smartNote);
      });
    } catch (err) {
      console.error('Error generating smart notes:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [meeting, transcript, addSmartNote]);

  return { loading, error, generateNotes };
}