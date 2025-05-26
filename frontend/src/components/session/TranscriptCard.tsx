'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Clock } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { AudioCapture } from './AudioCapture';
import { RealtimeAudioCapture } from './RealtimeAudioCapture';

interface TranscriptLine {
  id: string;
  text: string;
  timestamp: Date;
  speaker?: string;
}

interface TranscriptCardProps {
  transcript: TranscriptLine[];
  isRecording: boolean;
  useLiveTranscription?: boolean;
  onTranscript: (text: string) => void;
  onLiveTranscript: (text: string, speaker?: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export function TranscriptCard({
  transcript,
  isRecording,
  useLiveTranscription = true,
  onTranscript,
  onLiveTranscript,
  onStartRecording,
  onStopRecording
}: TranscriptCardProps) {
  const getSpeakerColor = (speaker?: string) => {
    switch (speaker) {
      case 'Voice 1':
        return {
          border: 'border-blue-500',
          text: 'text-blue-600',
          label: '🎤 Voice 1 (You)'
        };
      case 'Voice 2':
        return {
          border: 'border-green-500',
          text: 'text-green-600',
          label: '🖥️ Voice 2 (System)'
        };
      default:
        return {
          border: 'border-gray-500',
          text: 'text-gray-600',
          label: speaker || 'Unknown'
        };
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-600" />
            Live Transcript
          </div>
          {transcript.length > 0 && (
            <span className="text-xs text-gray-500">
              {transcript.length} lines
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {/* Audio Capture Controls */}
        <div className="mb-6">
          {useLiveTranscription ? (
            <RealtimeAudioCapture
              onTranscript={onLiveTranscript}
              onStart={onStartRecording}
              onStop={onStopRecording}
            />
          ) : (
            <AudioCapture
              onTranscript={onTranscript}
              onStart={onStartRecording}
              onStop={onStopRecording}
            />
          )}
        </div>

        {/* Transcript Display */}
        <div className="flex-1 overflow-y-auto space-y-3 max-h-[400px]">
          {transcript.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Start recording to see live transcript</p>
              <p className="text-xs mt-2 opacity-75">
                Speech will be transcribed in real-time with speaker identification
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {transcript.map((line) => {
                const speakerStyle = getSpeakerColor(line.speaker);
                return (
                  <motion.div
                    key={line.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className={`p-3 bg-gray-50 rounded-lg border-l-4 ${speakerStyle.border} hover:bg-gray-100 transition-colors`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className={`text-xs font-medium ${speakerStyle.text}`}>
                        {speakerStyle.label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {line.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 leading-relaxed">{line.text}</p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Transcript Statistics */}
        {transcript.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 pt-4 border-t border-gray-100"
          >
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Total words: {transcript.reduce((acc, line) => acc + line.text.split(' ').length, 0)}</span>
              <span>
                Last update: {transcript[transcript.length - 1]?.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit'
                })}
              </span>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
} 