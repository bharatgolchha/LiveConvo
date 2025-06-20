import React from 'react';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { MeetingBotControl } from './MeetingBotControl';
import { MeetingTimer } from './MeetingTimer';
import { MeetingActions } from './MeetingActions';
import { getPlatformIcon, getPlatformName } from '@/lib/meeting/utils/platform-detector';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

export function MeetingHeader() {
  const { meeting, isAIAdvisorOpen, setIsAIAdvisorOpen } = useMeetingContext();
  const router = useRouter();

  if (!meeting) return null;

  return (
    <header className="h-16 px-6 border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="h-full flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">
                {getPlatformIcon(meeting.platform)}
              </span>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  {meeting.title}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {getPlatformName(meeting.platform)} Meeting
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Center Section */}
        <div className="flex items-center gap-6">
          <MeetingTimer startTime={meeting.createdAt} />
          <MeetingBotControl />
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          <MeetingActions />
          
          {/* AI Advisor Toggle */}
          <button
            onClick={() => setIsAIAdvisorOpen(!isAIAdvisorOpen)}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              isAIAdvisorOpen 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            <span className="text-lg">🤖</span>
            <span className="text-sm font-medium">
              AI Advisor
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}