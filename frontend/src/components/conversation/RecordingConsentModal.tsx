'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  Mic,
  Shield,
  X,
  CheckCircle
} from 'lucide-react';

interface RecordingConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRecording: () => void;
  conversationTitle: string;
}

export const RecordingConsentModal: React.FC<RecordingConsentModalProps> = ({
  isOpen,
  onClose,
  onStartRecording,
  conversationTitle
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl"
        >
          <Card className="border-2 shadow-2xl">
            <CardHeader className="pb-2 relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="absolute top-4 right-4 h-8 w-8 p-0 z-10"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <CardContent className="text-center space-y-8 py-8">
              {/* Main message */}
              <div className="space-y-4">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
                  <Mic className="w-10 h-10 text-red-600" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">Ready to Record?</h2>
                  <p className="text-muted-foreground text-lg max-w-md mx-auto">
                    You'll need to share your tab and grant microphone access to capture both sides of the conversation.
                  </p>
                </div>
              </div>

              {/* Key points */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 max-w-lg mx-auto">
                <p className="text-amber-800 dark:text-amber-200 font-medium">
                  <strong>Important:</strong> Please ensure all participants know this conversation will be recorded.
                </p>
              </div>

              {/* Privacy assurance */}
              <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                <Shield className="w-4 h-4 text-green-600" />
                <span>All recordings are encrypted and private to you</span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-4 pt-4 max-w-sm mx-auto">
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="lg"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    onClose();
                    onStartRecording();
                  }}
                  size="lg"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Start Recording
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}; 