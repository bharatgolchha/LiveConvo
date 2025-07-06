import React, { useState } from 'react';
import { PlusIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { NewConversationButton } from './NewConversationButton';

interface Props {
  onNewConversation: () => void;
  onNewMeeting?: () => void;
}

// Professional icon-based illustration for empty state
const ConversationIllustration: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.8, ease: "easeOut" }}
    className="mx-auto mb-12"
  >
    <div className="relative">
      <div className="w-32 h-32 bg-gradient-to-br from-app-primary/10 to-app-primary-dark/10 rounded-full flex items-center justify-center">
        <div className="w-24 h-24 bg-gradient-to-br from-app-primary/20 to-app-primary-dark/20 rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 text-app-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      </div>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        className="absolute -right-2 -top-2 w-8 h-8 bg-app-success rounded-full flex items-center justify-center"
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </motion.div>
    </div>
  </motion.div>
);

// Learn More Modal Component
const LearnMoreModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-card border border-border/50 rounded-2xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <QuestionMarkCircleIcon className="w-6 h-6 text-app-primary" />
            <h3 className="text-xl font-semibold text-foreground">Learn More</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="text-muted-foreground space-y-3">
          <p>
            This modal will contain helpful information about getting started with Liveprompt.ai.
          </p>
          <p className="text-sm italic">
            Content to be added by the user...
          </p>
        </div>
        
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-app-primary to-app-primary-dark hover:from-app-primary-dark hover:to-app-primary text-primary-foreground rounded-lg transition-all hover:shadow-md"
          >
            Got it
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const EmptyState: React.FC<Props> = ({ onNewConversation, onNewMeeting }) => {
  const [isLearnMoreOpen, setIsLearnMoreOpen] = useState(false);

  return (
    <>
      <motion.div 
        className="flex flex-col items-center justify-center h-full py-12 px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Illustration */}
        <ConversationIllustration />
        
        {/* Content */}
        <div className="text-center max-w-2xl space-y-6">
          <motion.h1 
            className="text-4xl font-semibold text-foreground tracking-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Start Your First Conversation
          </motion.h1>
          
          <motion.p 
            className="text-muted-foreground text-xl leading-relaxed max-w-xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Transform your meetings with AI-powered real-time coaching and intelligent conversation insights.
          </motion.p>
        </div>
        
        {/* Action buttons */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 mt-10 items-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {onNewMeeting ? (
            <NewConversationButton
              onNewConversation={onNewConversation}
              onNewMeeting={onNewMeeting}
            />
          ) : (
            <button
              onClick={onNewConversation}
              className="flex items-center justify-center space-x-2 bg-app-primary hover:bg-app-primary-dark text-primary-foreground px-8 py-3.5 rounded-lg transition-all font-medium text-base shadow-sm hover:shadow-md"
            >
              <PlusIcon className="w-5 h-5" />
              <span>New Conversation</span>
            </button>
          )}
          
          <button
            onClick={() => setIsLearnMoreOpen(true)}
            className="flex items-center justify-center space-x-2 text-muted-foreground hover:text-foreground px-6 py-3 rounded-lg transition-all"
          >
            <QuestionMarkCircleIcon className="w-5 h-5" />
            <span className="font-medium">Learn More</span>
          </button>
        </motion.div>
        
        {/* Features hint */}
        <motion.div 
          className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-5xl w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {[
            { 
              icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              ),
              title: "Real-time AI Coaching", 
              desc: "Get intelligent suggestions and guidance during your conversations"
            },
            { 
              icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              ),
              title: "Live Transcription", 
              desc: "Accurate speech-to-text with automatic speaker identification"
            },
            { 
              icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
              title: "Smart Summaries", 
              desc: "Automatic insights, action items, and comprehensive meeting notes"
            }
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              className="relative group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + index * 0.1 }}
            >
              <div className="bg-card border border-border/50 rounded-xl p-8 h-full transition-all duration-300 hover:shadow-lg hover:border-app-primary/30 hover:-translate-y-1">
                <div className="w-12 h-12 bg-app-primary/10 rounded-lg flex items-center justify-center mb-5 text-app-primary">
                  {feature.icon}
                </div>
                
                <h3 className="font-semibold text-foreground mb-2 text-lg">
                  {feature.title}
                </h3>
                
                <p className="text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
      
      {/* Learn More Modal */}
      <LearnMoreModal 
        isOpen={isLearnMoreOpen} 
        onClose={() => setIsLearnMoreOpen(false)} 
      />
    </>
  );
};

export default EmptyState; 