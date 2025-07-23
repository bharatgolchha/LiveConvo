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
  SparklesIcon, 
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
  const [internalIsMinimized, setInternalIsMinimized] = useState(false);
  const [autoSwitched, setAutoSwitched] = useState(false);
  const chatRef = useRef<EnhancedAIChatRef>(null);
  const isMobileDetected = useIsMobile();
  const isMobile = isMobileProp ?? isMobileDetected;
  
  // Use external state if provided, otherwise use internal state
  const isMinimized = onMinimizedChange ? externalIsMinimized : internalIsMinimized;
  const setIsMinimized = onMinimizedChange || setInternalIsMinimized;

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
    { 
      id: 'settings' as TabType, 
      label: 'Settings', 
      icon: Cog6ToothIcon,
      description: 'Advisor preferences' 
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
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
              <SparklesIcon className="w-5 h-5 text-primary" />
            </div>
            {!isMinimized && (
              <h2 className="font-semibold text-foreground text-sm">Nova</h2>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Clear chat button - only show when on chat tab */}
            {activeTab === 'chat' && !isMinimized && (
              <button
                onClick={handleClearChat}
                className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                title="Clear chat history"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
            {!isMobile && (
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
              <motion.div
                animate={{ rotate: isMinimized ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </motion.div>
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        {!isMinimized && (
          <div className="flex mt-4 bg-muted/30 rounded-lg p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 relative px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                  title={tab.description}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </div>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-primary rounded-md shadow-sm"
                      style={{ zIndex: -1 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

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