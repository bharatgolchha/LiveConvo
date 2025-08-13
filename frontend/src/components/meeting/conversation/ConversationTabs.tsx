import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';
import { 
  ChatBubbleLeftRightIcon, 
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  LinkIcon,
  VideoCameraIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { LiveTranscriptTab } from './LiveTranscriptTab';
import { RealtimeSummaryTab } from './RealtimeSummaryTab';
import { SmartNotesTab } from './SmartNotesTab';
import { PreviousMeetingsTab } from './PreviousMeetingsTab';
import { RecordingTab } from './RecordingTab';
import { MultipleRecordingsTab } from './MultipleRecordingsTab';
import { TabContent } from './TabContent';
import { AgendaTab } from './AgendaTab';

const tabs = [
  {
    id: 'transcript' as const,
    label: 'Live Transcript',
    icon: ChatBubbleLeftRightIcon,
    description: 'Real-time conversation transcript'
  },
  {
    id: 'summary' as const,
    label: 'AI Insights',
    icon: DocumentTextIcon,
    description: 'AI-generated meeting summary'
  },
  {
    id: 'agenda' as const,
    label: 'Agenda',
    icon: ClipboardDocumentListIcon,
    description: 'Track agenda progress in real time'
  },
  {
    id: 'notes' as const,
    label: 'Smart Notes',
    icon: ClipboardDocumentListIcon,
    description: 'Key points and action items'
  },
  {
    id: 'previous' as const,
    label: 'Previous Meetings',
    icon: LinkIcon,
    description: 'Linked previous meetings context'
  },
  {
    id: 'recording' as const,
    label: 'Recording',
    icon: VideoCameraIcon,
    description: 'Meeting video recording'
  }
];

export function ConversationTabs() {
  const { activeTab, setActiveTab, meeting, linkedConversations } = useMeetingContext();
  const { hasFeature, loading: subscriptionLoading } = useSubscription();
  const isMobile = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  
  const hasRecordingAccess = hasFeature('hasRecordingAccess');
  
  // Scroll to active tab on mobile
  useEffect(() => {
    if (isMobile && activeTabRef.current && scrollContainerRef.current) {
      activeTabRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeTab, isMobile]);

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="border-b border-border bg-card/50 py-2">
        <div 
          ref={scrollContainerRef}
          className={`flex ${isMobile ? 'overflow-x-auto scrollbar-hide px-2' : 'px-4'}`}
          style={isMobile ? { WebkitOverflowScrolling: 'touch' } : {}}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            
            // Show badge for Previous Meetings tab if there are linked conversations
            const showBadge = tab.id === 'previous' && linkedConversations && linkedConversations.length > 0;
            
            // Show recording indicator
            const showRecordingBadge = tab.id === 'recording' && meeting?.recallRecordingStatus === 'done';
            
            return (
              <button
                key={tab.id}
                ref={isActive ? activeTabRef : null}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 transition-all whitespace-nowrap ${
                  isActive 
                    ? 'text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">{isMobile && tab.id === 'transcript' ? 'Transcript' : tab.label}</span>
                
                {/* Show lock icon for recording tab if no access (only after loading) */}
                {tab.id === 'recording' && !subscriptionLoading && !hasRecordingAccess && (
                  <LockClosedIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground ml-1" />
                )}
                
                {showBadge && (
                  <span className="ml-1 px-1 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full leading-none">
                    {linkedConversations.length}
                  </span>
                )}
                
                {showRecordingBadge && (
                  <span className="ml-1 w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                )}
                
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <TabContent>
          {activeTab === 'transcript' && <LiveTranscriptTab />}
          {activeTab === 'summary' && <RealtimeSummaryTab />}
          {activeTab === 'agenda' && <AgendaTab />}
          {activeTab === 'notes' && <SmartNotesTab />}
          {activeTab === 'previous' && meeting?.id && (
            <PreviousMeetingsTab 
              sessionId={meeting.id}
              onAskAboutMeeting={async (meetingId, context) => {
                // Switch to transcript tab - this will make AI advisor visible
                setActiveTab('transcript');
                
                // Trigger AI chat with context about the previous meeting
                // We'll use a custom event to communicate with the AI advisor
                const aiChatEvent = new CustomEvent('askAboutPreviousMeeting', {
                  detail: {
                    meetingId,
                    context,
                    timestamp: Date.now()
                  }
                });
                window.dispatchEvent(aiChatEvent);
              }}
            />
          )}
          {activeTab === 'recording' && <MultipleRecordingsTab />}
        </TabContent>
      </div>
    </div>
  );
}