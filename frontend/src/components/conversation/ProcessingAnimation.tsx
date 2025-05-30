'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain,
  FileText,
  CheckCircle,
  Sparkles,
  Loader2
} from 'lucide-react';

interface ProcessingStage {
  id: string;
  label: string;
  icon: React.ElementType;
  duration: number; // in milliseconds
  color: string;
  description: string;
}

const PROCESSING_STAGES: ProcessingStage[] = [
  {
    id: 'analyzing',
    label: 'Analyzing Complete Conversation',
    icon: Brain,
    duration: 2000,
    color: 'blue',
    description: 'Reviewing the entire conversation flow and context'
  },
  {
    id: 'extracting',
    label: 'Extracting Final Insights',
    icon: FileText,
    duration: 1800,
    color: 'purple',
    description: 'Identifying key outcomes and important decisions'
  },
  {
    id: 'identifying',
    label: 'Organizing Action Items',
    icon: CheckCircle,
    duration: 1500,
    color: 'green',
    description: 'Compiling actionable tasks and follow-ups'
  },
  {
    id: 'generating',
    label: 'Creating Final Report',
    icon: Sparkles,
    duration: 2200,
    color: 'orange',
    description: 'Generating comprehensive final documentation'
  }
];

interface ProcessingAnimationProps {
  className?: string;
}

export const ProcessingAnimation: React.FC<ProcessingAnimationProps> = ({ 
  className = '' 
}) => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [completedStages, setCompletedStages] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const totalDuration = PROCESSING_STAGES.reduce((total, stage) => total + stage.duration, 0);
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += 100;
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

      // Mark completed stages
      let completedDuration = 0;
      const newCompletedStages = new Set<string>();
      for (let i = 0; i < PROCESSING_STAGES.length; i++) {
        completedDuration += PROCESSING_STAGES[i].duration;
        if (elapsed > completedDuration) {
          newCompletedStages.add(PROCESSING_STAGES[i].id);
        }
      }
      setCompletedStages(newCompletedStages);

      if (elapsed >= totalDuration) {
        clearInterval(timer);
      }
    }, 100);

    return () => clearInterval(timer);
  }, []);

  const currentStage = PROCESSING_STAGES[currentStageIndex];

  return (
    <div className={`h-full flex items-center justify-center ${className}`}>
      <div className="max-w-2xl mx-auto px-8 text-center">
        {/* Main Animation */}
        <div className="mb-8">
          <div className="relative w-32 h-32 mx-auto mb-8">
            {/* Progress Ring */}
            <svg className="w-32 h-32 -rotate-90 absolute inset-0" viewBox="0 0 128 128">
              <circle
                cx="64"
                cy="64"
                r="58"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-muted/20"
              />
              <motion.circle
                cx="64"
                cy="64"
                r="58"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="364.4"
                className="text-blue-500"
                initial={{ strokeDashoffset: 364.4 }}
                animate={{ strokeDashoffset: 364.4 - (progress / 100) * 364.4 }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
            </svg>

            {/* Center Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-100 to-blue-200/50 dark:from-blue-900/30 dark:to-blue-800/20 flex items-center justify-center ring-8 ring-blue-50 dark:ring-blue-900/20">
                <AnimatePresence mode="wait">
                  {currentStage && (
                    <motion.div
                      key={currentStage.id}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 180 }}
                      transition={{ duration: 0.3, type: "spring" }}
                    >
                      <currentStage.icon className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Floating Particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-blue-400 rounded-full"
                initial={{ scale: 0, x: 64, y: 64 }}
                animate={{
                  scale: [0, 1, 0],
                  x: 64 + Math.cos((i * Math.PI * 2) / 6) * 80,
                  y: 64 + Math.sin((i * Math.PI * 2) / 6) * 80,
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
              />
            ))}
          </div>

          {/* Current Stage Info */}
          <AnimatePresence mode="wait">
            {currentStage && (
              <motion.div
                key={currentStage.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-3"
              >
                <h2 className="text-3xl font-bold text-foreground mb-2">Finalizing Conversation</h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Creating your comprehensive final report with all insights and outcomes
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1, ease: "linear" }}
            />
          </div>
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>Processing</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
        </div>

        {/* Stage List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {PROCESSING_STAGES.map((stage, index) => {
            const isCompleted = completedStages.has(stage.id);
            const isCurrent = currentStageIndex === index;

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-xl border transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/50' 
                    : isCurrent
                    ? 'bg-blue-100/50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700/50 ring-2 ring-blue-200 dark:ring-blue-800/30'
                    : 'bg-muted/20 border-border/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isCompleted 
                      ? 'bg-green-500 text-white' 
                      : isCurrent
                      ? 'bg-blue-100 dark:bg-blue-800/30 text-blue-600 dark:text-blue-400'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <stage.icon className={`w-5 h-5 ${isCurrent ? 'animate-pulse' : ''}`} />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className={`font-semibold ${
                      isCompleted || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {stage.label}
                    </h3>
                    <p className={`text-sm ${
                      isCompleted || isCurrent ? 'text-muted-foreground' : 'text-muted-foreground/60'
                    }`}>
                      {stage.description}
                    </p>
                  </div>
                  {isCurrent && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="w-4 h-4 text-blue-500" />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Status Section */}
        <div className="text-center space-y-3">
          <h3 className="text-xl font-semibold text-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-app-primary" />
            {currentStage.label}
          </h3>
          <p className="text-muted-foreground">
            {currentStage.description}
          </p>
          <div className="pt-2">
            <span className="text-sm text-muted-foreground">
              Finalizing • This may take a few moments as our AI analyzes your entire conversation
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}; 