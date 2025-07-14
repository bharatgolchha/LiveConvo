'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, User, Bot, Sparkles, Volume2 } from 'lucide-react'
import { ConversationExample } from '@/types/how-it-works'

interface ConversationDemoProps {
  conversation: ConversationExample[]
  autoPlay?: boolean
  playbackSpeed?: number
}

export function ConversationDemo({ 
  conversation, 
  autoPlay = false,
  playbackSpeed = 1500 
}: ConversationDemoProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [showAiSuggestion, setShowAiSuggestion] = useState(false)
  
  useEffect(() => {
    if (!isPlaying) return
    
    const timer = setTimeout(() => {
      if (currentIndex < conversation.length - 1) {
        setCurrentIndex(currentIndex + 1)
        
        // Show AI suggestion if available
        if (conversation[currentIndex].aiSuggestion) {
          setShowAiSuggestion(true)
          setTimeout(() => setShowAiSuggestion(false), 2000)
        }
      } else {
        setIsPlaying(false)
      }
    }, playbackSpeed)
    
    return () => clearTimeout(timer)
  }, [currentIndex, isPlaying, conversation, playbackSpeed])
  
  const togglePlayback = () => {
    if (currentIndex >= conversation.length - 1) {
      setCurrentIndex(0)
    }
    setIsPlaying(!isPlaying)
  }
  
  const getSpeakerIcon = (speaker: string) => {
    switch (speaker) {
      case 'user':
        return <User className="w-4 h-4" />
      case 'prospect':
        return <Volume2 className="w-4 h-4" />
      case 'ai':
        return <Bot className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }
  
  const getSpeakerLabel = (speaker: string) => {
    switch (speaker) {
      case 'user':
        return 'You'
      case 'prospect':
        return 'Prospect'
      case 'ai':
        return 'AI Coach'
      default:
        return speaker
    }
  }
  
  const getSpeakerColor = (speaker: string) => {
    switch (speaker) {
      case 'user':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/30'
      case 'prospect':
        return 'bg-orange-500/20 text-orange-500 border-orange-500/30'
      case 'ai':
        return 'bg-app-success/20 text-app-success border-app-success/30'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }
  
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-medium text-foreground">Live Conversation</span>
        </div>
        <button
          onClick={togglePlayback}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-app-success/10 text-app-success hover:bg-app-success/20 transition-colors flex items-center gap-1.5"
        >
          {isPlaying ? 'Pause' : 'Play Demo'}
          <Mic className="w-3.5 h-3.5" />
        </button>
      </div>
      
      {/* Conversation */}
      <div className="p-6 space-y-4 min-h-[400px] relative">
        <AnimatePresence>
          {conversation.slice(0, currentIndex + 1).map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-3"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getSpeakerColor(message.speaker)}`}>
                {getSpeakerIcon(message.speaker)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {getSpeakerLabel(message.speaker)}
                  </span>
                  {message.timestamp && (
                    <span className="text-xs text-muted-foreground">
                      {message.timestamp}
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">
                  {message.text}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {/* AI Suggestion Popup */}
        <AnimatePresence>
          {showAiSuggestion && conversation[currentIndex]?.aiSuggestion && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3 }}
              className="absolute bottom-6 right-6 max-w-sm"
            >
              <div className="bg-app-success/10 border border-app-success/30 rounded-xl p-4 shadow-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-app-success" />
                  <span className="text-xs font-medium text-app-success">AI Suggestion</span>
                </div>
                <p className="text-sm text-foreground">
                  {conversation[currentIndex].aiSuggestion}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Progress Bar */}
      <div className="px-6 pb-4">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-app-success"
            animate={{ width: `${((currentIndex + 1) / conversation.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  )
}