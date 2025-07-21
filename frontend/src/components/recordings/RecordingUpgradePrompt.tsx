import React from 'react';
import Link from 'next/link';
import { VideoCameraIcon, LockClosedIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

export function RecordingUpgradePrompt() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="relative">
        <VideoCameraIcon className="w-20 h-20 text-muted-foreground/50" />
        <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-1">
          <LockClosedIcon className="w-8 h-8 text-primary" />
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-foreground mt-6 mb-2">
        Recording Access Required
      </h3>
      
      <p className="text-muted-foreground text-center max-w-md mb-6">
        Meeting recordings are available with our paid plans. Upgrade to access full video recordings of your conversations.
      </p>
      
      <div className="bg-muted/30 rounded-lg p-6 max-w-md w-full mb-6">
        <h4 className="font-medium text-foreground mb-3">Recording Features Include:</h4>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <CheckIcon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <span className="text-sm text-muted-foreground">Full HD video recordings of all meetings</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckIcon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <span className="text-sm text-muted-foreground">Download recordings for offline access</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckIcon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <span className="text-sm text-muted-foreground">Automatic recording for all meetings</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckIcon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <span className="text-sm text-muted-foreground">Secure cloud storage with 30-day retention</span>
          </li>
        </ul>
      </div>
      
      <div className="flex w-full max-w-xs">
        <Link href="/pricing" className="w-full">
          <Button variant="primary" size="lg" className="w-full">
            View Plans
          </Button>
        </Link>
      </div>
      
      <p className="text-xs text-muted-foreground mt-4 text-center">
        Starting at just $10/month with our Starter plan
      </p>
    </div>
  );
}