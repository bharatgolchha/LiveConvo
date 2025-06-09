import { createActor, fromPromise, waitFor } from 'xstate';
import { conversationMachine } from './conversationMachine';
import type { ConversationMachineContext } from '@/types/conversation';

describe('ConversationMachine', () => {
  let actor: any;
  
  beforeAll(() => {
    // Mock navigator.mediaDevices.getUserMedia
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: jest.fn().mockResolvedValue({
          getTracks: () => [{ stop: jest.fn() }]
        })
      },
      writable: true
    });
    
    // Mock fetch for API calls
    global.fetch = jest.fn();
  });
  
  beforeEach(() => {
    actor = createActor(conversationMachine);
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    actor.stop();
  });
  
  describe('State Transitions', () => {
    test('should start in setup state', () => {
      actor.start();
      expect(actor.getSnapshot().value).toBe('setup');
    });
    
    test('should transition from setup to ready on SETUP_COMPLETE', () => {
      actor.start();
      actor.send({ type: 'SETUP_COMPLETE' });
      expect(actor.getSnapshot().value).toBe('ready');
    });
    
    test('should transition from ready to recording on START_RECORDING when conditions are met', async () => {
      // Create actor with initial context that meets guard conditions
      const testMachine = conversationMachine.provide({
        context: {
          // Session identifiers
          sessionId: null,
          authSession: { user: { id: 'test' } },
          
          // Conversation metadata
          conversationType: 'sales',
          conversationTitle: 'New Conversation',
          
          // Recording state
          transcript: [],
          lastSavedTranscriptIndex: 0,
          sessionDuration: 0,
          cumulativeDuration: 0,
          recordingStartTime: null,
          talkStats: { meWords: 0, themWords: 0 },
          
          // Context and files
          textContext: '',
          personalContext: '',
          uploadedFiles: [],
          
          // Audio streams
          systemAudioStream: null,
          
          // Summary and finalization
          conversationSummary: null,
          loadedSummary: null,
          isFinalized: false,
          
          // Minute tracking
          currentSessionMinutes: 0,
          canRecord: true,
          minutesRemaining: 60,
          
          // UI state
          isTabVisible: true,
          wasRecordingBeforeHidden: false,
          
          // Error state
          error: null,
        }
      });
      
      const actorWithContext = createActor(testMachine);
      
      actorWithContext.start();
      actorWithContext.send({ type: 'SETUP_COMPLETE' });
      actorWithContext.send({ type: 'START_RECORDING' });
      
      // Wait a bit for the service to invoke
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // The state should be 'recording'
      const state = actorWithContext.getSnapshot();
      expect(state.matches('recording')).toBeTruthy();
      
      actorWithContext.stop();
    });
    
    test('should not transition to recording when canRecord is false', () => {
      // Create actor with context where canRecord is false
      const actorWithContext = createActor(
        conversationMachine.provide({
          context: {
            ...conversationMachine.context,
            authSession: { user: { id: 'test' } },
            canRecord: false,
            minutesRemaining: 60
          }
        })
      );
      
      actorWithContext.start();
      actorWithContext.send({ type: 'SETUP_COMPLETE' });
      actorWithContext.send({ type: 'START_RECORDING' });
      
      expect(actorWithContext.getSnapshot().value).toBe('ready');
      
      actorWithContext.stop();
    });
    
    test('should transition from recording to paused on PAUSE_RECORDING', async () => {
      // Create actor with proper context
      const actorWithContext = createActor(
        conversationMachine.provide({
          context: {
            ...conversationMachine.context,
            authSession: { user: { id: 'test' } },
            canRecord: true,
            minutesRemaining: 60
          }
        })
      );
      
      actorWithContext.start();
      actorWithContext.send({ type: 'SETUP_COMPLETE' });
      actorWithContext.send({ type: 'START_RECORDING' });
      
      // Wait for the recording service to start
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify we're in recording state
      expect(actorWithContext.getSnapshot().matches('recording')).toBeTruthy();
      
      actorWithContext.send({ type: 'PAUSE_RECORDING' });
      expect(actorWithContext.getSnapshot().value).toBe('paused');
      
      actorWithContext.stop();
    });
    
    test('should transition from paused to recording on RESUME_RECORDING', async () => {
      const actorWithContext = createActor(
        conversationMachine.provide({
          context: {
            ...conversationMachine.context,
            authSession: { user: { id: 'test' } },
            canRecord: true,
            minutesRemaining: 60
          }
        })
      );
      
      actorWithContext.start();
      actorWithContext.send({ type: 'SETUP_COMPLETE' });
      actorWithContext.send({ type: 'START_RECORDING' });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      actorWithContext.send({ type: 'PAUSE_RECORDING' });
      expect(actorWithContext.getSnapshot().value).toBe('paused');
      
      actorWithContext.send({ type: 'RESUME_RECORDING' });
      
      // Wait for recording to resume
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const state = actorWithContext.getSnapshot();
      expect(state.matches('recording')).toBeTruthy();
      
      actorWithContext.stop();
    });
    
    test('should transition to finalizing on STOP_RECORDING', async () => {
      const actorWithContext = createActor(
        conversationMachine.provide({
          context: {
            ...conversationMachine.context,
            authSession: { user: { id: 'test' } },
            canRecord: true,
            minutesRemaining: 60
          }
        })
      );
      
      actorWithContext.start();
      actorWithContext.send({ type: 'SETUP_COMPLETE' });
      actorWithContext.send({ type: 'START_RECORDING' });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify we're in recording state before stopping
      expect(actorWithContext.getSnapshot().matches('recording')).toBeTruthy();
      
      actorWithContext.send({ type: 'STOP_RECORDING' });
      expect(actorWithContext.getSnapshot().value).toBe('finalizing');
      
      actorWithContext.stop();
    });
    
    test('should transition to error state on ERROR event', async () => {
      // Need to be in recording state to send ERROR
      const actorWithContext = createActor(
        conversationMachine.provide({
          context: {
            ...conversationMachine.context,
            authSession: { user: { id: 'test' } },
            canRecord: true,
            minutesRemaining: 60
          }
        })
      );
      
      actorWithContext.start();
      actorWithContext.send({ type: 'SETUP_COMPLETE' });
      actorWithContext.send({ type: 'START_RECORDING' });
      
      // Wait for recording to start
      await new Promise(resolve => setTimeout(resolve, 50));
      
      actorWithContext.send({ type: 'ERROR', error: 'Test error' });
      expect(actorWithContext.getSnapshot().value).toBe('error');
      expect(actorWithContext.getSnapshot().context.error).toBe('Test error');
      actorWithContext.stop();
    });
    
    test('should clear error when transitioning from error to ready', () => {
      actor.start();
      
      // Manually set to error state by updating context
      const actorWithError = createActor(
        conversationMachine.provide({
          context: {
            ...conversationMachine.context,
            error: 'Test error'
          }
        })
      );
      
      actorWithError.start();
      
      // The machine starts in setup, transition to ready should clear error
      actorWithError.send({ type: 'SETUP_COMPLETE' });
      expect(actorWithError.getSnapshot().value).toBe('ready');
      expect(actorWithError.getSnapshot().context.error).toBeNull();
      
      actorWithError.stop();
    });
  });
  
  describe('Context Updates', () => {
    test('should update conversation type', () => {
      actor.start();
      actor.send({ type: 'SET_CONVERSATION_TYPE', conversationType: 'meeting' });
      expect(actor.getSnapshot().context.conversationType).toBe('meeting');
    });
    
    test('should update conversation title', () => {
      actor.start();
      actor.send({ type: 'SET_CONVERSATION_TITLE', title: 'Test Meeting' });
      expect(actor.getSnapshot().context.conversationTitle).toBe('Test Meeting');
    });
    
    test('should update text context', () => {
      actor.start();
      actor.send({ type: 'UPDATE_CONTEXT', textContext: 'Test context' });
      expect(actor.getSnapshot().context.textContext).toBe('Test context');
    });
    
    test('should update personal context', () => {
      actor.start();
      actor.send({ type: 'UPDATE_PERSONAL_CONTEXT', personalContext: 'Personal notes' });
      expect(actor.getSnapshot().context.personalContext).toBe('Personal notes');
    });
    
    test('should update uploaded files', () => {
      actor.start();
      const mockFiles = [new File(['test'], 'test.txt')];
      actor.send({ type: 'UPLOAD_FILES', files: mockFiles });
      expect(actor.getSnapshot().context.uploadedFiles).toEqual(mockFiles);
    });
    
    test('should update transcript and talk stats', async () => {
      const actorWithContext = createActor(
        conversationMachine.provide({
          context: {
            ...conversationMachine.context,
            authSession: { user: { id: 'test' } },
            canRecord: true,
            minutesRemaining: 60
          }
        })
      );
      
      actorWithContext.start();
      actorWithContext.send({ type: 'SETUP_COMPLETE' });
      actorWithContext.send({ type: 'START_RECORDING' });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const transcript = [
        { id: '1', text: 'Hello world', timestamp: new Date(), speaker: 'ME' as const },
        { id: '2', text: 'Hi there friend', timestamp: new Date(), speaker: 'THEM' as const }
      ];
      
      actorWithContext.send({ type: 'UPDATE_TRANSCRIPT', transcript });
      
      const snapshot = actorWithContext.getSnapshot();
      expect(snapshot.context.transcript).toEqual(transcript);
      expect(snapshot.context.talkStats.meWords).toBe(2);
      expect(snapshot.context.talkStats.themWords).toBe(3);
      
      actorWithContext.stop();
    });
    
    test('should update tab visibility', async () => {
      const actorWithContext = createActor(
        conversationMachine.provide({
          context: {
            ...conversationMachine.context,
            authSession: { user: { id: 'test' } },
            canRecord: true,
            minutesRemaining: 60
          }
        })
      );
      
      actorWithContext.start();
      actorWithContext.send({ type: 'SETUP_COMPLETE' });
      actorWithContext.send({ type: 'START_RECORDING' });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      actorWithContext.send({ type: 'TAB_VISIBILITY_CHANGED', isVisible: false });
      expect(actorWithContext.getSnapshot().context.isTabVisible).toBe(false);
      
      actorWithContext.send({ type: 'TAB_VISIBILITY_CHANGED', isVisible: true });
      expect(actorWithContext.getSnapshot().context.isTabVisible).toBe(true);
      
      actorWithContext.stop();
    });
  });
  
  describe('Guard Conditions', () => {
    test('canStartRecording should check all required conditions', async () => {
      // Test with all conditions met
      const actorMeetsConditions = createActor(
        conversationMachine.provide({
          context: {
            ...conversationMachine.context,
            canRecord: true,
            authSession: { user: { id: 'test' } },
            minutesRemaining: 60
          }
        })
      );
      
      actorMeetsConditions.start();
      actorMeetsConditions.send({ type: 'SETUP_COMPLETE' });
      actorMeetsConditions.send({ type: 'START_RECORDING' });
      
      // Wait for service to start
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const state = actorMeetsConditions.getSnapshot();
      expect(state.matches('recording')).toBeTruthy();
      actorMeetsConditions.stop();
      
      // Test with canRecord false
      const actorCannotRecord = createActor(
        conversationMachine.provide({
          context: {
            ...conversationMachine.context,
            canRecord: false,
            authSession: { user: { id: 'test' } },
            minutesRemaining: 60
          }
        })
      );
      
      actorCannotRecord.start();
      actorCannotRecord.send({ type: 'SETUP_COMPLETE' });
      actorCannotRecord.send({ type: 'START_RECORDING' });
      expect(actorCannotRecord.getSnapshot().value).toBe('ready');
      actorCannotRecord.stop();
      
      // Test with no auth session
      const actorNoAuth = createActor(
        conversationMachine.provide({
          context: {
            ...conversationMachine.context,
            canRecord: true,
            authSession: null,
            minutesRemaining: 60
          }
        })
      );
      
      actorNoAuth.start();
      actorNoAuth.send({ type: 'SETUP_COMPLETE' });
      actorNoAuth.send({ type: 'START_RECORDING' });
      expect(actorNoAuth.getSnapshot().value).toBe('ready');
      actorNoAuth.stop();
      
      // Test with no minutes remaining
      const actorNoMinutes = createActor(
        conversationMachine.provide({
          context: {
            ...conversationMachine.context,
            canRecord: true,
            authSession: { user: { id: 'test' } },
            minutesRemaining: 0
          }
        })
      );
      
      actorNoMinutes.start();
      actorNoMinutes.send({ type: 'SETUP_COMPLETE' });
      actorNoMinutes.send({ type: 'START_RECORDING' });
      expect(actorNoMinutes.getSnapshot().value).toBe('ready');
      actorNoMinutes.stop();
    });
  });
  
  describe('Error Scenarios', () => {
    test('should handle recording service failure', async () => {
      // Mock getUserMedia to fail
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(
        new Error('Microphone access denied')
      );
      
      const actorWithContext = createActor(
        conversationMachine.provide({
          context: {
            ...conversationMachine.context,
            authSession: { user: { id: 'test' } },
            canRecord: true,
            minutesRemaining: 60
          }
        })
      );
      
      actorWithContext.start();
      actorWithContext.send({ type: 'SETUP_COMPLETE' });
      actorWithContext.send({ type: 'START_RECORDING' });
      
      // Give time for the service to fail
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(actorWithContext.getSnapshot().value).toBe('error');
      expect(actorWithContext.getSnapshot().context.error).toBeTruthy();
      actorWithContext.stop();
      
      // Restore original mock
      (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({
        getTracks: () => [{ stop: jest.fn() }]
      });
    });
    
    test('should handle finalization service failure', async () => {
      // Mock fetch to fail for finalization
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );
      
      const actorWithContext = createActor(
        conversationMachine.provide({
          context: {
            ...conversationMachine.context,
            authSession: { user: { id: 'test' } },
            canRecord: true,
            minutesRemaining: 60,
            sessionId: 'test-session',
            transcript: [
              { id: '1', text: 'Test', timestamp: new Date(), speaker: 'ME' }
            ]
          }
        })
      );
      
      actorWithContext.start();
      actorWithContext.send({ type: 'SETUP_COMPLETE' });
      actorWithContext.send({ type: 'START_RECORDING' });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      actorWithContext.send({ type: 'STOP_RECORDING' });
      
      // Give time for finalization to fail
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      expect(actorWithContext.getSnapshot().value).toBe('error');
      expect(actorWithContext.getSnapshot().context.error).toBeTruthy();
      actorWithContext.stop();
    });
  });
  
  describe('Usage Limit Handling', () => {
    test('should transition to finalizing on USAGE_LIMIT_REACHED', async () => {
      const actorWithContext = createActor(
        conversationMachine.provide({
          context: {
            ...conversationMachine.context,
            authSession: { user: { id: 'test' } },
            canRecord: true,
            minutesRemaining: 60
          }
        })
      );
      
      actorWithContext.start();
      actorWithContext.send({ type: 'SETUP_COMPLETE' });
      actorWithContext.send({ type: 'START_RECORDING' });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify we're in recording state
      expect(actorWithContext.getSnapshot().matches('recording')).toBeTruthy();
      
      actorWithContext.send({ type: 'USAGE_LIMIT_REACHED' });
      expect(actorWithContext.getSnapshot().value).toBe('finalizing');
      
      actorWithContext.stop();
    });
  });
});