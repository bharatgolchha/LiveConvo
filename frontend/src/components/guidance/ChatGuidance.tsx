'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Mic, 
  MicOff, 
  Lightbulb, 
  MessageCircle, 
  Sparkles,
  ThumbsUp,
  Zap,
  Target,
  CheckCircle,
  ArrowRight,
  MoreHorizontal,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { ChatMessage } from '@/lib/useChatGuidance';

interface ChatGuidanceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
  sendMessage: (message?: string) => void;
  sendQuickAction: (action: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

const quickActions = [
  { id: 'what-next', label: 'What next?', icon: ArrowRight, color: 'blue' },
  { id: 'how-doing', label: 'How am I doing?', icon: Target, color: 'green' },
  { id: 'handle-objection', label: 'Handle concerns', icon: Lightbulb, color: 'yellow' },
  { id: 'key-points', label: 'Key points', icon: CheckCircle, color: 'purple' }
];

// Elegant collapsible suggested actions component
const SuggestedActionsAccordion: React.FC<{
  actions: string[];
  onActionClick?: (action: string) => void;
}> = ({ actions, onActionClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-2">
      {/* Compact trigger button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="group flex items-center gap-2 w-full p-2 text-left bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 border border-emerald-200/30 dark:border-emerald-700/30 rounded-lg transition-all duration-200"
      >
        <div className="flex items-center gap-2 flex-1">
          <Zap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-medium text-emerald-900 dark:text-emerald-100">
            Live Prompts
          </span>
          <span className="text-xs px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full">
            {actions.length}
          </span>
        </div>
        <ChevronUp 
          className={`h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="mt-2 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => {
                onActionClick?.(action);
                setIsExpanded(false); // Auto-collapse after selection
              }}
              className="group w-full text-left p-2.5 bg-white/40 dark:bg-gray-800/30 hover:bg-white/70 dark:hover:bg-gray-700/50 border border-emerald-200/40 dark:border-emerald-700/30 hover:border-emerald-300/60 dark:hover:border-emerald-600/50 rounded-md transition-all duration-150 hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-emerald-100/80 dark:bg-emerald-900/40 flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/60 transition-colors">
                  <ArrowRight className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-xs text-gray-800 dark:text-gray-200 font-medium leading-relaxed">
                  {action}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const MessageBubble: React.FC<{ message: ChatMessage; onSendMessage?: (message: string) => void }> = ({ message, onSendMessage }) => {
  const isUser = message.type === 'user';
  const isAutoGuidance = message.type === 'auto-guidance';
  const isSystem = message.type === 'system';
  
  const getBubbleStyle = () => {
    if (isUser) return 'bg-app-primary text-white ml-auto';
    if (isAutoGuidance)
      return 'bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200';
    if (isSystem) return 'bg-muted border border-border text-muted-foreground';
    return 'bg-card border border-border text-foreground';
  };

  const getIconForType = () => {
    if (isUser) return null;
    if (isAutoGuidance) return <Lightbulb className="w-4 h-4 text-amber-600" />;
    if (isSystem) return <Sparkles className="w-4 h-4 text-muted-foreground" />;
    return <MessageCircle className="w-4 h-4 text-blue-500" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex gap-2 mb-3',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold shadow-md">
          {getIconForType()}
        </div>
      )}
      
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2 shadow-sm',
          getBubbleStyle(),
          isUser ? 'rounded-br-md' : 'rounded-bl-md'
        )}
      >
        {isAutoGuidance && (
          <div className="flex items-center gap-1 mb-1">
            <Zap className="w-3 h-3" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {message.metadata?.guidanceType || 'Auto Guidance'}
            </span>
            {message.metadata?.confidence && (
              <span className="text-xs opacity-70">
                {message.metadata.confidence}%
              </span>
            )}
          </div>
        )}
        
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        
        {message.metadata?.suggestedActions && message.metadata.suggestedActions.length > 0 && (
          <SuggestedActionsAccordion 
            actions={message.metadata.suggestedActions}
            onActionClick={onSendMessage}
          />
        )}
        
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs opacity-60">
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          
          {!isUser && !isSystem && (
            <button className="opacity-60 hover:opacity-100 transition-opacity">
              <ThumbsUp className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-white text-sm font-semibold shadow-md">
          U
        </div>
      )}
    </motion.div>
  );
};

const TypingIndicator: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="flex gap-2 mb-3"
  >
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <MessageCircle className="w-4 h-4 text-white" />
    </div>
    <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
      <div className="flex gap-1">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
          className="w-2 h-2 bg-gray-400 rounded-full"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
          className="w-2 h-2 bg-gray-400 rounded-full"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
          className="w-2 h-2 bg-gray-400 rounded-full"
        />
      </div>
    </div>
  </motion.div>
);

export const ChatGuidance: React.FC<ChatGuidanceProps> = ({
  messages,
  isLoading,
  inputValue,
  setInputValue,
  sendMessage,
  sendQuickAction,
  messagesEndRef
}) => {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Quick Actions */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 p-3 bg-card border-b border-border"
          >
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => sendQuickAction(action.id)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg text-left text-xs font-medium transition-all hover:scale-105",
                    `bg-${action.color}-50 text-${action.color}-700 hover:bg-${action.color}-100`
                  )}
                >
                  <action.icon className="w-3 h-3" />
                  {action.label}
                </button>
              ))}
            </div>
            <div className="flex justify-center mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQuickActions(false)}
                className="h-6 text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronUp className="w-3 h-3 mr-1" />
                Hide
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Show Quick Actions Button (when hidden) */}
      {!showQuickActions && (
        <div className="flex-shrink-0 p-2 bg-card border-b border-border flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowQuickActions(true)}
            className="h-6 text-xs text-muted-foreground hover:text-foreground"
          >
            <Zap className="w-3 h-3 mr-1" />
            Quick Actions
          </Button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-0 scrollbar-thin scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-60" />
              <p className="font-medium text-lg mb-2">Your AI Coach is Ready!</p>
              <p className="text-sm">Ask me anything during your conversation</p>
            </div>
          </div>
        )}
        
        <AnimatePresence>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} onSendMessage={sendMessage} />
          ))}
          
          {isLoading && <TypingIndicator />}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 bg-card border-t border-border">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything... (Enter to send)"
              rows={1}
              className="w-full resize-none rounded-full border border-border px-4 py-2 pr-12 text-sm focus:ring-2 focus:ring-app-primary focus:border-app-primary transition-shadow scrollbar-thin bg-background text-foreground"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
            
            <button
              type="button"
              onClick={() => setIsVoiceMode(!isVoiceMode)}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors",
                isVoiceMode
                  ? "bg-red-100 text-red-600 hover:bg-red-200"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              )}
            >
              {isVoiceMode ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
          
          <Button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="h-10 w-10 p-0 rounded-full bg-app-primary hover:bg-app-primary-dark disabled:opacity-50"
          >
            {isLoading ? (
              <MoreHorizontal className="w-4 h-4 animate-pulse" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}; 