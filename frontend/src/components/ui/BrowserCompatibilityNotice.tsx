'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X } from 'lucide-react';
import { getBrowserRecommendation, isFullySupported } from '@/lib/browserUtils';

export function BrowserCompatibilityNotice() {
  const [showNotice, setShowNotice] = useState(false);
  const [recommendation, setRecommendation] = useState('');

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Check if user has already dismissed the notice this session
    const dismissed = sessionStorage.getItem('browserNoticeDismissed');
    if (dismissed === 'true') return;

    // Check browser compatibility
    if (!isFullySupported()) {
      setRecommendation(getBrowserRecommendation());
      setShowNotice(true);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('browserNoticeDismissed', 'true');
    setShowNotice(false);
  };

  if (!showNotice) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Alert variant="warning" className="relative max-w-4xl mx-auto">
        <AlertDescription className="pr-8 text-sm">
          {recommendation}
        </AlertDescription>
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-md hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors"
          aria-label="Dismiss browser notice"
        >
          <X className="h-4 w-4" />
        </button>
      </Alert>
    </div>
  );
}