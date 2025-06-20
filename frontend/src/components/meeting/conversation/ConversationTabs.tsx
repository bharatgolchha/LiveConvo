import React from 'react';
import { motion } from 'framer-motion';
import { 
  ChatBubbleLeftRightIcon, 
  DocumentTextIcon,
  ClipboardDocumentListIcon 
} from '@heroicons/react/24/outline';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { LiveTranscriptTab } from './LiveTranscriptTab';
import { RealtimeSummaryTab } from './RealtimeSummaryTab';
import { SmartNotesTab } from './SmartNotesTab';
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
  }
];

export function ConversationTabs() {
  const { activeTab, setActiveTab } = useMeetingContext();

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="border-b border-border bg-card/50">
        <div className="flex">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            
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
        </TabContent>
      </div>
    </div>
  );
}