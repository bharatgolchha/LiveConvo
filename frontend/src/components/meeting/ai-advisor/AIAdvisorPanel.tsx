import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMeetingContext } from '@/lib/meeting/context/MeetingContext';
import { EnhancedAIChat } from './EnhancedAIChat';
import { SmartSuggestions } from './SmartSuggestions';
import { MeetingInsights } from './MeetingInsights';
import { QuickActions } from './QuickActions';
import { 
  SparklesIcon, 
  ChatBubbleLeftRightIcon,
  LightBulbIcon,
  ChartBarIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

type TabType = 'chat' | 'suggestions' | 'insights' | 'settings';

interface AIAdvisorPanelProps {
  isMinimized?: boolean;
  onMinimizedChange?: (minimized: boolean) => void;
}

export function AIAdvisorPanel({ 
  isMinimized: externalIsMinimized = false, 
  onMinimizedChange 
}: AIAdvisorPanelProps) {
  const { botStatus, transcript } = useMeetingContext();
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [internalIsMinimized, setInternalIsMinimized] = useState(false);
  const [autoSwitched, setAutoSwitched] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const isMinimized = onMinimizedChange ? externalIsMinimized : internalIsMinimized;
  const setIsMinimized = onMinimizedChange || setInternalIsMinimized;

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

    window.addEventListener('useSuggestion', handleUseSuggestion);
    
    return () => {
      window.removeEventListener('useSuggestion', handleUseSuggestion);
    };
  }, []);

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
        return <EnhancedAIChat />;
      case 'suggestions':
        return <SmartSuggestions />;
      case 'insights':
        return <MeetingInsights />;
      case 'settings':
        return <AdvisorSettings />;
      default:
        return <EnhancedAIChat />;
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-card border-l border-border transition-all duration-300">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
              <SparklesIcon className="w-5 h-5 text-primary" />
            </div>
            {!isMinimized && (
              <div>
                <h2 className="font-semibold text-foreground text-sm">AI Advisor</h2>
                <p className="text-xs text-muted-foreground">
                  {botStatus?.status === 'in_call' ? 'Active guidance' : 'Ready to help'}
                </p>
              </div>
            )}
          </div>
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
              <EnhancedAIChat />
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
  return (
    <div className="p-4 space-y-4">
      <h3 className="font-medium text-sm">Advisor Preferences</h3>
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