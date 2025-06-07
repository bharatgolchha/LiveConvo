import React, { useState, useEffect, useRef } from 'react';
import { FileText, User, Bot, Clock } from 'lucide-react';

interface TranscriptViewProps {
  session: any;
}

interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: Date;
  confidence?: number;
}

export function TranscriptView({ session }: TranscriptViewProps) {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    // Initial load
    loadTranscripts();

    // Poll for updates while session is active
    const interval = setInterval(loadTranscripts, 2000);
    return () => clearInterval(interval);
  }, [session.id]);

  useEffect(() => {
    if (autoScroll) {
      transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts, autoScroll]);

  const loadTranscripts = async () => {
    try {
      const response = await fetch(`https://liveprompt.ai/api/sessions/${session.id}/transcript`);
      if (response.ok) {
        const data = await response.json();
        if (data.entries) {
          setTranscripts(data.entries);
        }
      }
    } catch (error) {
      console.error('Failed to load transcripts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSpeakerIcon = (speaker: string) => {
    return speaker.toLowerCase().includes('ai') || speaker.toLowerCase().includes('assistant')
      ? <Bot className="h-4 w-4" />
      : <User className="h-4 w-4" />;
  };

  const getSpeakerColor = (speaker: string) => {
    return speaker.toLowerCase().includes('ai') || speaker.toLowerCase().includes('assistant')
      ? 'text-primary-600 dark:text-primary-400'
      : 'text-gray-600 dark:text-gray-400';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-3"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading transcript...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Live Transcript
          </span>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="w-4 h-4 text-primary-600 rounded"
          />
          <span className="text-gray-600 dark:text-gray-400">Auto-scroll</span>
        </label>
      </div>

      {/* Transcript Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {transcripts.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Transcript will appear here as the conversation progresses
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Make sure recording is active
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transcripts.map((entry) => (
              <div
                key={entry.id}
                className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${getSpeakerColor(entry.speaker)}`}>
                    {getSpeakerIcon(entry.speaker)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className={`text-sm font-medium ${getSpeakerColor(entry.speaker)}`}>
                        {entry.speaker}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {entry.timestamp.toLocaleTimeString()}
                      </span>
                      {entry.confidence && entry.confidence < 0.8 && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          Low confidence
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {entry.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>{transcripts.length} entries</span>
          <span>Session: {session.id.slice(0, 8)}...</span>
        </div>
      </div>
    </div>
  );
}