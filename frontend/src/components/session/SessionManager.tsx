'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw,
  Download,
  Save,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

interface SessionManagerProps {
  isRecording: boolean;
  sessionDuration: number;
  transcriptLength: number;
  guidanceCount: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording?: () => void;
  onResetSession?: () => void;
  onSaveSession?: () => void;
  onExportSession?: () => void;
}

export function SessionManager({
  isRecording,
  sessionDuration,
  transcriptLength,
  guidanceCount,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResetSession,
  onSaveSession,
  onExportSession
}: SessionManagerProps) {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateTalkRatio = () => {
    // This would be calculated based on actual speaker distribution
    // For now, returning a placeholder
    return transcriptLength > 0 ? Math.round(Math.random() * 40 + 30) : 0;
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Session Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Session Control</h3>
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-1"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs text-red-600 font-medium">LIVE</span>
                </motion.div>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {!isRecording ? (
                <Button 
                  onClick={onStartRecording} 
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-3 h-3 mr-1" />
                  Start
                </Button>
              ) : (
                <>
                  {onPauseRecording && (
                    <Button 
                      onClick={onPauseRecording} 
                      size="sm"
                      variant="outline"
                    >
                      <Pause className="w-3 h-3" />
                    </Button>
                  )}
                  <Button 
                    onClick={onStopRecording} 
                    size="sm"
                    variant="destructive"
                  >
                    <Square className="w-3 h-3 mr-1" />
                    Stop
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Session Statistics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-center">
            <div className="space-y-1">
              <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDuration(sessionDuration)}
              </div>
              <div className="text-xs text-muted-foreground">Duration</div>
            </div>
            
            <div className="space-y-1">
              <div className="text-lg font-bold text-green-600">{transcriptLength}</div>
              <div className="text-xs text-muted-foreground">Transcript Lines</div>
            </div>
            
            <div className="space-y-1">
              <div className="text-lg font-bold text-purple-600">{guidanceCount}</div>
              <div className="text-xs text-muted-foreground">AI Suggestions</div>
            </div>
            
            <div className="space-y-1">
              <div className="text-lg font-bold text-orange-600">{calculateTalkRatio()}%</div>
              <div className="text-xs text-muted-foreground">Your Talk Time</div>
            </div>
          </div>

          {/* Session Actions */}
          {(sessionDuration > 0 || transcriptLength > 0) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-2 pt-2 border-t border-border"
            >
              {onSaveSession && (
                <Button 
                  onClick={onSaveSession} 
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </Button>
              )}
              
              {onExportSession && (
                <Button 
                  onClick={onExportSession} 
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Export
                </Button>
              )}
              
              {onResetSession && (
                <Button 
                  onClick={onResetSession} 
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Reset
                </Button>
              )}
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 