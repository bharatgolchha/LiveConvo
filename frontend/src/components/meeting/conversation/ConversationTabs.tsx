import React from 'react';
import { motion } from 'framer-motion';
import { 
  ChatBubbleLeftRightIcon, 
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  LinkIcon,
  VideoCameraIcon
} from '@heroicons/react/24/outline';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { LiveTranscriptTab } from './LiveTranscriptTab';
import { RealtimeSummaryTab } from './RealtimeSummaryTab';
import { SmartNotesTab } from './SmartNotesTab';
import { PreviousMeetingsTab } from './PreviousMeetingsTab';
import { RecordingTab } from './RecordingTab';
import { MultipleRecordingsTab } from './MultipleRecordingsTab';
import { TabContent } from './TabContent';

const tabs = [
  {
    id: 'transcript' as const,
    label: 'Live Transcript',
    icon: ChatBubbleLeftRightIcon,
    description: 'Real-time conversation transcript'
  },
  {
    id: 'summary' as const,
    label: 'Summary',
    icon: DocumentTextIcon,
    description: 'AI-generated meeting summary'
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

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="border-b border-border bg-card/50">
        <div className="flex">
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
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-6 py-4 transition-all ${
                  isActive 
                    ? 'text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
                
                {showBadge && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                    {linkedConversations.length}
                  </span>
                )}
                
                {showRecordingBadge && (
                  <span className="ml-1 w-2 h-2 bg-green-500 rounded-full"></span>
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