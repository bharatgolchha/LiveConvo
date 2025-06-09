import { fromPromise } from 'xstate';
import type { ConversationMachineContext } from '@/types/conversation';

/**
 * Services for the conversation state machine
 * These integrate with the actual APIs and hardware
 */

// Start recording service
export const startRecordingService = fromPromise(async ({ 
  input 
}: { 
  input: ConversationMachineContext 
}) => {
  console.log('🎙️ Starting recording service');
  
  try {
    // Get microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } 
    });
    
    // If we have a session ID, update its status to active
    if (input.sessionId && input.authSession) {
      try {
        const authHeader = input.authSession.access_token 
          ? `Bearer ${input.authSession.access_token}`
          : '';
          
        await fetch(`/api/sessions/${input.sessionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify({
            status: 'active',
            recording_started_at: new Date().toISOString()
          })
        });
      } catch (error) {
        console.error('Failed to update session status:', error);
      }
    }
    
    // Return the session ID and stream
    return {
      sessionId: input.sessionId || 'new-session',
      stream
    };
  } catch (error) {
    console.error('Failed to access microphone:', error);
    throw new Error('Microphone access denied');
  }
});

// Finalization service
export const finalizationService = fromPromise(async ({ 
  input 
}: { 
  input: ConversationMachineContext 
}) => {
  console.log('🏁 Finalizing session');
  
  try {
    // Wait a bit to ensure all data is saved
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate final summary if not already available
    let finalSummary = input.conversationSummary;
    
    if (!finalSummary && input.transcript.length > 0) {
      // Call summary API
      const transcriptText = input.transcript
        .map(line => `${line.speaker}: ${line.text}`)
        .join('\n');
      
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: input.sessionId,
          transcript: transcriptText,
          conversationType: input.conversationType,
          context: input.textContext,
          isPartial: false
        })
      });
      
      if (response.ok) {
        finalSummary = await response.json();
      }
    }
    
    // Call finalize endpoint
    if (input.sessionId) {
      await fetch(`/api/sessions/${input.sessionId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          summary: finalSummary,
          duration: input.sessionDuration,
          wordCount: input.talkStats.meWords + input.talkStats.themWords
        })
      });
    }
    
    return {
      summary: finalSummary,
      transcript: input.transcript
    };
  } catch (error) {
    console.error('Failed to finalize session:', error);
    throw error;
  }
});