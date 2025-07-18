'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShareIcon, 
  UserGroupIcon, 
  UserIcon,
  ClockIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import type { Session } from '@/lib/hooks/useSessions';

interface ShareMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session;
  onShare: () => void;
}

type ShareType = 'individual' | 'organization';
type ExpiresIn = 'never' | '24hours' | '7days' | '30days';

export const ShareMeetingModal: React.FC<ShareMeetingModalProps> = ({ 
  isOpen, 
  onClose, 
  session,
  onShare 
}) => {
  const { session: authSession, user } = useAuth();
  const [shareType, setShareType] = useState<ShareType>('individual');
  const [emailInput, setEmailInput] = useState('');
  const [userEmails, setUserEmails] = useState<string[]>([]);
  const [expiresIn, setExpiresIn] = useState<ExpiresIn>('never');
  const [message, setMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [emailValidationError, setEmailValidationError] = useState<string | null>(null);

  const handleAddEmail = async () => {
    const trimmedEmail = emailInput.trim();
    setEmailValidationError(null);
    
    if (!trimmedEmail) return;
    
    if (!isValidEmail(trimmedEmail)) {
      setEmailValidationError('Please enter a valid email address');
      return;
    }
    
    if (userEmails.includes(trimmedEmail)) {
      setEmailValidationError('This email has already been added');
      return;
    }
    
    // Check if email exists in the system
    setIsValidatingEmail(true);
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (authSession?.access_token) {
        headers['Authorization'] = `Bearer ${authSession.access_token}`;
      }
      
      const response = await fetch('/api/users/validate-email', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: trimmedEmail })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setEmailValidationError('Failed to validate email');
        return;
      }
      
      if (!data.exists) {
        setEmailValidationError('No account found with this email address');
        return;
      }
      
      // Email is valid and exists
      setUserEmails([...userEmails, trimmedEmail]);
      setEmailInput('');
      setError(null);
      setEmailValidationError(null);
      
    } catch (err) {
      console.error('Error validating email:', err);
      setEmailValidationError('Failed to validate email');
    } finally {
      setIsValidatingEmail(false);
    }
  };

  const handleRemoveEmail = (email: string) => {
    setUserEmails(userEmails.filter(e => e !== email));
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleShare = async () => {
    setIsSharing(true);
    setError(null);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (authSession?.access_token) {
        headers['Authorization'] = `Bearer ${authSession.access_token}`;
      }

      const body: any = {
        shareType,
        message,
        expiresIn,
        permissions: {
          view: true,
          useAsContext: true
        }
      };

      if (shareType === 'individual') {
        if (userEmails.length === 0) {
          setError('Please add at least one email address');
          setIsSharing(false);
          return;
        }
        body.userEmails = userEmails;
      } else {
        body.visibility = 'organization';
      }

      const response = await fetch(`/api/meetings/${session.id}/share`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to share meeting');
      }

      setSuccess(true);
      setTimeout(() => {
        onShare();
        onClose();
        setUserEmails([]);
        setMessage('');
        setExpiresIn('never');
        setSuccess(false);
      }, 2000);

    } catch (err) {
      console.error('Error sharing meeting:', err);
      setError(err instanceof Error ? err.message : 'Failed to share meeting');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal - Optimized for mobile */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-4"
          >
            <div
              className="bg-background rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[90vh] sm:max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle for mobile */}
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
              </div>

              {/* Header - Fixed */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border flex-shrink-0">
                <h2 className="text-lg sm:text-xl font-semibold text-foreground">Share Meeting</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-accent transition-colors"
                  aria-label="Close"
                >
                  <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                <div className="space-y-4 sm:space-y-5">
                  {/* Share Type Selection - Compact on mobile */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">
                      Share with
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <button
                        onClick={() => setShareType('individual')}
                        className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                          shareType === 'individual'
                            ? 'border-app-primary bg-app-primary/10'
                            : 'border-border hover:border-muted-foreground'
                        }`}
                      >
                        <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2" />
                        <p className="font-medium text-sm sm:text-base">Specific People</p>
                        <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">
                          Share with individual users
                        </p>
                      </button>
                      <button
                        onClick={() => setShareType('organization')}
                        className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                          shareType === 'organization'
                            ? 'border-app-primary bg-app-primary/10'
                            : 'border-border hover:border-muted-foreground'
                        }`}
                      >
                        <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2" />
                        <p className="font-medium text-sm sm:text-base">Organization</p>
                        <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">
                          Share with everyone
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Email Input for Individual Sharing */}
                  {shareType === 'individual' && (
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Email addresses
                      </label>
                      <div>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={emailInput}
                            onChange={(e) => {
                              setEmailInput(e.target.value);
                              setEmailValidationError(null);
                            }}
                            onKeyPress={(e) => e.key === 'Enter' && !isValidatingEmail && handleAddEmail()}
                            placeholder="Enter email address"
                            className={`flex-1 px-3 py-2 text-sm bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-app-primary ${
                              emailValidationError ? 'border-destructive' : 'border-input'
                            }`}
                            disabled={isValidatingEmail}
                          />
                          <Button
                            onClick={handleAddEmail}
                            disabled={!emailInput.trim() || isValidatingEmail}
                            variant="outline"
                            size="sm"
                            loading={isValidatingEmail}
                          >
                            Add
                          </Button>
                        </div>
                        {emailValidationError && (
                          <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                            <ExclamationTriangleIcon className="w-3 h-3" />
                            {emailValidationError}
                          </p>
                        )}
                      </div>
                      {userEmails.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {userEmails.map((email) => (
                            <span
                              key={email}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-xs sm:text-sm"
                            >
                              <span className="truncate max-w-[150px] sm:max-w-none">{email}</span>
                              <button
                                onClick={() => handleRemoveEmail(email)}
                                className="ml-1 hover:text-destructive flex-shrink-0"
                              >
                                <XMarkIcon className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expiration - Compact select */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Access expires
                    </label>
                    <select
                      value={expiresIn}
                      onChange={(e) => setExpiresIn(e.target.value as ExpiresIn)}
                      className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-app-primary"
                    >
                      <option value="never">Never</option>
                      <option value="24hours">After 24 hours</option>
                      <option value="7days">After 7 days</option>
                      <option value="30days">After 30 days</option>
                    </select>
                  </div>

                  {/* Optional Message - Smaller on mobile */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Message (optional)
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Add a message..."
                      rows={2}
                      className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-app-primary resize-none"
                    />
                  </div>

                  {/* Permissions info - Collapsible on mobile */}
                  <details className="sm:hidden">
                    <summary className="text-sm font-medium text-muted-foreground cursor-pointer">
                      What recipients can do
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-3 h-3 text-app-success mt-0.5 flex-shrink-0" />
                        View transcript and summary
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-3 h-3 text-app-success mt-0.5 flex-shrink-0" />
                        Use as context for meetings
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckIcon className="w-3 h-3 text-app-success mt-0.5 flex-shrink-0" />
                        Access from dashboard
                      </li>
                    </ul>
                  </details>

                  {/* Permissions info - Full view on desktop */}
                  <div className="hidden sm:block bg-muted/30 rounded-lg p-3">
                    <h4 className="font-medium text-sm mb-2">Recipients will be able to:</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 text-app-success" />
                        View the meeting transcript and summary
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 text-app-success" />
                        Use this meeting as context for their meetings
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckIcon className="w-4 h-4 text-app-success" />
                        Access the meeting from their dashboard
                      </li>
                    </ul>
                  </div>

                  {/* Error/Success Messages */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 p-2.5 bg-destructive/10 text-destructive rounded-lg text-sm"
                      >
                        <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="break-words">{error}</span>
                      </motion.div>
                    )}
                    {success && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 p-2.5 bg-app-success/10 text-app-success rounded-lg text-sm"
                      >
                        <CheckIcon className="w-4 h-4 flex-shrink-0" />
                        Meeting shared successfully!
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Actions - Fixed at bottom */}
              <div className="border-t border-border px-4 sm:px-6 py-3 sm:py-4 flex gap-2 sm:gap-3 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isSharing}
                  className="flex-1 sm:flex-none"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleShare}
                  disabled={isSharing || (shareType === 'individual' && userEmails.length === 0)}
                  loading={isSharing}
                  className="flex-1 sm:flex-none bg-app-primary hover:bg-app-primary/90"
                  size="sm"
                >
                  <ShareIcon className="w-4 h-4 mr-1.5" />
                  Share
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};