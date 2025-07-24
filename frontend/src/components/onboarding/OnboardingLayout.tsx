'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import Image from 'next/image';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  children,
  currentStep,
  totalSteps
}) => {
  const { resolvedTheme } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
      
      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <div className="mb-8">
              <div className="flex items-center justify-center mb-12">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: -20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.6,
                    ease: [0.21, 0.47, 0.32, 0.98]
                  }}
                >
                  <Image
                    src={
                      resolvedTheme === 'dark'
                        ? '/Logos/DarkMode.png'
                        : '/Logos/LightMode.png'
                    }
                    alt="liveprompt.ai"
                    width={200}
                    height={45}
                    className="object-contain"
                    priority
                  />
                </motion.div>
              </div>

              <div className="flex items-center justify-center gap-2 mb-8">
                {Array.from({ length: totalSteps }, (_, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <div
                        className={`h-0.5 w-12 transition-colors duration-300 ${
                          i < currentStep ? 'bg-app-primary' : 'bg-border'
                        }`}
                      />
                    )}
                    <motion.div
                      initial={false}
                      animate={{
                        scale: i + 1 === currentStep ? 1.2 : 1,
                        backgroundColor: i + 1 <= currentStep 
                          ? 'hsl(var(--app-primary))' 
                          : 'hsl(var(--border))'
                      }}
                      transition={{ duration: 0.3 }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        i + 1 <= currentStep ? 'text-white' : 'text-muted-foreground'
                      }`}
                    >
                      {i + 1}
                    </motion.div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden"
            >
              {children}
            </motion.div>
          </div>
        </div>

        <div className="text-center py-4 text-sm text-muted-foreground">
          <p>Need help? Contact us at support@liveprompt.ai</p>
        </div>
      </div>
    </div>
  );
};