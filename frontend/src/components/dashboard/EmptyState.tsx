import React, { useState } from 'react';
import { PlusIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { NewConversationButton } from './NewConversationButton';

interface Props {
  onNewConversation: () => void;
  onNewMeeting?: () => void;
}

// Elegant logo illustration for empty state
const ConversationIllustration: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.8, ease: "easeOut" }}
    className="mx-auto mb-8"
  >
    <img
      src="https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images//LogoSquare%20LivePrompt.png"
      alt="LivePrompt Logo"
      width={240}
      height={240}
      className="rounded-2xl shadow-lg"
    />
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
        <div className="text-center max-w-lg space-y-4">
          <motion.h2 
            className="text-2xl font-bold text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Welcome to Liveprompt.ai
          </motion.h2>
          
          <motion.p 
            className="text-muted-foreground text-lg leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Start your first AI-powered conversation to capture insights, generate summaries, and keep track of important discussions.
          </motion.p>
        </div>
        
        {/* Action buttons */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 mt-8 items-center"
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
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-app-primary to-app-primary-dark hover:from-app-primary-dark hover:to-app-primary text-primary-foreground px-6 py-3 rounded-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <PlusIcon className="w-5 h-5" />
              <span className="font-medium">Start Your First Conversation</span>
            </button>
          )}
          
          <button
            onClick={() => setIsLearnMoreOpen(true)}
            className="flex items-center justify-center space-x-2 bg-card text-foreground px-6 py-3 rounded-lg hover:bg-muted transition-all border border-border hover:border-app-primary/50 min-w-[140px] hover:scale-105 transform"
          >
            <QuestionMarkCircleIcon className="w-5 h-5" />
            <span className="font-medium">Learn More</span>
          </button>
        </motion.div>
        
        {/* Features hint */}
        <motion.div 
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {[
            { 
              icon: "🤖", 
              title: "Real-time AI Advisor", 
              desc: "Get live AI coaching and guidance during your conversations",
              gradient: "from-app-primary/10 via-app-primary-light/10 to-app-success/10",
              borderGradient: "from-app-primary/20 via-app-primary-light/20 to-app-success/20",
              iconBg: "from-app-primary/20 to-app-primary-dark/20"
            },
            { 
              icon: "🎙️", 
              title: "Live Transcription", 
              desc: "Real-time speech-to-text with speaker identification",
              gradient: "from-app-success/10 via-app-success-light/10 to-app-primary/10",
              borderGradient: "from-app-success/20 via-app-success-light/20 to-app-primary/20",
              iconBg: "from-app-success/20 to-app-success-light/20"
            },
            { 
              icon: "📋", 
              title: "Smart Summaries", 
              desc: "Auto-generated insights, action items, and follow-ups",
              gradient: "from-app-primary-light/10 via-app-success/10 to-app-primary/10",
              borderGradient: "from-app-primary-light/20 via-app-success/20 to-app-primary/20",
              iconBg: "from-app-primary-light/20 to-app-primary/20"
            }
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              className="relative group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + index * 0.1 }}
            >
              {/* Gradient border wrapper */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.borderGradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm`} />
              
              {/* Card content */}
              <div className={`relative glass bg-gradient-to-br ${feature.gradient} backdrop-blur-md border border-border/30 rounded-2xl p-6 h-full transition-all duration-300 group-hover:translate-y-[-4px] group-hover:shadow-2xl group-hover:border-border/50`}>
                {/* Icon with gradient background */}
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.iconBg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                  <div className="text-2xl filter drop-shadow-md">{feature.icon}</div>
                </div>
                
                {/* Title */}
                <h3 className="font-semibold text-foreground mb-2 text-base">
                  {feature.title}
                </h3>
                
                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.desc}
                </p>
                
                {/* Subtle shine effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-2xl pointer-events-none" />
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