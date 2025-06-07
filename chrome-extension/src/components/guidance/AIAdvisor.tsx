import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/common/Button';
import { ChatInterface } from '@/components/guidance/ChatInterface';
import { GuidanceChips } from '@/components/guidance/GuidanceChips';
import { 
  BrainCircuit, 
  MessageSquare, 
  Send, 
  AlertCircle,
  Sparkles,
  ChevronDown
} from 'lucide-react';

interface AIAdvisorProps {
  session: any;
}

interface Guidance {
  id: string;
  type: 'suggestion' | 'insight' | 'action';
  content: string;
  timestamp: Date;
  isImportant?: boolean;
}

export function AIAdvisor({ session }: AIAdvisorProps) {
  const [guidances, setGuidances] = useState<Guidance[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [autoGuidanceEnabled, setAutoGuidanceEnabled] = useState(true);
  const [lastTranscriptCheck, setLastTranscriptCheck] = useState<number>(0);
  const guidanceListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for new transcripts periodically and generate guidance
    if (!autoGuidanceEnabled) return;

    const checkForNewTranscripts = async () => {
      const now = Date.now();
      if (now - lastTranscriptCheck < 10000) return; // Check every 10 seconds

      setLastTranscriptCheck(now);
      
      // Get latest transcript
      const transcript = await getLatestTranscript(session.id);
      
      if (transcript && transcript.length > 100) {
        // Generate guidance based on recent conversation
        generateGuidance();
      }
    };

    const interval = setInterval(checkForNewTranscripts, 10000);
    return () => clearInterval(interval);
  }, [session, autoGuidanceEnabled, lastTranscriptCheck]);

  const getLatestTranscript = async (sessionId: string) => {
    try {
      const response = await fetch(`https://liveprompt.ai/api/sessions/${sessionId}/transcript`);
      if (response.ok) {
        const data = await response.json();
        return data.transcript;
      }
    } catch (error) {
      console.error('Failed to fetch transcript:', error);
    }
    return null;
  };

  const generateGuidance = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('https://liveprompt.ai/api/guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          conversationType: session.conversationType || 'general',
          context: session.context,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.guidance) {
          const newGuidance: Guidance = {
            id: Date.now().toString(),
            type: data.type || 'suggestion',
            content: data.guidance,
            timestamp: new Date(),
            isImportant: data.isImportant,
          };
          
          setGuidances(prev => [...prev, newGuidance]);
          
          // Auto-scroll to latest
          setTimeout(() => {
            guidanceListRef.current?.scrollTo({
              top: guidanceListRef.current.scrollHeight,
              behavior: 'smooth',
            });
          }, 100);
        }
      }
    } catch (error) {
      console.error('Failed to generate guidance:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualGuidance = () => {
    generateGuidance();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              AI Guidance
            </span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoGuidanceEnabled}
              onChange={(e) => setAutoGuidanceEnabled(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Auto-guidance
            </span>
          </label>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleManualGuidance}
            size="sm"
            variant="outline"
            disabled={isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary-500 mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <BrainCircuit className="h-3 w-3 mr-2" />
                Get Guidance
              </>
            )}
          </Button>
          <Button
            onClick={() => setShowChat(!showChat)}
            size="sm"
            variant={showChat ? 'primary' : 'outline'}
          >
            <MessageSquare className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Guidance List */}
      <div 
        ref={guidanceListRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {guidances.length === 0 ? (
          <div className="text-center py-8">
            <BrainCircuit className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AI guidance will appear here as your conversation progresses
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              {autoGuidanceEnabled ? 'Auto-guidance is enabled' : 'Click "Get Guidance" to start'}
            </p>
          </div>
        ) : (
          guidances.map((guidance) => (
            <div
              key={guidance.id}
              className={`p-3 rounded-lg transition-all ${
                guidance.isImportant
                  ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                  : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start gap-2">
                {guidance.isImportant && (
                  <AlertCircle className="h-4 w-4 text-primary-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {guidance.content}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {guidance.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Guidance Chips */}
      <GuidanceChips 
        sessionId={session.id}
        conversationType={session.conversationType}
      />

      {/* Chat Interface */}
      {showChat && (
        <div className="absolute inset-0 bg-white dark:bg-gray-900 z-10">
          <ChatInterface 
            sessionId={session.id}
            onClose={() => setShowChat(false)}
          />
        </div>
      )}
    </div>
  );
}