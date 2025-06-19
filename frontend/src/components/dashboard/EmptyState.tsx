import React, { useState } from 'react';
import { PlusIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

interface Props {
  onNewConversation: () => void;
}

// Elegant SVG illustration for empty state
const ConversationIllustration: React.FC = () => (
  <motion.svg
    width="240"
    height="240"
    viewBox="0 0 240 240"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.8, ease: "easeOut" }}
    className="mx-auto mb-8"
  >
    <defs>
      {/* Main gradient for microphone */}
      <linearGradient id="micGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="50%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#d946ef" />
      </linearGradient>
      
      {/* Secondary gradient for accent elements */}
      <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#06b6d4" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
      
      {/* Glow effect */}
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      
      {/* Subtle background gradient */}
      <radialGradient id="backgroundGlow" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="rgba(99, 102, 241, 0.08)" />
        <stop offset="100%" stopColor="rgba(99, 102, 241, 0.02)" />
      </radialGradient>
    </defs>
    
    {/* Background glow */}
    <circle cx="120" cy="120" r="100" fill="url(#backgroundGlow)" />
    
    {/* Floating AI particles */}
    <motion.g
      animate={{ 
        rotate: 360,
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: "linear"
      }}
    >
      {[...Array(8)].map((_, i) => (
        <motion.circle
          key={i}
          cx={120 + Math.cos((i * Math.PI) / 4) * 60}
          cy={120 + Math.sin((i * Math.PI) / 4) * 60}
          r="2"
          fill="url(#accentGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut"
          }}
        />
      ))}
    </motion.g>
    
    {/* Main microphone body */}
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.6, type: "spring", stiffness: 200 }}
    >
      {/* Microphone capsule */}
      <rect 
        x="100" 
        y="80" 
        width="40" 
        height="60" 
        rx="20" 
        fill="url(#micGradient)" 
        filter="url(#glow)"
      />
      
      {/* Microphone grille lines */}
      {[...Array(5)].map((_, i) => (
        <line
          key={i}
          x1="108"
          y1={88 + i * 8}
          x2="132"
          y2={88 + i * 8}
          stroke="rgba(255, 255, 255, 0.4)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
      
      {/* Microphone stand */}
      <rect x="115" y="140" width="10" height="30" rx="5" fill="url(#micGradient)" opacity="0.8" />
      <rect x="105" y="165" width="30" height="8" rx="4" fill="url(#micGradient)" opacity="0.6" />
    </motion.g>
    
    {/* Sound waves */}
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
    >
      {[...Array(3)].map((_, i) => (
        <motion.path
          key={i}
          d={`M ${155 + i * 12} 110 Q ${170 + i * 12} 120 ${155 + i * 12} 130`}
          stroke="url(#accentGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: [0, 1, 0],
            opacity: [0, 0.8, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut"
          }}
        />
      ))}
      
      {[...Array(3)].map((_, i) => (
        <motion.path
          key={`left-${i}`}
          d={`M ${85 - i * 12} 110 Q ${70 - i * 12} 120 ${85 - i * 12} 130`}
          stroke="url(#accentGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: [0, 1, 0],
            opacity: [0, 0.8, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.3 + 0.5,
            ease: "easeInOut"
          }}
        />
      ))}
    </motion.g>
    
    {/* AI sparkles */}
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
    >
      {[
        { x: 80, y: 70, delay: 0 },
        { x: 160, y: 85, delay: 0.5 },
        { x: 75, y: 150, delay: 1 },
        { x: 165, y: 155, delay: 1.5 }
      ].map((sparkle, i) => (
        <motion.g
          key={i}
          initial={{ scale: 0, rotate: 0 }}
          animate={{ 
            scale: [0, 1, 0],
            rotate: [0, 180, 360]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: sparkle.delay,
            ease: "easeInOut"
          }}
        >
          <path
            d={`M ${sparkle.x} ${sparkle.y - 8} L ${sparkle.x + 2} ${sparkle.y - 2} L ${sparkle.x + 8} ${sparkle.y} L ${sparkle.x + 2} ${sparkle.y + 2} L ${sparkle.x} ${sparkle.y + 8} L ${sparkle.x - 2} ${sparkle.y + 2} L ${sparkle.x - 8} ${sparkle.y} L ${sparkle.x - 2} ${sparkle.y - 2} Z`}
            fill="url(#accentGradient)"
            opacity="0.7"
          />
        </motion.g>
      ))}
    </motion.g>
  </motion.svg>
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
        className="bg-background border border-border rounded-xl p-6 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-2">
            <QuestionMarkCircleIcon className="w-6 h-6 text-primary" />
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
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Got it
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const EmptyState: React.FC<Props> = ({ onNewConversation }) => {
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
          className="flex flex-col sm:flex-row gap-3 mt-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={onNewConversation}
            className="flex items-center justify-center space-x-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-all transform hover:scale-105 shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="font-medium">Start Your First Conversation</span>
          </button>
          
          <button
            onClick={() => setIsLearnMoreOpen(true)}
            className="flex items-center justify-center space-x-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-lg hover:bg-secondary/80 transition-all border border-border"
          >
            <QuestionMarkCircleIcon className="w-5 h-5" />
            <span className="font-medium">Learn More</span>
          </button>
        </motion.div>
        
        {/* Features hint */}
        <motion.div 
          className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-5xl w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {[
            { 
              icon: "🤖", 
              title: "Real-time AI Advisor", 
              desc: "Get live AI coaching and guidance during your conversations",
              gradient: "from-indigo-500/10 via-purple-500/10 to-pink-500/10",
              borderGradient: "from-indigo-500/20 via-purple-500/20 to-pink-500/20",
              iconBg: "from-indigo-500/20 to-purple-500/20"
            },
            { 
              icon: "🎙️", 
              title: "Live Transcription", 
              desc: "Real-time speech-to-text with speaker identification",
              gradient: "from-cyan-500/10 via-blue-500/10 to-indigo-500/10",
              borderGradient: "from-cyan-500/20 via-blue-500/20 to-indigo-500/20",
              iconBg: "from-cyan-500/20 to-blue-500/20"
            },
            { 
              icon: "📋", 
              title: "Smart Summaries", 
              desc: "Auto-generated insights, action items, and follow-ups",
              gradient: "from-emerald-500/10 via-teal-500/10 to-cyan-500/10",
              borderGradient: "from-emerald-500/20 via-teal-500/20 to-cyan-500/20",
              iconBg: "from-emerald-500/20 to-teal-500/20"
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
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.borderGradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              {/* Card content */}
              <div className={`relative bg-gradient-to-br ${feature.gradient} backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-full transition-all duration-300 group-hover:translate-y-[-2px] group-hover:shadow-xl`}>
                {/* Icon with gradient background */}
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.iconBg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <div className="text-2xl">{feature.icon}</div>
                </div>
                
                {/* Title */}
                <h3 className="font-semibold text-foreground mb-2 text-base">
                  {feature.title}
                </h3>
                
                {/* Description */}
                <p className="text-sm text-muted-foreground/80 leading-relaxed">
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