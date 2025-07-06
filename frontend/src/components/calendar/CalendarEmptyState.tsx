'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CalendarIcon, 
  CalendarDaysIcon,
  CheckCircleIcon,
  PlusIcon,
  ArrowRightIcon,
  ClockIcon,
  UserGroupIcon,
  BellAlertIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

interface CalendarEmptyStateProps {
  onConnectCalendar: () => void;
  isConnecting?: boolean;
}

const CalendarIllustration: React.FC = () => (
  <motion.svg
    width="200"
    height="200"
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.8, ease: "easeOut" }}
    className="mx-auto mb-6"
  >
    <defs>
      <linearGradient id="calendarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0B3D2E" className="[stop-color:hsl(var(--app-primary))]" />
        <stop offset="50%" stopColor="#125239" className="[stop-color:hsl(var(--app-primary-dark))]" />
        <stop offset="100%" stopColor="#6BB297" className="[stop-color:hsl(var(--app-primary-light))]" />
      </linearGradient>
      
      <linearGradient id="googleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4285F4" />
        <stop offset="25%" stopColor="#34A853" />
        <stop offset="50%" stopColor="#FBBC05" />
        <stop offset="100%" stopColor="#EA4335" />
      </linearGradient>
      
      <filter id="calendarGlow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge> 
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      
      <radialGradient id="bgGlow" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stopColor="#0B3D2E" stopOpacity="0.08" className="[stop-color:hsl(var(--app-primary))]" />
        <stop offset="100%" stopColor="#0B3D2E" stopOpacity="0.02" className="[stop-color:hsl(var(--app-primary))]" />
      </radialGradient>
    </defs>
    
    <circle cx="100" cy="100" r="90" fill="url(#bgGlow)" />
    
    <motion.g
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.6, type: "spring", stiffness: 200 }}
    >
      <rect 
        x="50" 
        y="50" 
        width="100" 
        height="100" 
        rx="12" 
        fill="url(#calendarGradient)" 
        filter="url(#calendarGlow)"
      />
      
      <rect x="50" y="50" width="100" height="25" rx="12" fill="rgba(255, 255, 255, 0.1)" />
      <rect x="50" y="65" width="100" height="10" fill="url(#calendarGradient)" opacity="0.8" />
      
      <circle cx="70" cy="62" r="3" fill="#fff" opacity="0.8" />
      <circle cx="130" cy="62" r="3" fill="#fff" opacity="0.8" />
      
      {[...Array(5)].map((_, row) => 
        [...Array(7)].map((_, col) => {
          const x = 60 + col * 12;
          const y = 85 + row * 12;
          const isHighlighted = (row === 1 && col === 3) || (row === 2 && col === 5);
          return (
            <rect 
              key={`${row}-${col}`}
              x={x} 
              y={y} 
              width="8" 
              height="8" 
              rx="2" 
              fill={isHighlighted ? "rgba(255, 255, 255, 0.9)" : "rgba(255, 255, 255, 0.3)"}
            />
          );
        })
      )}
    </motion.g>
    
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.6 }}
    >
      {[
        { x: 40, y: 40, delay: 0 },
        { x: 160, y: 45, delay: 0.5 },
        { x: 35, y: 160, delay: 1 },
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
            d={`M ${sparkle.x} ${sparkle.y - 6} L ${sparkle.x + 1.5} ${sparkle.y - 1.5} L ${sparkle.x + 6} ${sparkle.y} L ${sparkle.x + 1.5} ${sparkle.y + 1.5} L ${sparkle.x} ${sparkle.y + 6} L ${sparkle.x - 1.5} ${sparkle.y + 1.5} L ${sparkle.x - 6} ${sparkle.y} L ${sparkle.x - 1.5} ${sparkle.y - 1.5} Z`}
            fill="url(#googleGradient)"
            opacity="0.7"
          />
        </motion.g>
      ))}
    </motion.g>
    
    <motion.g
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.8, duration: 0.4 }}
    >
      <circle cx="130" cy="130" r="25" fill="#fff" className="shadow-lg" />
      <g transform="translate(130, 130)">
        <path d="M 0,-12 C 6.6,-12 12,-6.6 12,0 C 12,6.6 6.6,12 0,12 C -6.6,12 -12,6.6 -12,0 C -12,-6.6 -6.6,-12 0,-12 Z" fill="#4285F4" />
        <path d="M 0,-12 C 6.6,-12 12,-6.6 12,0 L 0,0 Z" fill="#34A853" />
        <path d="M 12,0 C 12,6.6 6.6,12 0,12 L 0,0 Z" fill="#FBBC05" />
        <path d="M 0,12 C -6.6,12 -12,6.6 -12,0 L 0,0 Z" fill="#EA4335" />
        <circle cx="0" cy="0" r="5" fill="#fff" />
      </g>
    </motion.g>
  </motion.svg>
);

const SampleMeetingCard: React.FC<{ delay: number }> = ({ delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 0.7, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="bg-muted/30 border border-border/30 rounded-lg p-3 backdrop-blur-sm"
  >
    <div className="flex items-start justify-between gap-2">
      <div className="flex-1">
        <div className="h-4 bg-muted/50 rounded w-3/4 mb-2" />
        <div className="flex items-center gap-2 text-xs">
          <div className="h-3 bg-muted/40 rounded w-16" />
          <div className="h-3 bg-muted/40 rounded w-12" />
        </div>
      </div>
      <div className="h-8 w-16 bg-muted/40 rounded" />
    </div>
  </motion.div>
);

export const CalendarEmptyState: React.FC<CalendarEmptyStateProps> = ({ 
  onConnectCalendar,
  isConnecting = false 
}) => {
  const [showBenefits, setShowBenefits] = useState(false);

  const benefits = [
    {
      icon: <BellAlertIcon className="w-5 h-5" />,
      title: "Smart Reminders",
      description: "Get notified before meetings start"
    },
    {
      icon: <UserGroupIcon className="w-5 h-5" />,
      title: "Auto-Join Meetings",
      description: "AI assistant joins automatically"
    },
    {
      icon: <CalendarDaysIcon className="w-5 h-5" />,
      title: "Meeting Insights",
      description: "Pre-meeting context and preparation"
    },
    {
      icon: <ClockIcon className="w-5 h-5" />,
      title: "Time Management",
      description: "Track meeting time and efficiency"
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-8 right-8 opacity-20">
          <SampleMeetingCard delay={0.5} />
        </div>
        <div className="absolute top-32 left-8 opacity-20">
          <SampleMeetingCard delay={0.7} />
        </div>
        <div className="absolute bottom-8 right-12 opacity-20">
          <SampleMeetingCard delay={0.9} />
        </div>
      </div>

      <div className="relative z-10 text-center max-w-sm">
        <CalendarIllustration />
        
        <motion.h3 
          className="text-xl font-semibold text-foreground mb-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Connect Your Calendar
        </motion.h3>
        
        <motion.p 
          className="text-muted-foreground text-sm mb-6 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Sync your Google Calendar to see upcoming meetings, enable auto-join, and get AI-powered meeting insights.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <Button
            onClick={onConnectCalendar}
            disabled={isConnecting}
            className="w-full bg-gradient-to-r from-app-primary to-app-primary-dark hover:from-app-primary-dark hover:to-app-primary text-primary-foreground shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            size="lg"
          >
            {isConnecting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 mr-2"
                >
                  <ArrowRightIcon />
                </motion.div>
                Connecting...
              </>
            ) : (
              <>
                <img src="https://ucvfgfbjcrxbzppwjpuu.supabase.co/storage/v1/object/public/images/7123030_google_calendar_icon.png" alt="Google Calendar" className="w-5 h-5 mr-2" />
                Connect Google Calendar
              </>
            )}
          </Button>

          <button
            onClick={() => setShowBenefits(!showBenefits)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showBenefits ? 'Hide' : 'Learn about'} the benefits
            <ArrowRightIcon className={`inline-block w-3 h-3 ml-1 transition-transform ${showBenefits ? 'rotate-90' : ''}`} />
          </button>
        </motion.div>

        {showBenefits && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 space-y-3"
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 text-left bg-muted/30 rounded-lg p-3 border border-border/30"
              >
                <div className="text-app-primary mt-0.5">
                  {benefit.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{benefit.title}</p>
                  <p className="text-xs text-muted-foreground">{benefit.description}</p>
                </div>
                <CheckCircleIcon className="w-4 h-4 text-app-success opacity-60 mt-0.5" />
              </motion.div>
            ))}
          </motion.div>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-xs text-muted-foreground mt-6"
        >
          We only access your calendar events. Your data is secure and encrypted.
        </motion.p>
      </div>
    </div>
  );
};