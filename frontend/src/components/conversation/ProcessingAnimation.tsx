'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain,
  Sparkles,
  CheckCircle
} from 'lucide-react';

interface ProcessingStage {
  id: string;
  label: string;
  icon: React.ElementType;
  duration: number;
}

const PROCESSING_STAGES: ProcessingStage[] = [
  {
    id: 'analyzing',
    label: 'Analyzing conversation',
    icon: Brain,
    duration: 3000,
  },
  {
    id: 'generating',
    label: 'Generating insights',
    icon: Sparkles,
    duration: 3000,
  },
  {
    id: 'finalizing',
    label: 'Finalizing summary',
    icon: CheckCircle,
    duration: 1500,
  }
];

interface ProcessingAnimationProps {
  className?: string;
}

export const ProcessingAnimation: React.FC<ProcessingAnimationProps> = ({ 
  className = '' 
}) => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalDuration = PROCESSING_STAGES.reduce((total, stage) => total + stage.duration, 0);
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += 50;
      const newProgress = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(newProgress);

      // Update current stage
      let cumulativeDuration = 0;
      for (let i = 0; i < PROCESSING_STAGES.length; i++) {
        cumulativeDuration += PROCESSING_STAGES[i].duration;
        if (elapsed <= cumulativeDuration) {
          setCurrentStageIndex(i);
          break;
        }
      }

      if (elapsed >= totalDuration) {
        clearInterval(timer);
      }
    }, 50);

    return () => clearInterval(timer);
  }, []);

  const currentStage = PROCESSING_STAGES[currentStageIndex];

  return (
    <div className={`h-full flex items-center justify-center ${className}`}>
      <div className="text-center">
        {/* Minimalist Icon Animation */}
        <div className="relative mb-12">
          <div className="w-24 h-24 mx-auto">
            {/* Subtle background pulse */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full blur-xl"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            {/* Icon container with smooth transitions */}
            <div className="relative w-full h-full flex items-center justify-center">
              <AnimatePresence mode="wait">
                {currentStage && (
                  <motion.div
                    key={currentStage.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"
                  >
                    <currentStage.icon className="w-8 h-8 text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Simple text with smooth transitions */}
        <AnimatePresence mode="wait">
          {currentStage && (
            <motion.div
              key={currentStage.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="mb-8"
            >
              <h3 className="text-lg font-medium text-foreground mb-2">
                {currentStage.label}
              </h3>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimal progress indicator */}
        <div className="w-48 mx-auto">
          <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}; 