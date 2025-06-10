'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Brain, FileText, CheckCircle } from 'lucide-react';

interface ProcessingStateProps {
  activeTab?: 'transcript' | 'summary' | 'guidance';
}

export const ProcessingState: React.FC<ProcessingStateProps> = ({
  activeTab = 'transcript',
}) => {
  const steps = [
    { label: 'Finalizing transcript', icon: FileText, duration: 2 },
    { label: 'Analyzing conversation', icon: Brain, duration: 3 },
    { label: 'Generating insights', icon: CheckCircle, duration: 2.5 },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full py-12">
      <div className="text-center max-w-lg mx-auto px-6">
        {/* Main Processing Animation */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0"
          >
            <RefreshCw className="w-32 h-32 text-purple-600" />
          </motion.div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
              <Brain className="w-10 h-10 text-purple-600" />
            </div>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-foreground mb-4">
          Processing Your Conversation
        </h2>
        
        <p className="text-lg text-muted-foreground mb-8">
          We're analyzing your conversation and generating comprehensive insights...
        </p>

        {/* Progress Steps */}
        <div className="space-y-4 mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.2 }}
                className="flex items-center gap-3 text-left"
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Icon className="w-5 h-5 text-purple-600" />
                  </div>
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-purple-600"
                    initial={{ scale: 1, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{
                      duration: step.duration,
                      repeat: Infinity,
                      delay: index * 0.5,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {step.label}
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Loading Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-purple-600"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 7.5, ease: "easeInOut" }}
          />
        </div>

        <p className="text-sm text-muted-foreground mt-4">
          This usually takes 10-15 seconds...
        </p>
      </div>
    </div>
  );
};