'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles,
  ChevronLeft,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { ChatGuidance } from './ChatGuidance';
import { ChatMessage } from '@/lib/useChatGuidance';

interface FloatingChatGuidanceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
  sendMessage: (message?: string) => void;
  sendQuickAction: (action: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isRecording: boolean;
}

export const FloatingChatGuidance: React.FC<FloatingChatGuidanceProps> = ({
  messages,
  isLoading,
  inputValue,
  setInputValue,
  sendMessage,
  sendQuickAction,
  messagesEndRef,
  isRecording
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const hasNewMessages = messages.length > 0;
  const unreadCount = messages.filter(msg => 
    msg.type === 'auto-guidance' || 
    (msg.type === 'ai' && msg.metadata?.isResponse)
  ).length;

  // Show initial hint after recording starts
  const [showInitialHint, setShowInitialHint] = useState(false);

  React.useEffect(() => {
    if (isRecording && !isOpen && messages.length === 0) {
      setShowInitialHint(true);
      const timer = setTimeout(() => setShowInitialHint(false), 8000); // Hide after 8 seconds
      return () => clearTimeout(timer);
    }
  }, [isRecording, isOpen, messages.length]);

  const toggleDrawer = () => {
    setIsOpen(!isOpen);
    setShowInitialHint(false); // Hide hint when opening
  };

  const closeDrawer = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Initial Hint Tooltip */}
      <AnimatePresence>
        {showInitialHint && !isOpen && isRecording && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.8 }}
            className="fixed bottom-24 right-6 z-50 bg-gray-900 text-white text-sm py-2 px-3 rounded-lg shadow-lg max-w-xs"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Click me for AI conversation coaching!</span>
            </div>
            {/* Arrow pointing down to button */}
            <div className="absolute bottom-[-4px] right-8 w-2 h-2 bg-gray-900 transform rotate-45"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button (when drawer is closed) */}
      <AnimatePresence>
        {!isOpen && isRecording && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={toggleDrawer}
              className={cn(
                "h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-white",
                hasNewMessages && "animate-pulse"
              )}
            >
              <div className="relative">
                <Sparkles className="w-6 h-6 text-white" />
                {hasNewMessages && unreadCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.div>
                )}
              </div>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-Height Right Drawer */}
      <AnimatePresence>
        {isOpen && isRecording && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40"
              onClick={closeDrawer}
            />
            
            {/* Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">AI Conversation Coach</h3>
                      <p className="text-sm opacity-90">
                        {isLoading ? 'Thinking...' : 'Ready to help you succeed'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={closeDrawer}
                      className="h-8 w-8 p-1 text-white hover:bg-white/20 rounded-full"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={closeDrawer}
                      className="h-8 w-8 p-1 text-white hover:bg-white/20 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Chat Content - Full Height */}
              <div className="flex-1 overflow-hidden">
                <ChatGuidance
                  messages={messages}
                  isLoading={isLoading}
                  inputValue={inputValue}
                  setInputValue={setInputValue}
                  sendMessage={sendMessage}
                  sendQuickAction={sendQuickAction}
                  messagesEndRef={messagesEndRef}
                />
              </div>

              {/* Drag Handle (desktop only) */}
              <div className="hidden sm:block absolute left-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-gradient-to-b from-blue-500 to-purple-600 rounded-r-full opacity-60 hover:opacity-100 transition-opacity cursor-pointer" 
                   onClick={closeDrawer}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Right Edge Indicator (when drawer is closed) */}
      <AnimatePresence>
        {!isOpen && isRecording && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="fixed top-1/2 right-0 -translate-y-1/2 z-30"
          >
            <div className="w-1 h-20 bg-gradient-to-b from-blue-500 to-purple-600 rounded-l-full opacity-40 hover:opacity-80 transition-all duration-300 cursor-pointer shadow-lg"
                 onClick={toggleDrawer}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edge Trigger (when drawer is closed) - thin invisible area to trigger drawer */}
      {!isOpen && isRecording && (
        <div 
          className="fixed top-0 right-0 w-4 h-full z-20 cursor-pointer"
          onClick={toggleDrawer}
        />
      )}
    </>
  );
}; 