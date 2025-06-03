import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

// ... existing imports and types ...

interface SmartTriggerConfig {
  // Content-based triggers
  minNewLines: number;           // Minimum new lines (default: 10)
  minNewWords: number;           // Minimum new words (default: 20)
  significantPause: number;      // Pause in conversation (ms) (default: 10000)
  
  // Time-based triggers
  minInterval: number;           // Minimum time between updates (default: 20000)
  maxInterval: number;           // Maximum time between updates (default: 60000)
  
  // Quality triggers
  keywordTriggers: string[];     // Important keywords that trigger update
  speakerChangeWeight: number;   // Weight for speaker changes (default: 2)
  questionWeight: number;        // Weight for questions (default: 3)
}

export function useRealtimeSummaryV2({
  transcript,
  sessionId,
  conversationType = 'general',
  isRecording,
  isPaused = false,
  config = {}
}: UseRealtimeSummaryProps & { config?: Partial<SmartTriggerConfig> }) {
  // Merge with defaults
  const triggerConfig: SmartTriggerConfig = {
    minNewLines: 10,
    minNewWords: 20,
    significantPause: 10000,
    minInterval: 20000,
    maxInterval: 60000,
    keywordTriggers: ['decision', 'action item', 'next step', 'important', 'deadline', 'budget'],
    speakerChangeWeight: 2,
    questionWeight: 3,
    ...config
  };

  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tracking refs
  const lastUpdateTime = useRef<number>(0);
  const lastTranscriptSnapshot = useRef<string>('');
  const conversationPauseTimer = useRef<NodeJS.Timeout | null>(null);
  const updateTimer = useRef<NodeJS.Timeout | null>(null);
  const contentWeight = useRef<number>(0);
  const lastSpeaker = useRef<string>('');

  // Calculate content weight for smart triggering
  const calculateContentWeight = useCallback((newContent: string): number => {
    let weight = 0;
    
    // Check for keywords
    const lowerContent = newContent.toLowerCase();
    triggerConfig.keywordTriggers.forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        weight += 5;
      }
    });
    
    // Check for questions
    const questionMarks = (newContent.match(/\?/g) || []).length;
    weight += questionMarks * triggerConfig.questionWeight;
    
    // Check for speaker changes
    const lines = newContent.split('\n');
    let speakerChanges = 0;
    lines.forEach(line => {
      const speaker = line.split(':')[0];
      if (speaker && speaker !== lastSpeaker.current) {
        speakerChanges++;
        lastSpeaker.current = speaker;
      }
    });
    weight += speakerChanges * triggerConfig.speakerChangeWeight;
    
    // Add word count weight
    const wordCount = newContent.trim().split(/\s+/).length;
    weight += wordCount / 10;
    
    return weight;
  }, [triggerConfig]);

  // Smart trigger decision
  const shouldTriggerUpdate = useCallback((): boolean => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTime.current;
    
    // Respect minimum interval
    if (timeSinceLastUpdate < triggerConfig.minInterval) {
      return false;
    }
    
    // Force update at maximum interval
    if (timeSinceLastUpdate >= triggerConfig.maxInterval) {
      console.log('🚀 Max interval reached, forcing update');
      return true;
    }
    
    // Get new content since last update
    const newContent = transcript.slice(lastTranscriptSnapshot.current.length);
    if (!newContent.trim()) return false;
    
    // Calculate metrics
    const newLines = newContent.split('\n').filter(line => line.trim()).length;
    const newWords = newContent.trim().split(/\s+/).length;
    const weight = calculateContentWeight(newContent);
    
    // Update cumulative weight
    contentWeight.current += weight;
    
    // Check various triggers
    if (newLines >= triggerConfig.minNewLines) {
      console.log(`📊 Line threshold met: ${newLines} new lines`);
      return true;
    }
    
    if (newWords >= triggerConfig.minNewWords) {
      console.log(`📊 Word threshold met: ${newWords} new words`);
      return true;
    }
    
    if (contentWeight.current >= 15) {
      console.log(`📊 Content weight threshold met: ${contentWeight.current}`);
      return true;
    }
    
    return false;
  }, [transcript, triggerConfig, calculateContentWeight]);

  // Incremental summary generation
  const generateIncrementalSummary = useCallback(async () => {
    if (!transcript || transcript.trim().split(/\s+/).length < 40) {
      return;
    }

    const newContent = transcript.slice(lastTranscriptSnapshot.current.length);
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Send both previous summary and new content for incremental update
      const response = await fetch('/api/summary-v3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          previousSummary: summary,
          newTranscript: newContent,
          fullTranscript: transcript, // Fallback for context
          sessionId,
          conversationType,
          updateType: 'incremental'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate summary: ${response.status}`);
      }

      const data = await response.json();
      
      // Update state
      setSummary(data.summary);
      lastUpdateTime.current = Date.now();
      lastTranscriptSnapshot.current = transcript;
      contentWeight.current = 0; // Reset weight after update
      
      // Subtle notification
      toast.success('Summary updated', {
        description: 'AI has analyzed recent conversation',
        duration: 2000
      });
      
    } catch (err) {
      console.error('Summary generation error:', err);
      setError('Failed to update summary');
    } finally {
      setIsLoading(false);
    }
  }, [transcript, summary, sessionId, conversationType]);

  // Handle conversation pauses
  useEffect(() => {
    if (!isRecording || isPaused) return;

    // Clear existing pause timer
    if (conversationPauseTimer.current) {
      clearTimeout(conversationPauseTimer.current);
    }

    // Set new pause timer
    conversationPauseTimer.current = setTimeout(() => {
      console.log('🔕 Significant pause detected, updating summary');
      generateIncrementalSummary();
    }, triggerConfig.significantPause);

    return () => {
      if (conversationPauseTimer.current) {
        clearTimeout(conversationPauseTimer.current);
      }
    };
  }, [transcript, isRecording, isPaused, triggerConfig.significantPause, generateIncrementalSummary]);

  // Smart update check
  useEffect(() => {
    if (!isRecording || isPaused) return;

    // Clear existing timer
    if (updateTimer.current) {
      clearInterval(updateTimer.current);
    }

    // Check for updates every 5 seconds
    updateTimer.current = setInterval(() => {
      if (shouldTriggerUpdate()) {
        generateIncrementalSummary();
      }
    }, 5000);

    return () => {
      if (updateTimer.current) {
        clearInterval(updateTimer.current);
      }
    };
  }, [isRecording, isPaused, shouldTriggerUpdate, generateIncrementalSummary]);

  // Manual refresh with debounce
  const refreshSummary = useCallback(() => {
    const now = Date.now();
    if (now - lastUpdateTime.current < 5000) {
      toast.error('Please wait a moment before refreshing again');
      return;
    }
    generateIncrementalSummary();
  }, [generateIncrementalSummary]);

  return {
    summary,
    isLoading,
    error,
    refreshSummary,
    lastUpdated: lastUpdateTime.current ? new Date(lastUpdateTime.current) : null,
    getTimeUntilNextRefresh: () => {
      if (!isRecording || isPaused) return 0;
      const timeSinceLastUpdate = Date.now() - lastUpdateTime.current;
      return Math.max(0, triggerConfig.maxInterval - timeSinceLastUpdate);
    }
  };
}