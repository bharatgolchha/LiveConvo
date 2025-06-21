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
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';

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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdateLength, setLastUpdateLength] = useState(0);

  // Generate suggestions based on transcript changes
  useEffect(() => {
    const shouldUpdate = transcript.length > 0 && 
                        transcript.length !== lastUpdateLength &&
                        transcript.length % 5 === 0; // Update every 5 new messages

    if (shouldUpdate && botStatus?.status === 'in_call') {
      generateSuggestions();
      setLastUpdateLength(transcript.length);
    }
  }, [transcript.length, lastUpdateLength, botStatus?.status]);

  const generateSuggestions = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const recentTranscript = transcript.slice(-10).map(t => ({
        speaker: t.displayName || t.speaker,
        text: t.text
      }));

      const response = await fetch('/api/chat-guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Generate 3 contextual suggestions based on the current conversation',
          sessionId: meeting?.id,
          conversationType: meeting?.type || 'meeting',
          stage: getConversationStage(),
          recentTranscript,
          isRecording: true,
          transcriptLength: transcript.length
        })
      });

      if (response.ok) {
        const { suggestions: newSuggestions } = await response.json();
        if (newSuggestions && Array.isArray(newSuggestions)) {
          setSuggestions(prev => [...newSuggestions, ...prev].slice(0, 10)); // Keep max 10
        }
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConversationStage = () => {
    // Simple heuristic to determine conversation stage
    const length = transcript.length;
    if (length < 5) return 'opening';
    if (length < 15) return 'discovery';
    if (length < 30) return 'discussion';
    return 'closing';
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'question': return ChatBubbleLeftRightIcon;
      case 'action': return ArrowRightIcon;
      case 'warning': return ExclamationTriangleIcon;
      case 'tip': return LightBulbIcon;
      default: return SparklesIcon;
    }
  };

  const getSuggestionColor = (type: string, priority: string) => {
    if (type === 'warning') return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800';
    if (priority === 'high') return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
    if (priority === 'medium') return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800';
    return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
  };

  const useSuggestion = async (suggestion: Suggestion) => {
    if (suggestion.prompt) {
      // Trigger AI chat with the suggestion prompt
      try {
        const response = await fetch('/api/chat-guidance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: suggestion.prompt,
            sessionId: meeting?.id,
            conversationType: meeting?.type || 'meeting',
            recentTranscript: transcript.slice(-20).map(t => ({
              speaker: t.displayName || t.speaker,
              text: t.text
            }))
          })
        });

        if (response.ok) {
          // Mark as used
          setSuggestions(prev => 
            prev.map(s => s.id === suggestion.id ? { ...s, isUsed: true } : s)
          );
        }
      } catch (error) {
        console.error('Error using suggestion:', error);
      }
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Default suggestions when no transcript yet
  const defaultSuggestions: Suggestion[] = [
    {
      id: 'default-1',
      type: 'tip',
      title: 'Start with an icebreaker',
      description: 'Open with a warm greeting and agenda overview',
      prompt: 'What\'s a good way to start this meeting?',
      priority: 'medium',
      timestamp: new Date().toISOString()
    },
    {
      id: 'default-2',
      type: 'question',
      title: 'Clarify objectives',
      description: 'Ensure everyone understands the meeting goals',
      prompt: 'How can I clarify the meeting objectives?',
      priority: 'high',
      timestamp: new Date().toISOString()
    },
    {
      id: 'default-3',
      type: 'action',
      title: 'Set expectations',
      description: 'Establish ground rules and time boundaries',
      prompt: 'What expectations should I set for this meeting?',
      priority: 'medium',
      timestamp: new Date().toISOString()
    }
  ];

  const displaySuggestions = suggestions.length > 0 ? suggestions : defaultSuggestions;

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
              disabled={loading || transcript.length === 0}
              className="p-1 hover:bg-muted rounded text-xs disabled:opacity-50"
              title="Refresh suggestions"
            >
              <ArrowPathIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {transcript.length === 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Default suggestions shown. Start recording for contextual recommendations.
          </p>
        )}
      </div>

      {/* Suggestions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence>
          {displaySuggestions.map((suggestion, index) => {
            const Icon = getSuggestionIcon(suggestion.type);
            return (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className={`relative p-4 rounded-lg border transition-all hover:shadow-sm ${
                  suggestion.isUsed 
                    ? 'bg-muted/50 border-border opacity-75' 
                    : `${getSuggestionColor(suggestion.type, suggestion.priority)} hover:shadow-md cursor-pointer`
                }`}
                onClick={() => !suggestion.isUsed && useSuggestion(suggestion)}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 p-2 rounded-md ${
                    suggestion.isUsed ? 'bg-muted' : 'bg-white/80 dark:bg-black/20'
                  }`}>
                    {suggestion.isUsed ? (
                      <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm truncate">
                        {suggestion.title}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        suggestion.priority === 'high' 
                          ? 'bg-red-100 dark:bg-red-950/20 text-red-700 dark:text-red-400'
                          : suggestion.priority === 'medium'
                          ? 'bg-yellow-100 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400'
                          : 'bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400'
                      }`}>
                        {suggestion.priority}
                      </span>
                    </div>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                      {suggestion.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        <span>{formatTime(suggestion.timestamp)}</span>
                      </div>
                      
                      {!suggestion.isUsed && suggestion.prompt && (
                        <span className="flex items-center gap-1 text-primary">
                          <span>Click to explore</span>
                          <ArrowRightIcon className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {suggestion.isUsed && (
                  <div className="absolute top-2 right-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {displaySuggestions.length === 0 && !loading && (
          <div className="text-center py-8">
            <LightBulbIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No suggestions available yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Start your recording to get contextual recommendations
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex-shrink-0 p-4 border-t border-border bg-card/50">
        <div className="flex gap-2">
          <button
            onClick={generateSuggestions}
            disabled={loading}
            className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-all"
          >
            {loading ? 'Generating...' : 'Get More Suggestions'}
          </button>
        </div>
      </div>
    </div>
  );
} 