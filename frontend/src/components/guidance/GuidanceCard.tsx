'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Brain } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { GuidanceChip, GuidanceType } from './GuidanceChip';

interface Guidance {
  id: string;
  type: GuidanceType;
  message: string;
  confidence: number;
  timestamp: Date;
}

interface GuidanceCardProps {
  guidanceList: Guidance[];
  isGenerating: boolean;
  error?: string | null;
  isRecording: boolean;
  onGenerateGuidance: () => void;
  onDismissGuidance: (guidanceId: string) => void;
  onGuidanceFeedback: (guidanceId: string, helpful: boolean) => void;
  disabled?: boolean;
}

export function GuidanceCard({
  guidanceList,
  isGenerating,
  error,
  isRecording,
  onGenerateGuidance,
  onDismissGuidance,
  onGuidanceFeedback,
  disabled = false
}: GuidanceCardProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            AI Guidance
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateGuidance}
              disabled={disabled || isGenerating}
              className="text-xs"
            >
              <Brain className="w-3 h-3 mr-1" />
              {isGenerating ? 'Generating...' : 'Get Guidance'}
            </Button>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-xs text-gray-500">
                {isRecording ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
          >
            <p className="text-sm text-red-700">
              AI guidance temporarily unavailable: {error}
            </p>
          </motion.div>
        )}

        {/* Loading State */}
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-blue-700">Generating AI guidance...</p>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {guidanceList.length === 0 && !isGenerating && !error ? (
          <div className="text-center py-8 text-gray-500">
            <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">AI guidance will appear here during your conversation</p>
            {!isRecording && (
              <p className="text-xs mt-2 opacity-75">Start recording to get real-time suggestions</p>
            )}
          </div>
        ) : (
          /* Guidance List */
          <div className="space-y-4">
            <AnimatePresence>
              {guidanceList.map((guidance, index) => (
                <GuidanceChip
                  key={guidance.id}
                  type={guidance.type}
                  message={guidance.message}
                  confidence={guidance.confidence}
                  onDismiss={() => onDismissGuidance(guidance.id)}
                  onFeedback={(helpful) => onGuidanceFeedback(guidance.id, helpful)}
                  delay={index * 0.1}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 