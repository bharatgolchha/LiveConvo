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
  PlayIcon
} from '@heroicons/react/24/outline';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';

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
  const { meeting, transcript, botStatus } = useMeetingContext();
  const [suggestions, setSuggestions] = useState<SuggestionChip[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdateLength, setLastUpdateLength] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Generate suggestions based on transcript changes
  useEffect(() => {
    const shouldUpdate = transcript.length > 0 && 
                        transcript.length !== lastUpdateLength &&
                        transcript.length % 10 === 0; // Update every 10 new messages

    if (shouldUpdate && botStatus?.status === 'in_call') {
      generateSuggestions();
      setLastUpdateLength(transcript.length);
    }
  }, [transcript.length, lastUpdateLength, botStatus?.status]);

  const generateSuggestions = async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Build recent transcript for context
      const recentTranscript = transcript.slice(-20).map(t => 
        `${t.displayName || t.speaker}: ${t.text}`
      ).join('\n');

      console.log('🔍 Generating suggestions with:', {
        transcriptLength: transcript.length,
        meetingType: meeting?.type,
        stage: getConversationStage()
      });

      const response = await fetch('/api/chat-guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Generate contextual suggestions',
          sessionId: meeting?.id,
          conversationType: meeting?.type || 'meeting',
          conversationTitle: meeting?.title,
          textContext: meeting?.context,
          transcript: recentTranscript,
          stage: getConversationStage(), // This triggers "chips mode"
          isRecording: true,
          transcriptLength: transcript.length,
          participantMe: meeting?.participantMe || 'You',
          participantThem: meeting?.participantThem || 'Participant'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📝 Suggestions response:', data);

      if (data.suggestedActions && Array.isArray(data.suggestedActions)) {
        setSuggestions(data.suggestedActions);
        console.log('✅ Suggestions updated:', data.suggestedActions.length);
      } else {
        console.warn('⚠️ No suggestions in response:', data);
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

      // This could trigger the AI chat with the suggestion prompt
      // For now, we'll just log it
      console.log('💡 Using suggestion:', suggestion.prompt);
      
      // You could integrate this with the AI chat component
      // by dispatching an event or calling a callback
    } catch (error) {
      console.error('Error using suggestion:', error);
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
                className={`group relative p-3 rounded-lg border transition-all cursor-pointer hover:shadow-sm ${
                  (suggestion as any).isUsed 
                    ? 'bg-muted/50 border-muted text-muted-foreground'
                    : 'bg-card border-border hover:border-primary/50 hover:bg-card/80'
                }`}
                onClick={() => useSuggestion(suggestion)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      (suggestion as any).isUsed
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {(suggestion as any).isUsed ? (
                        <CheckCircleIcon className="w-4 h-4" />
                      ) : (
                        <PlayIcon className="w-3 h-3" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
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
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {suggestion.prompt}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0">
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