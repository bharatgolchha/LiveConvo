'use client'

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Clock, Globe, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useOnboarding } from '@/lib/hooks/useOnboarding';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

/**
 * OnboardingModal Component
 * 
 * Beautiful onboarding modal that guides new users through setting up their organization
 * and assigns them to the free plan automatically.
 */
export function OnboardingModal({ isOpen, onClose, onComplete }: OnboardingModalProps) {
  const [organizationName, setOrganizationName] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const { completeOnboarding, isLoading, error } = useOnboarding();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await completeOnboarding({
        organization_name: organizationName || undefined,
        timezone,
      });
      
      onComplete();
    } catch (err) {
      // Error is handled by the hook
      console.error('Onboarding failed:', err);
    }
  };

  const handleSkip = async () => {
    try {
      await completeOnboarding();
      onComplete();
    } catch (err) {
      console.error('Onboarding failed:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-card text-card-foreground rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="relative p-6 text-center border-b border-border">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
                
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                </div>
                
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Welcome to liveprompt.ai!
                </h1>
                <p className="text-muted-foreground">
                  Let&apos;s set up your workspace to get you started with AI-powered conversations.
                </p>
              </div>

              {/* Content */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Organization Name */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-foreground">
                    <Building2 className="w-4 h-4 mr-2 text-blue-500" />
                    Organization Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="e.g. Acme Corp or John's Workspace"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-app-primary focus:border-app-primary transition-colors text-foreground placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to use a default name
                  </p>
                </div>

                {/* Timezone */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-foreground">
                    <Clock className="w-4 h-4 mr-2 text-green-500" />
                    Timezone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-app-primary focus:border-app-primary transition-colors text-foreground"
                  >
                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Paris (CET)</option>
                    <option value="Europe/Berlin">Berlin (CET)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                    <option value="Asia/Shanghai">Shanghai (CST)</option>
                    <option value="Asia/Kolkata">Mumbai (IST)</option>
                    <option value="Australia/Sydney">Sydney (AEST)</option>
                  </select>
                </div>

                {/* Free Plan Info */}
                <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start">
                    <Globe className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-green-900 dark:text-green-100 mb-1">
                        Starting with Free Plan
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        • 3 hours of audio processing per month<br />
                        • Up to 10 conversation sessions<br />
                        • Real-time AI guidance<br />
                        • Basic conversation summaries
                      </p>
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSkip}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Skip Setup
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-200"
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Setting up...
                      </div>
                    ) : (
                      'Complete Setup'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 