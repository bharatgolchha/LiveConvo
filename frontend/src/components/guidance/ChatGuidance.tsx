'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Mic, 
  MicOff, 
  Lightbulb, 
  MessageCircle, 
  Sparkles,
  ThumbsUp,
  Clock,
  Zap,
  Target,
  CheckCircle,
  ArrowRight,
  MoreHorizontal
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

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.type === 'user';
  const isAutoGuidance = message.type === 'auto-guidance';
  const isSystem = message.type === 'system';
  
  const getBubbleStyle = () => {
    if (isUser) return 'bg-blue-500 text-white ml-auto';
    if (isAutoGuidance) return 'bg-amber-100 border border-amber-200 text-amber-800';
    if (isSystem) return 'bg-gray-100 border border-gray-200 text-gray-700';
    return 'bg-white border border-gray-200 text-gray-800';
  };

  const getIconForType = () => {
    if (isUser) return null;
    if (isAutoGuidance) return <Lightbulb className="w-4 h-4 text-amber-600" />;
    if (isSystem) return <Sparkles className="w-4 h-4 text-gray-500" />;
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
          <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
            <span className="text-xs font-medium text-gray-600">Quick actions:</span>
            {message.metadata.suggestedActions.map((action, index) => (
              <button
                key={index}
                className="block w-full text-left text-xs bg-gray-50 hover:bg-gray-100 p-2 rounded-md transition-colors"
                onClick={() => {/* TODO: Implement */}}
              >
                {action}
              </button>
            ))}
          </div>
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
    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
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
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-50 to-white">
      {/* Chat Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">AI Coach</h3>
              <p className="text-xs text-gray-500">
                {isLoading ? 'Thinking...' : 'Ready to help'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="h-8 w-8 p-1"
            >
              <Zap className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-shrink-0 p-3 bg-white border-b border-gray-100"
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-60" />
              <p className="font-medium text-lg mb-2">Your AI Coach is Ready!</p>
              <p className="text-sm">Ask me anything during your conversation</p>
            </div>
          </div>
        )}
        
        <AnimatePresence>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          
          {isLoading && <TypingIndicator />}
        </AnimatePresence>
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything... (Enter to send)"
              rows={1}
              className="w-full resize-none rounded-full border border-gray-300 px-4 py-2 pr-12 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow scrollbar-thin"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
            
            <button
              type="button"
              onClick={() => setIsVoiceMode(!isVoiceMode)}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors",
                isVoiceMode 
                  ? "bg-red-100 text-red-600 hover:bg-red-200" 
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {isVoiceMode ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
          
          <Button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="h-10 w-10 p-0 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50"
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