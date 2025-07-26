import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LightBulbIcon, 
  ClockIcon,
  ArrowRightIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  PlayIcon,
  ClipboardIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Constants for transcript window management
const TRANSCRIPT_WINDOW_SIZE = 40; // Number of recent messages to include
const UPDATE_FREQUENCY = 25; // Update suggestions every N new messages

interface SuggestionChip {
  text: string;
  prompt: string;
  impact?: number;
}

interface Suggestion {
  id: string;
  type: 'question' | 'action' | 'warning' | 'tip';
  title: string;
  description: string;
  prompt?: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: string;
  isUsed?: boolean;
}

export function SmartSuggestions() {
  const { meeting, transcript, botStatus, summary } = useMeetingContext();
  const [suggestions, setSuggestions] = useState<SuggestionChip[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdateLength, setLastUpdateLength] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [documentContext, setDocumentContext] = useState<string>('');

  // Load document context from chat history
  useEffect(() => {
    const loadDocumentContext = async () => {
      if (!meeting?.id) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await fetch(`/api/sessions/${meeting.id}/chat-history`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const chatHistory = data.chatHistory;
          
          if (chatHistory?.messages) {
            // Extract document context messages
            const docContextMessages = chatHistory.messages
              .filter((msg: any) => msg.id?.startsWith('doc-context-'))
              .map((msg: any) => msg.content)
              .join('\n\n');
            
            if (docContextMessages) {
              setDocumentContext(docContextMessages);
              console.log('📎 Loaded document context for suggestions:', docContextMessages);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load document context:', error);
      }
    };

    loadDocumentContext();
  }, [meeting?.id]);

  // Generate suggestions on page load if transcript exists
  useEffect(() => {
    // Only run once when we have transcript and bot is ready
    if (transcript.length > 0 && botStatus?.status === 'in_call' && lastUpdateLength === 0) {
      console.log('🚀 Generating initial suggestions on page load');
      generateSuggestions();
      setLastUpdateLength(transcript.length);
    }
  }, [transcript.length, botStatus?.status]); // Re-run when these change

  // Generate suggestions based on transcript changes
  useEffect(() => {
    const shouldUpdate = transcript.length > 0 && 
                        transcript.length !== lastUpdateLength &&
                        transcript.length % UPDATE_FREQUENCY === 0; // Update every N new messages

    if (shouldUpdate && botStatus?.status === 'in_call') {
      generateSuggestions();
      setLastUpdateLength(transcript.length);
    }
  }, [transcript.length, lastUpdateLength, botStatus?.status]);

  // Regenerate suggestions when document context changes
  useEffect(() => {
    if (documentContext && transcript.length > 0 && botStatus?.status === 'in_call') {
      console.log('📎 Document context changed, regenerating suggestions');
      generateSuggestions();
    }
  }, [documentContext]);

  const generateSuggestions = async () => {
    if (loading || !meeting?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Use sliding window for recent transcript
      const recentMessages = transcript.slice(-TRANSCRIPT_WINDOW_SIZE);
      const recentTranscript = recentMessages.map(t => 
        `${t.displayName || t.speaker}: ${t.text}`
      ).join('\n');

      // Add context about earlier conversation if needed
      const historicalContext = transcript.length > TRANSCRIPT_WINDOW_SIZE 
        ? `\n[Earlier conversation: ${transcript.length - TRANSCRIPT_WINDOW_SIZE} previous messages not shown for brevity]` 
        : '';

      const transcriptForSuggestions = recentTranscript + historicalContext;

      console.log('🔍 Generating suggestions with:', {
        totalTranscriptLength: transcript.length,
        recentMessagesCount: recentMessages.length,
        hasHistoricalContext: transcript.length > TRANSCRIPT_WINDOW_SIZE,
        meetingType: meeting?.type,
        stage: getConversationStage()
      });

      // Get auth token for API request
      const { data: { session } } = await supabase.auth.getSession();
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (session?.access_token) {
        authHeaders['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(`/api/meeting/${meeting.id}/smart-suggestions`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          transcript: transcriptForSuggestions,
          summary: summary || null,
          meetingType: meeting?.type || 'team_meeting',
          meetingTitle: meeting?.title,
          context: meeting?.context,
          aiInstructions: (meeting as any)?.ai_instructions || null,
          stage: getConversationStage(),
          participantMe: meeting?.participantMe || 'You',
          sessionOwner: meeting?.sessionOwner,
          documentContext: documentContext || null
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📝 Smart suggestions response:', data);

      if (data.suggestions && Array.isArray(data.suggestions)) {
        const newSuggestions = data.suggestions.map((suggestion: any) => ({
          text: suggestion.text,
          prompt: suggestion.prompt,
          impact: suggestion.impact || 75,
          category: suggestion.category,
          priority: suggestion.priority
        }));
        setSuggestions(newSuggestions);
        console.log('✅ AI suggestions updated:', newSuggestions.length);
      } else {
        console.warn('⚠️ No suggestions in response, using fallback:', data);
        // Use fallback suggestions
        setSuggestions(getFallbackSuggestions());
      }
    } catch (error) {
      console.error('❌ Error generating suggestions:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate suggestions');
      // Use fallback suggestions on error
      setSuggestions(getFallbackSuggestions());
    } finally {
      setLoading(false);
    }
  };

  const getConversationStage = () => {
    // Simple heuristic to determine conversation stage based on transcript length and content
    const length = transcript.length;
    if (length < 5) return 'opening';
    if (length < 15) return 'discovery';
    if (length < 30) return 'discussion';
    return 'closing';
  };

  const getFallbackSuggestions = (): SuggestionChip[] => {
    const stage = getConversationStage();
    const type = meeting?.type || 'meeting';
    
    const fallbackMap: Record<string, Record<string, SuggestionChip[]>> = {
      sales: {
        opening: [
          { text: "🎯 Set agenda", prompt: "How should I structure this sales call?", impact: 90 },
          { text: "🤝 Build rapport", prompt: "What's the best way to build rapport with this prospect?", impact: 85 },
          { text: "📋 Qualify needs", prompt: "What qualifying questions should I ask first?", impact: 80 }
        ],
        discovery: [
          { text: "🔍 Dig deeper", prompt: "What follow-up questions should I ask about their challenges?", impact: 90 },
          { text: "💰 Understand budget", prompt: "How can I tactfully explore their budget range?", impact: 85 },
          { text: "⏰ Timeline check", prompt: "What should I ask about their implementation timeline?", impact: 80 }
        ],
        discussion: [
          { text: "💡 Present solution", prompt: "How should I position our solution for their needs?", impact: 90 },
          { text: "🛡️ Handle objections", prompt: "How can I address their main concerns?", impact: 85 },
          { text: "📊 Show value", prompt: "What ROI examples should I share?", impact: 80 }
        ],
        closing: [
          { text: "🎯 Close deal", prompt: "What closing technique should I use now?", impact: 90 },
          { text: "📅 Next steps", prompt: "How should I establish clear next steps?", impact: 85 },
          { text: "📋 Follow-up plan", prompt: "What follow-up should I commit to?", impact: 80 }
        ]
      },
      meeting: {
        opening: [
          { text: "📋 Set agenda", prompt: "How should I structure this meeting?", impact: 90 },
          { text: "🎯 Clarify goals", prompt: "How can I ensure everyone understands our objectives?", impact: 85 },
          { text: "⏰ Time management", prompt: "How should I manage our time effectively?", impact: 80 }
        ],
        discovery: [
          { text: "💭 Gather input", prompt: "How can I encourage more participation?", impact: 90 },
          { text: "🔍 Explore ideas", prompt: "What questions will help us explore this topic deeper?", impact: 85 },
          { text: "📝 Capture insights", prompt: "What key points should I be documenting?", impact: 80 }
        ],
        discussion: [
          { text: "⚖️ Facilitate decisions", prompt: "How can I help the group reach a decision?", impact: 90 },
          { text: "🎯 Stay focused", prompt: "How do I bring the discussion back on track?", impact: 85 },
          { text: "👥 Include everyone", prompt: "How can I ensure all voices are heard?", impact: 80 }
        ],
        closing: [
          { text: "📋 Summarize actions", prompt: "What action items should I confirm?", impact: 90 },
          { text: "📅 Schedule follow-up", prompt: "What follow-up meetings do we need?", impact: 85 },
          { text: "📤 Share notes", prompt: "How should I distribute the meeting summary?", impact: 80 }
        ]
      }
    };

    return fallbackMap[type]?.[stage] || fallbackMap.meeting[stage] || [];
  };

  const useSuggestion = async (suggestion: SuggestionChip) => {
    if (!suggestion.prompt) return;

    try {
      // Mark as used (visual feedback)
      setSuggestions(prev => 
        prev.map(s => s.text === suggestion.text ? { ...s, isUsed: true } : s)
      );

      // Dispatch event to trigger AI chat with the suggestion
      const event = new CustomEvent('useSuggestion', {
        detail: {
          suggestion: suggestion.prompt,
          chipText: suggestion.text
        }
      });
      window.dispatchEvent(event);

      console.log('💡 Using suggestion:', suggestion.prompt);
    } catch (error) {
      console.error('Error using suggestion:', error);
    }
  };

  const sendToSmartNotes = async (suggestion: SuggestionChip, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the useSuggestion click

    try {
      // Create smart note object
      const smartNote = {
        id: `suggestion-${Date.now()}`,
        category: (suggestion as any).category || 'key_point',
        content: `${suggestion.text}: ${suggestion.prompt}`,
        importance: (suggestion as any).priority || 'medium',
        timestamp: new Date().toISOString()
      };

      // Dispatch event to add smart note through the meeting context
      const event = new CustomEvent('addSmartNote', {
        detail: smartNote
      });
      window.dispatchEvent(event);

      toast.success('Added to Smart Notes');
      console.log('✅ Sent to smart notes:', suggestion.text);
    } catch (error) {
      console.error('Error sending to smart notes:', error);
      toast.error('Failed to add to smart notes');
    }
  };

  const copyToClipboard = async (suggestion: SuggestionChip, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the useSuggestion click

    try {
      const textToCopy = `${suggestion.text}\n\n${suggestion.prompt}`;
      await navigator.clipboard.writeText(textToCopy);
      toast.success('Copied to clipboard');
      console.log('📋 Copied to clipboard:', suggestion.text);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const displaySuggestions = suggestions.length > 0 ? suggestions : getFallbackSuggestions();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LightBulbIcon className="w-4 h-4 text-amber-500" />
            <h3 className="font-medium text-sm">Smart Suggestions</h3>
          </div>
          <div className="flex items-center gap-2">
            {loading && <ArrowPathIcon className="w-4 h-4 animate-spin text-muted-foreground" />}
            <button
              onClick={generateSuggestions}
              disabled={loading}
              className="p-1 hover:bg-muted rounded text-xs disabled:opacity-50"
              title="Refresh suggestions"
            >
              <ArrowPathIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {transcript.length === 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Start the meeting to get contextual suggestions
          </p>
        )}

        {error && (
          <div className="mt-2 p-2 bg-destructive/10 text-destructive text-xs rounded border border-destructive/20">
            {error}
          </div>
        )}
      </div>

      {/* Suggestions List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          <AnimatePresence>
            {displaySuggestions.map((suggestion, index) => (
              <motion.div
                key={`${suggestion.text}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className={`group relative p-3 rounded-lg border transition-all hover:shadow-sm ${
                  (suggestion as any).isUsed 
                    ? 'bg-muted/50 border-muted text-muted-foreground'
                    : 'bg-card border-border hover:border-primary/50 hover:bg-card/80'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div 
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs cursor-pointer ${
                        (suggestion as any).isUsed
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                      }`}
                      onClick={() => useSuggestion(suggestion)}
                    >
                      {(suggestion as any).isUsed ? (
                        <CheckCircleIcon className="w-4 h-4" />
                      ) : (
                        <PlayIcon className="w-3 h-3" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => useSuggestion(suggestion)}>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">
                        {suggestion.text}
                      </h4>
                      {suggestion.impact && (
                        <span className="text-xs text-muted-foreground">
                          {suggestion.impact}%
                        </span>
                      )}
                    </div>
                    
                    {suggestion.prompt && (
                      <p className="text-xs text-muted-foreground line-clamp-4">
                        {suggestion.prompt}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0 flex items-center gap-1">
                    <button
                      onClick={(e) => copyToClipboard(suggestion, e)}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title="Copy to clipboard"
                    >
                      <ClipboardIcon className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </button>
                    <button
                      onClick={(e) => sendToSmartNotes(suggestion, e)}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title="Send to Smart Notes"
                    >
                      <BookmarkIcon className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </button>
                    <ArrowRightIcon className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${
                      (suggestion as any).isUsed ? 'text-muted-foreground' : 'text-muted-foreground'
                    }`} />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {displaySuggestions.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <LightBulbIcon className="w-8 h-8 text-muted-foreground mb-3" />
            <h4 className="font-medium text-sm mb-1">No Suggestions Yet</h4>
            <p className="text-xs text-muted-foreground mb-4">
              {transcript.length === 0 
                ? 'Start recording to get smart suggestions'
                : 'Continue the conversation to get contextual advice'
              }
            </p>
            {transcript.length > 0 && (
              <button
                onClick={generateSuggestions}
                disabled={loading}
                className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                Generate Suggestions
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex-shrink-0 p-3 border-t border-border bg-muted/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {botStatus?.status === 'in_call' ? (
              <>
                <div className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                Live suggestions
              </>
            ) : (
              'Ready for suggestions'
            )}
          </span>
          <span>{displaySuggestions.length} suggestions</span>
        </div>
      </div>
    </div>
  );
} 