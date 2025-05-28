'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Brain, MessageCircle, Mic, MicOff, Play, Pause, RotateCcw, ChevronRight, ChevronLeft, Maximize2, Minimize2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai' | 'auto-guidance' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    suggestions?: string[];
    actionable?: boolean;
  };
}

interface AICoachSidebarProps {
  isRecording: boolean;
  isPaused: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onRestartSession: () => void;
  messages?: ChatMessage[];
  onSendMessage?: (message: string) => void;
  sessionDuration?: number;
  audioLevel?: number;
  onWidthChange?: (width: number) => void;
}

export default function AICoachSidebar({
  isRecording,
  isPaused,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onRestartSession,
  messages = [],
  onSendMessage,
  sessionDuration = 0,
  audioLevel = 0,
  onWidthChange
}: AICoachSidebarProps) {
  const [width, setWidth] = useState(400);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  
  const sidebarRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  const minWidth = 320;
  const maxWidth = 600;
  const collapsedWidth = 60;

  // Notify parent of width changes
  useEffect(() => {
    if (onWidthChange) {
      if (isExpanded) {
        onWidthChange(0); // Expanded takes full width, so no margin needed
      } else if (isCollapsed) {
        onWidthChange(collapsedWidth);
      } else {
        onWidthChange(width);
      }
    }
  }, [width, isCollapsed, isExpanded, onWidthChange, collapsedWidth]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle resize functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const rect = sidebar.getBoundingClientRect();
    const newWidth = window.innerWidth - e.clientX;
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setWidth(newWidth);
    }
  }, [isResizing, minWidth, maxWidth]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Format session duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status info
  const getStatusInfo = () => {
    if (isRecording && !isPaused) {
      return { text: 'Recording', color: 'bg-red-500', pulse: true };
    } else if (isRecording && isPaused) {
      return { text: 'Paused', color: 'bg-yellow-500', pulse: false };
    } else {
      return { text: 'Ready', color: 'bg-green-500', pulse: false };
    }
  };

  const status = getStatusInfo();

  // Handle sending messages
  const handleSendMessage = () => {
    if (newMessage.trim() && onSendMessage) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Render message
  const renderMessage = (message: ChatMessage) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';
    const isAutoGuidance = message.type === 'auto-guidance';

    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
      >
        <div
          className={`max-w-[85%] rounded-lg px-3 py-2 ${
            isUser
              ? 'bg-blue-600 text-white'
              : isSystem
              ? 'bg-gray-100 text-gray-700 border border-gray-200'
              : isAutoGuidance
              ? 'bg-purple-50 text-purple-900 border border-purple-200'
              : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
          }`}
        >
          {!isUser && (
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-4 w-4" />
              <span className="text-xs font-medium">
                {isSystem ? 'System' : isAutoGuidance ? 'Auto-Guidance' : 'AI Coach'}
              </span>
              {message.metadata?.confidence && (
                <Badge variant="secondary" className="text-xs">
                  {Math.round(message.metadata.confidence * 100)}%
                </Badge>
              )}
            </div>
          )}
          <p className="text-sm leading-relaxed">{message.content}</p>
          {message.metadata?.suggestions && message.metadata.suggestions.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.metadata.suggestions.map((suggestion, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="text-xs h-6 px-2"
                  onClick={() => setNewMessage(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}
          <div className="text-xs opacity-60 mt-1">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Resize Handle */}
      <div
        ref={resizeRef}
        className={`fixed bg-gray-200 hover:bg-blue-400 transition-colors cursor-col-resize z-40 ${
          isResizing ? 'bg-blue-400' : ''
        }`}
        onMouseDown={handleMouseDown}
        style={{ 
          top: '64px', // Match sidebar top offset
          height: 'calc(100vh - 64px)', // Match sidebar height
          width: '4px', // Make it slightly wider for easier grabbing
          right: isCollapsed ? `${collapsedWidth}px` : `${width}px` 
        }}
      />

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed right-0 bg-white border-l border-gray-200 flex flex-col transition-all duration-300 ease-in-out z-30 ${
          isExpanded ? 'z-50' : ''
        }`}
        style={{ 
          top: '64px', // Account for main page header height
          height: 'calc(100vh - 64px)', // Adjust height accordingly
          width: isExpanded ? '100vw' : isCollapsed ? `${collapsedWidth}px` : `${width}px`,
          maxWidth: isExpanded ? '100vw' : `${maxWidth}px`
        }}
      >
        {!isCollapsed && (
          <>
            {/* Compact Control Bar */}
            <div className="flex items-center justify-between px-3 pt-6 pb-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">AI Coach</span>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status.color} ${status.pulse ? 'animate-pulse' : ''}`} />
                <span className="text-xs text-gray-500">{status.text}</span>
                {isRecording && (
                  <span className="text-xs font-mono text-gray-500">
                    {formatDuration(sessionDuration)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Minimize' : 'Maximize'}
                >
                  {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  onClick={() => setIsCollapsed(true)}
                  title="Collapse"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Recording Controls */}
            <div className="p-3 bg-white border-b border-gray-100">
              {/* Audio Level Indicator - only show when recording */}
              {isRecording && !isPaused && (
                <div className="flex items-center gap-2 mb-2">
                  <Volume2 className="h-3.5 w-3.5 text-gray-400" />
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-full rounded-full transition-all duration-150"
                      style={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex gap-1.5">
                {!isRecording ? (
                  <Button 
                    onClick={onStartRecording} 
                    size="sm" 
                    className="flex-1"
                  >
                    <Mic className="h-3.5 w-3.5 mr-1.5" />
                    Start Recording
                  </Button>
                ) : (
                  <>
                    {!isPaused ? (
                      <Button 
                        onClick={onPauseRecording} 
                        size="sm" 
                        variant="outline"
                        className="h-8 w-8 p-0"
                        title="Pause"
                      >
                        <Pause className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button 
                        onClick={onResumeRecording} 
                        size="sm" 
                        variant="outline"
                        className="h-8 w-8 p-0"
                        title="Resume"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button 
                      onClick={onStopRecording} 
                      size="sm" 
                      variant="destructive"
                      className="flex-1"
                    >
                      <MicOff className="h-3.5 w-3.5 mr-1.5" />
                      Stop
                    </Button>
                    <Button 
                      onClick={onRestartSession} 
                      size="sm" 
                      variant="outline"
                      className="h-8 w-8 p-0"
                      title="Restart"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Start recording to get AI guidance</p>
                  <p className="text-xs mt-2">I'll provide real-time coaching and feedback</p>
                </div>
              ) : (
                <>
                  {messages.map(renderMessage)}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Quick Help Actions */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gray-50">
              <h4 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                Quick Help
              </h4>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewMessage("What should I ask next?")}
                  className="text-xs h-8 bg-white hover:bg-gray-50 border-gray-300 justify-start"
                >
                  💡 What to ask?
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewMessage("How am I doing so far?")}
                  className="text-xs h-8 bg-white hover:bg-gray-50 border-gray-300 justify-start"
                >
                  📊 How am I doing?
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewMessage("Key points to cover")}
                  className="text-xs h-8 bg-white hover:bg-gray-50 border-gray-300 justify-start"
                >
                  🎯 Key points
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewMessage("Summarize the conversation so far")}
                  className="text-xs h-8 bg-white hover:bg-gray-50 border-gray-300 justify-start"
                >
                  📝 Summarize
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewMessage("Help me handle objections")}
                  className="text-xs h-7 bg-white hover:bg-gray-50 border-gray-300 justify-start"
                >
                  🛡️ Handle objections
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewMessage("How should I close this conversation?")}
                  className="text-xs h-7 bg-white hover:bg-gray-50 border-gray-300 justify-start"
                >
                  🎯 Close conversation
                </Button>
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask the AI coach anything..."
                  className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                  rows={1}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  size="sm"
                  className="px-4"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Collapsed State Content */}
        {isCollapsed && (
          <div className="flex-1 flex flex-col items-center justify-center p-2 space-y-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-800 w-full justify-center h-8"
              onClick={() => setIsCollapsed(false)}
              title="Expand AI Coach"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Brain className="h-8 w-8 text-blue-600" />
            {isRecording && (
              <div className={`w-3 h-3 rounded-full ${status.color} ${status.pulse ? 'animate-pulse' : ''}`} />
            )}
            {messages.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {messages.length}
              </Badge>
            )}
          </div>
        )}
      </div>
    </>
  );
} 