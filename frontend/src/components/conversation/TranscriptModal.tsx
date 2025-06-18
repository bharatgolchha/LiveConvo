'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, User, Users, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';

interface TranscriptLine {
  id: string;
  text: string;
  timestamp: Date;
  speaker: 'ME' | 'THEM';
  confidence?: number;
}

interface TranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: TranscriptLine[];
  sessionDuration: number;
  conversationTitle: string;
  participantMe?: string;
  participantThem?: string;
}

export function TranscriptModal({
  isOpen,
  onClose,
  transcript,
  sessionDuration,
  conversationTitle,
  participantMe,
  participantThem
}: TranscriptModalProps) {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExportTranscript = () => {
    const transcriptText = transcript.map(line => 
      `[${line.timestamp.toLocaleTimeString()}] ${line.speaker === 'ME' ? (participantMe || 'You') : (participantThem || 'Them')}: ${line.text}`
    ).join('\n');
    
    const content = `${conversationTitle}\nDuration: ${formatDuration(sessionDuration)}\nGenerated: ${new Date().toLocaleString()}\n\n${transcriptText}`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conversationTitle.replace(/\s+/g, '_')}_transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSpeakerStats = () => {
    const myLines = transcript.filter(line => line.speaker === 'ME').length;
    const theirLines = transcript.filter(line => line.speaker === 'THEM').length;
    const myWords = transcript.filter(line => line.speaker === 'ME').reduce((acc, line) => acc + line.text.split(' ').length, 0);
    const theirWords = transcript.filter(line => line.speaker === 'THEM').reduce((acc, line) => acc + line.text.split(' ').length, 0);
    
    return { myLines, theirLines, myWords, theirWords };
  };

  const stats = getSpeakerStats();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
          >
            <Card className="bg-white dark:bg-gray-900 shadow-2xl border-0 dark:border dark:border-gray-700 w-full max-w-4xl max-h-[85vh] overflow-hidden">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    <div>
                      <CardTitle className="text-xl text-gray-900 dark:text-gray-100">{conversationTitle}</CardTitle>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>{formatDuration(sessionDuration)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span>{transcript.length} messages</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleExportTranscript}
                      variant="outline"
                      size="sm"
                      className="h-8"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button
                      onClick={onClose}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Stats */}
                {transcript.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">{participantMe || 'You'}:</span>
                      <Badge variant="secondary">{stats.myLines} messages</Badge>
                      <Badge variant="outline">{stats.myWords} words</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">{participantThem || 'Them'}:</span>
                      <Badge variant="secondary">{stats.theirLines} messages</Badge>
                      <Badge variant="outline">{stats.theirWords} words</Badge>
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent className="p-0 flex-1 min-h-0">
                <div className="h-[calc(85vh-200px)] overflow-y-auto">
                  {transcript.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                      <div className="text-center">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">No transcript available</p>
                        <p className="text-sm">Start recording to see the conversation transcript</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 p-4">
                      {transcript.map((line, index) => (
                        <motion.div
                          key={line.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(index * 0.02, 0.5) }}
                          className={`flex gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                            line.speaker === 'ME' 
                              ? 'bg-blue-50/50 dark:bg-blue-950/30' 
                              : 'bg-green-50/50 dark:bg-green-950/30'
                          }`}
                        >
                          <div className="flex-shrink-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                              line.speaker === 'ME' ? 'bg-blue-600 dark:bg-blue-500' : 'bg-green-600 dark:bg-green-500'
                            }`}>
                              {line.speaker === 'ME' ? (
                                <User className="h-4 w-4" />
                              ) : (
                                <Users className="h-4 w-4" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {line.speaker === 'ME' ? (participantMe || 'You') : (participantThem || 'Them')}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {line.timestamp.toLocaleTimeString()}
                              </span>
                              {line.confidence && line.confidence < 0.8 && (
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(line.confidence * 100)}% confidence
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-800 dark:text-gray-200 leading-relaxed">{line.text}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 