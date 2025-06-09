import { createMachine, assign } from 'xstate';
import type { 
  ConversationMachineContext, 
  ConversationMachineEvent
} from '@/types/conversation';
import { startRecordingService, finalizationService } from './conversationServices';

export const conversationMachine = createMachine(
  {
    id: 'conversation',
    initial: 'setup',
    
    types: {} as {
      context: ConversationMachineContext;
      events: ConversationMachineEvent;
      input: {
        authSession: any;
        sessionId: string | null;
      };
    },
  
  context: ({ input }) => ({
    // Session identifiers
    sessionId: input?.sessionId || null,
    authSession: input?.authSession || null,
    
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
    minutesRemaining: 0,
    
    // UI state
    isTabVisible: true,
    wasRecordingBeforeHidden: false,
    
    // Error state
    error: null,
  }),
  
  states: {
    setup: {
      on: {
        SETUP_COMPLETE: {
          target: 'ready',
          actions: assign({ error: null })
        },
        SET_CONVERSATION_TYPE: {
          actions: assign({
            conversationType: ({ event }) => event.conversationType
          })
        },
        SET_CONVERSATION_TITLE: {
          actions: assign({
            conversationTitle: ({ event }) => event.title
          })
        },
        UPDATE_CONTEXT: {
          actions: assign({
            textContext: ({ event }) => event.textContext
          })
        },
        UPDATE_PERSONAL_CONTEXT: {
          actions: assign({
            personalContext: ({ event }) => event.personalContext
          })
        },
        UPLOAD_FILES: {
          actions: assign({
            uploadedFiles: ({ event }) => event.files
          })
        },
        UPDATE_MINUTE_TRACKING: {
          actions: assign({
            canRecord: ({ event }) => event.canRecord,
            minutesRemaining: ({ event }) => event.minutesRemaining,
            currentSessionMinutes: ({ event }) => event.currentSessionMinutes
          })
        },
        UPDATE_AUTH_SESSION: {
          actions: assign({
            authSession: ({ event }) => event.authSession
          })
        }
      }
    },
    
    ready: {
      on: {
        START_RECORDING: {
          target: 'recording',
          guard: ({ context }) => {
            return context.canRecord && 
                   context.authSession !== null &&
                   context.minutesRemaining > 0;
          },
          actions: [
            assign({ recordingStartTime: () => Date.now() }),
            assign({ error: null })
          ]
        },
        SET_CONVERSATION_TYPE: {
          actions: assign({
            conversationType: ({ event }) => event.conversationType
          })
        },
        SET_CONVERSATION_TITLE: {
          actions: assign({
            conversationTitle: ({ event }) => event.title
          })
        },
        UPDATE_CONTEXT: {
          actions: assign({
            textContext: ({ event }) => event.textContext
          })
        },
        UPDATE_PERSONAL_CONTEXT: {
          actions: assign({
            personalContext: ({ event }) => event.personalContext
          })
        },
        UPLOAD_FILES: {
          actions: assign({
            uploadedFiles: ({ event }) => event.files
          })
        },
        UPDATE_MINUTE_TRACKING: {
          actions: assign({
            canRecord: ({ event }) => event.canRecord,
            minutesRemaining: ({ event }) => event.minutesRemaining,
            currentSessionMinutes: ({ event }) => event.currentSessionMinutes
          })
        }
      }
    },
    
    recording: {
      invoke: {
        id: 'recordingService',
        src: 'startRecordingActor',
        input: ({ context }) => context,
        onDone: {
          actions: assign({
            sessionId: ({ event }) => event.output.sessionId,
            systemAudioStream: ({ event }) => event.output.stream
          })
        },
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.error?.message || 'Recording failed'
          })
        }
      },
      on: {
        PAUSE_RECORDING: {
          target: 'paused',
          actions: assign(({ context }) => {
            if (context.recordingStartTime) {
              const sessionTime = (Date.now() - context.recordingStartTime) / 1000;
              return {
                cumulativeDuration: context.cumulativeDuration + sessionTime,
                sessionDuration: context.cumulativeDuration + sessionTime
              };
            }
            return {};
          })
        },
        STOP_RECORDING: {
          target: 'finalizing'
        },
        UPDATE_TRANSCRIPT: {
          actions: [
            assign({
              transcript: ({ event }) => event.transcript
            }),
            assign(({ context }) => {
              let meWords = 0;
              let themWords = 0;
              
              context.transcript.forEach(line => {
                const wordCount = line.text.split(/\s+/).filter(word => word.length > 0).length;
                if (line.speaker === 'ME') {
                  meWords += wordCount;
                } else {
                  themWords += wordCount;
                }
              });
              
              return { talkStats: { meWords, themWords } };
            })
          ]
        },
        TAB_VISIBILITY_CHANGED: {
          actions: assign({
            isTabVisible: ({ event }) => event.isVisible
          })
        },
        USAGE_LIMIT_REACHED: {
          target: 'finalizing',
          actions: ({ context }) => {
            console.log('📊 Usage limit reached');
          }
        },
        APPROACHING_USAGE_LIMIT: {
          actions: ({ event }) => {
            console.log(`⚠️ Only ${event.minutesRemaining} minutes remaining`);
          }
        },
        ERROR: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.error
          })
        },
        UPDATE_MINUTE_TRACKING: {
          actions: assign({
            canRecord: ({ event }) => event.canRecord,
            minutesRemaining: ({ event }) => event.minutesRemaining,
            currentSessionMinutes: ({ event }) => event.currentSessionMinutes
          })
        }
      }
    },
    
    paused: {
      on: {
        RESUME_RECORDING: {
          target: 'recording',
          actions: assign({
            recordingStartTime: () => Date.now()
          })
        },
        STOP_RECORDING: {
          target: 'finalizing'
        },
        UPDATE_TRANSCRIPT: {
          actions: [
            assign({
              transcript: ({ event }) => event.transcript
            }),
            assign(({ context }) => {
              let meWords = 0;
              let themWords = 0;
              
              context.transcript.forEach(line => {
                const wordCount = line.text.split(/\s+/).filter(word => word.length > 0).length;
                if (line.speaker === 'ME') {
                  meWords += wordCount;
                } else {
                  themWords += wordCount;
                }
              });
              
              return { talkStats: { meWords, themWords } };
            })
          ]
        },
        TAB_VISIBILITY_CHANGED: {
          actions: assign({
            isTabVisible: ({ event }) => event.isVisible
          })
        },
        UPDATE_MINUTE_TRACKING: {
          actions: assign({
            canRecord: ({ event }) => event.canRecord,
            minutesRemaining: ({ event }) => event.minutesRemaining,
            currentSessionMinutes: ({ event }) => event.currentSessionMinutes
          })
        }
      }
    },
    
    finalizing: {
      invoke: {
        id: 'finalizationService',
        src: 'finalizationActor',
        input: ({ context }) => context,
        onDone: {
          target: 'completed',
          actions: [
            assign({
              isFinalized: true,
              conversationSummary: ({ event }) => event.output.summary
            }),
            ({ context }) => {
              console.log('💾 Saving final summary', context.conversationSummary);
            }
          ]
        },
        onError: {
          target: 'error',
          actions: assign({
            error: ({ event }) => event.error?.message || 'Finalization failed'
          })
        }
      }
    },
    
    completed: {
      type: 'final',
      entry: ({ context }) => {
        // Clean up audio streams
        if (context.systemAudioStream) {
          context.systemAudioStream.getTracks().forEach(track => track.stop());
        }
      }
    },
    
    error: {
      on: {
        SETUP_COMPLETE: {
          target: 'ready',
          actions: assign({ error: null })
        }
      }
    }
  }
},
{
  actors: {
    startRecordingActor: startRecordingService,
    finalizationActor: finalizationService
  }
});

// Type-safe machine with context and events
export type ConversationMachine = typeof conversationMachine;