'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { 
  X, 
  CalendarCheck, 
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface CalendarPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  provider: 'google' | 'outlook';
}

export const CalendarPermissionModal: React.FC<CalendarPermissionModalProps> = ({
  isOpen,
  onClose,
  onContinue,
  provider
}) => {
  if (!isOpen) return null;

  const providerName = provider === 'google' ? 'Google' : 'Outlook';

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
          className="w-full max-w-lg"
        >
          <Card className="border-2 shadow-2xl">
            <CardHeader className="pb-4">
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-3 top-3"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <CalendarCheck className="h-6 w-6 text-primary" />
                Calendar Permission Required
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-5 pb-6">
              {/* Google OAuth Screenshot */}
              <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <img 
                  src="/calendar-permission-small.png" 
                  alt="Calendar Permission" 
                  className="w-full h-auto"
                />
              </div>

              {/* Key benefits - very concise */}
              <div className="space-y-3">
                <div className="flex gap-3 items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-base">Auto-join meetings when they start</p>
                </div>
                <div className="flex gap-3 items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p className="text-base">Get real-time AI assistance during calls</p>
                </div>
              </div>

              {/* Auto-join reminder */}
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <span className="font-medium">Remember:</span> Enable &quot;Auto-join meetings&quot; after connecting
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={onContinue}
                  className="flex-1"
                >
                  Continue with {providerName}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};