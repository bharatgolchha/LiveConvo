import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { useIsMobile } from '@/lib/hooks/useMediaQuery';
import { EnhancedAIChat, EnhancedAIChatRef } from './EnhancedAIChat';
import { SmartSuggestions } from './SmartSuggestions';
import { MeetingInsights } from './MeetingInsights';
import { QuickActions } from './QuickActions';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  ChatBubbleLeftRightIcon,
  LightBulbIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

type TabType = 'chat' | 'suggestions' | 'insights' | 'settings';

interface AIAdvisorPanelProps {
  isMinimized?: boolean;
  onMinimizedChange?: (minimized: boolean) => void;
}

export function AIAdvisorPanel({ 
  isMinimized: externalIsMinimized = false, 
  onMinimizedChange,
  isMobile: isMobileProp 
}: AIAdvisorPanelProps & { isMobile?: boolean }) {
  const { botStatus, transcript, meeting, addSmartNote } = useMeetingContext();
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [internalIsMinimized] = useState(false);
  const [autoSwitched, setAutoSwitched] = useState(false);
  const [suggestionsCount, setSuggestionsCount] = useState(0);
  const chatRef = useRef<EnhancedAIChatRef>(null);
  const isMobileDetected = useIsMobile();
  const isMobile = isMobileProp ?? isMobileDetected;
  
  // Use external state if provided, otherwise use internal state
  const isMinimized = onMinimizedChange ? externalIsMinimized : internalIsMinimized;

  const handleClearChat = () => {
    if (chatRef.current && activeTab === 'chat') {
      chatRef.current.clearChat();
    }
  };

  // Auto-switch to Suggestions when meeting starts, only once
  useEffect(() => {
    if (!autoSwitched && botStatus?.status === 'in_call' && transcript.length > 0) {
      setActiveTab('suggestions');
      setAutoSwitched(true);
    }
  }, [autoSwitched, botStatus?.status, transcript.length]);

  // Listen for suggestion usage events and switch to chat tab
  useEffect(() => {
    const updateCount = (e: Event) => {
      const { count } = (e as CustomEvent).detail || {};
      setSuggestionsCount(typeof count === 'number' ? count : 0);
    };
    window.addEventListener('smartSuggestionsUpdated', updateCount);
    return () => window.removeEventListener('smartSuggestionsUpdated', updateCount);
  }, []);

  useEffect(() => {
    const handleUseSuggestion = () => {
      setActiveTab('chat');
    };

    const handleAddSmartNote = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const smartNote = customEvent.detail;
      console.log('[AIAdvisorPanel] Received addSmartNote event:', smartNote);
      
      // Add to local state first for immediate UI update
      addSmartNote(smartNote);
      
      // Persist to database
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token || !meeting?.id) {
          console.error('[AIAdvisorPanel] No auth token or meeting ID');
          return;
        }

        // Get user and organization info
        const { data: meetingData } = await supabase
          .from('sessions')
          .select('organization_id, user_id')
          .eq('id', meeting.id)
          .single();

        if (!meetingData) {
          console.error('[AIAdvisorPanel] Failed to get meeting data');
          return;
        }

        // Save to smart_notes table
        const { error: insertError } = await supabase
          .from('smart_notes')
          .insert({
            session_id: meeting.id,
            user_id: meetingData.user_id,
            organization_id: meetingData.organization_id,
            category: smartNote.category,
            content: smartNote.content,
            importance: smartNote.importance || 'medium',
            is_manual: true
          });

        if (insertError) {
          console.error('[AIAdvisorPanel] Failed to save smart note:', insertError);
          toast.error('Failed to save smart note');
        } else {
          console.log('[AIAdvisorPanel] Smart note saved to database');
        }
      } catch (error) {
        console.error('[AIAdvisorPanel] Error saving smart note:', error);
      }
    };

    window.addEventListener('useSuggestion', handleUseSuggestion);
    window.addEventListener('addSmartNote', handleAddSmartNote);
    
    return () => {
      window.removeEventListener('useSuggestion', handleUseSuggestion);
      window.removeEventListener('addSmartNote', handleAddSmartNote);
    };
  }, [addSmartNote, meeting]);

  const tabs = [
    { 
      id: 'chat' as TabType, 
      label: 'Chat', 
      icon: ChatBubbleLeftRightIcon,
      description: 'Ask AI anything' 
    },
    { 
      id: 'suggestions' as TabType, 
      label: 'Suggestions', 
      icon: LightBulbIcon,
      description: 'Smart recommendations' 
    },
    { 
      id: 'insights' as TabType, 
      label: 'Insights', 
      icon: ChartBarIcon,
      description: 'Meeting analytics' 
    },
  ];

  const getTabContent = () => {
    switch (activeTab) {
      case 'chat':
        return <EnhancedAIChat ref={chatRef} />;
      case 'suggestions':
        return <SmartSuggestions />;
      case 'insights':
        return <MeetingInsights />;
      case 'settings':
        return <AdvisorSettings />;
      default:
        return <EnhancedAIChat ref={chatRef} />;
    }
  };

  return (
    <div className={`${isMobile ? 'h-full' : 'h-full'} w-full flex flex-col bg-card ${isMobile ? '' : 'border-l'} border-border transition-all duration-300`}>
      {/* Compact header with only tabs and a clear button on the right */}
      {!isMinimized && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 transition-all whitespace-nowrap ${
                      isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title={tab.description}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium hidden md:inline">
                      {tab.label}
                      {tab.id === 'suggestions' && suggestionsCount > 0 && (
                        <span className="ml-1 px-1 py-0.5 text-[10px] bg-primary text-primary-foreground rounded-full leading-none">
                          {suggestionsCount}
                        </span>
                      )}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            {/* Personal context indicator (icon only) */}
            {Boolean((meeting as any)?.personalContext || (meeting as any)?.personal_context || false) && (
              <div className="p-1.5 text-primary" title="Personal context active">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M12 2.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5ZM4.5 20.118a7.5 7.5 0 0 1 15 0 17.94 17.94 0 0 1-7.5 1.632 17.94 17.94 0 0 1-7.5-1.632Z" clipRule="evenodd" />
                </svg>
              </div>
            )}

            {/* Settings gear moved here */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`p-1.5 rounded-md transition-colors ${activeTab === 'settings' ? 'bg-muted text-foreground' : 'hover:bg-muted text-muted-foreground'}`}
              title="Advisor settings"
            >
              <Cog6ToothIcon className="w-4 h-4" />
            </button>
            {activeTab === 'chat' && (
              <button
                onClick={handleClearChat}
                className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                title="Clear chat history"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isMinimized ? (
          <MinimizedView activeTab={activeTab} setActiveTab={setActiveTab} />
        ) : (
          <div className="h-full">
            <div className={`${activeTab === 'chat' ? 'block h-full' : 'hidden'}`}>
              <EnhancedAIChat ref={chatRef} />
            </div>
            <div className={`${activeTab === 'suggestions' ? 'block h-full' : 'hidden'}`}>
              <SmartSuggestions />
            </div>
            <div className={`${activeTab === 'insights' ? 'block h-full' : 'hidden'}`}>
              <MeetingInsights />
            </div>
            <div className={`${activeTab === 'settings' ? 'block h-full' : 'hidden'}`}>
              <AdvisorSettings />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Minimized view with icon-only tabs
function MinimizedView({ 
  activeTab, 
  setActiveTab 
}: { 
  activeTab: TabType; 
  setActiveTab: (tab: TabType) => void; 
}) {
  const tabs = [
    { id: 'chat' as TabType, icon: ChatBubbleLeftRightIcon },
    { id: 'suggestions' as TabType, icon: LightBulbIcon },
    { id: 'insights' as TabType, icon: ChartBarIcon },
    { id: 'settings' as TabType, icon: Cog6ToothIcon },
  ];

  return (
    <div className="flex flex-col items-center gap-2 p-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`p-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-muted-foreground'
            }`}
          >
            <Icon className="w-5 h-5" />
          </button>
        );
      })}
    </div>
  );
}

// Settings panel
function AdvisorSettings() {
  const { meeting } = useMeetingContext();
  const [aiInstructions, setAiInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch AI instructions on mount
  useEffect(() => {
    if (meeting?.id) {
      fetchAiInstructions();
    }
  }, [meeting?.id]);

  const fetchAiInstructions = async () => {
    if (!meeting?.id) return;
    
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/sessions/${meeting.id}/ai-instructions`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAiInstructions(data.ai_instructions || '');
      }
    } catch (error) {
      console.error('Failed to fetch AI instructions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAiInstructions = async () => {
    if (!meeting?.id) return;
    
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(`/api/sessions/${meeting.id}/ai-instructions`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ai_instructions: aiInstructions.trim() || null })
      });

      if (response.ok) {
        toast.success('AI instructions updated successfully');
        
        // Emit event to notify other components
        const event = new CustomEvent('aiInstructionsUpdated', {
          detail: { instructions: aiInstructions.trim() || null }
        });
        window.dispatchEvent(event);
      } else {
        toast.error('Failed to update AI instructions');
      }
    } catch (error) {
      console.error('Failed to save AI instructions:', error);
      toast.error('Failed to update AI instructions');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto">
      <div>
        <h3 className="font-medium text-sm mb-3">AI Behavior Instructions</h3>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">
            Customize how Nova behaves during this meeting
          </label>
          <textarea
            value={aiInstructions}
            onChange={(e) => setAiInstructions(e.target.value)}
            placeholder="E.g., 'Focus on pricing discussions', 'Help me close the deal', 'Track technical requirements', 'Don't interrupt unless asked'..."
            className="w-full h-32 p-3 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            disabled={isLoading}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {aiInstructions.length}/1000 characters
            </span>
            <button
              onClick={saveAiInstructions}
              disabled={isSaving || isLoading}
              className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Instructions'}
            </button>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-border">
        <h4 className="text-sm font-medium mb-3">Nova Preferences</h4>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <span className="text-sm">Auto-suggestions</span>
            <input type="checkbox" className="rounded" defaultChecked />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Sound notifications</span>
            <input type="checkbox" className="rounded" />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm">Proactive tips</span>
            <input type="checkbox" className="rounded" defaultChecked />
          </label>
        </div>
      </div>

      <div className="pt-3 border-t border-border">
        <h4 className="text-sm font-medium mb-2">Response Style</h4>
        <select className="w-full p-2 text-sm border border-border rounded-md">
          <option>Concise & Direct</option>
          <option>Detailed & Explanatory</option>
          <option>Conversational</option>
        </select>
      </div>
    </div>
  );
}