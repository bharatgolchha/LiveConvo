import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

interface NotionAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (notionToken: string, databaseId?: string) => Promise<void>;
}

export function NotionAuthModal({ isOpen, onClose, onExport }: NotionAuthModalProps) {
  const [notionToken, setNotionToken] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'auth' | 'database'>('auth');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!notionToken.trim()) {
      setError('Please enter your Notion integration token');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      await onExport(notionToken.trim());
      onClose();
      // Reset state
      setNotionToken('');
      setStep('auth');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to export to Notion');
    } finally {
      setIsValidating(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state when modal closes
    setNotionToken('');
    setError('');
    setStep('auth');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card rounded-2xl p-6 w-full max-w-md border border-border shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.327-1.635.047l-7.504-5.96s-.56-.42-.127-.933L16.22 7.841c.28-.42.747-.42.887-.42.374 0 .793.28.934.606z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Connect to Notion</h2>
                <p className="text-sm text-muted-foreground">Export your meeting summary to Notion</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Instructions */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-medium text-blue-900 dark:text-blue-100">Setup Instructions</h3>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
                    <li>Go to <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">notion.so/my-integrations <ArrowTopRightOnSquareIcon className="w-3 h-3" /></a></li>
                    <li>Create a new integration and copy the token</li>
                    <li>Share your target page/database with the integration</li>
                    <li>Paste the integration token below</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Token Input */}
            <div className="space-y-2">
              <label htmlFor="notion-token" className="block text-sm font-medium text-foreground">
                Integration Token
              </label>
              <div className="relative">
                <KeyIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="notion-token"
                  type="password"
                  value={notionToken}
                  onChange={(e) => setNotionToken(e.target.value)}
                  placeholder="secret_..."
                  className="w-full pl-10 pr-4 py-3 border border-border rounded-xl bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={isValidating}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Your token starts with "secret_" and is stored securely for this session only
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-3 border border-border rounded-xl text-foreground hover:bg-muted transition-colors"
                disabled={isValidating}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!notionToken.trim() || isValidating}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
              >
                {isValidating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    Export to Notion
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              🔒 Your Notion token is not stored and is only used for this export session
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 