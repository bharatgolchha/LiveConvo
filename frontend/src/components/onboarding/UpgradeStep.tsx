'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowRight, Sparkles, Zap, Shield, ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface UpgradeStepProps {
  onUpgrade: () => void;
  onSkip: () => void;
  onBack: () => void;
  isLoading?: boolean;
  // Prefetched trial/pricing data
  preFetchedEligibility?: boolean;
  preFetchedPriceId?: string;
  preFetchedTrialDays?: number;
  // Personalization & progress
  useCase?: string;
  currentStep?: number;
  totalSteps?: number;
}

export function UpgradeStep({ onUpgrade, onSkip, onBack, isLoading, preFetchedEligibility, preFetchedPriceId, preFetchedTrialDays, useCase, currentStep, totalSteps }: UpgradeStepProps) {
  const [isEligibleForTrial, setIsEligibleForTrial] = useState(preFetchedEligibility ?? true);
  const [checkingEligibility, setCheckingEligibility] = useState(preFetchedEligibility === undefined);
  const [isProcessing, setIsProcessing] = useState(false);
  const [priceIdOverride, setPriceIdOverride] = useState<string | null>(preFetchedPriceId ?? null);
  const [planIdOverride, setPlanIdOverride] = useState<string | null>(null);
  const [trialDaysOverride, setTrialDaysOverride] = useState<number | null>(preFetchedTrialDays ?? null);
  const router = useRouter();

  useEffect(() => {
    if (preFetchedEligibility !== undefined) {
      setIsEligibleForTrial(preFetchedEligibility);
      setCheckingEligibility(false);
    } else {
      checkTrialEligibility();
    }
  }, [preFetchedEligibility]);

  const checkTrialEligibility = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCheckingEligibility(false);
        return;
      }

      const response = await fetch('/api/trials/check-eligibility', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsEligibleForTrial(data.eligible);
      }
    } catch (error) {
      console.error('Error checking trial eligibility:', error);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleStartTrial = async () => {
    setIsProcessing(true);
    try {
      // Instead of showing pricing modal, directly redirect to checkout
      // with a return URL that completes onboarding
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/signup');
        return;
      }

      // Resolve the Pro plan price and id (prefer prefetched)
      let priceId = priceIdOverride;
      let planId = planIdOverride;
      let trialDays = trialDaysOverride ?? 0;
      if (!priceId || !planId) {
        const response = await fetch('/api/pricing');
        if (!response.ok) {
          throw new Error('Failed to fetch pricing plans');
        }
        const data = await response.json();
        const plans = data.plans || [];
        const proPlan = plans.find((p: any) => p.slug === 'pro' || p.slug === 'individual_pro' || p.name === 'Pro');
        if (!proPlan) {
          alert('Pro plan not found. Please contact support.');
          setIsProcessing(false);
          return;
        }
        priceId = proPlan.stripe?.monthlyPriceId || null;
        planId = proPlan.id || null;
        trialDays = proPlan.trial?.enabled ? (proPlan.trial?.days || 7) : 0;
        setPriceIdOverride(priceId);
        setPlanIdOverride(planId);
        setTrialDaysOverride(trialDays);
      }

      if (!priceId || !planId) {
        alert('Pro plan pricing not configured. Please contact support.');
        setIsProcessing(false);
        return;
      }
      
      const origin = window.location.origin;
      // Return to onboarding to complete the process AND track the conversion
      // Stripe will automatically replace {CHECKOUT_SESSION_ID} with the actual session ID
      const returnUrl = `${origin}/onboarding?step=complete&subscribed=true&session_id={CHECKOUT_SESSION_ID}`;

      // Create checkout session with return URL
      const checkoutResponse = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          priceId: priceId,
          planId: planId,
          billingCycle: 'monthly',
          returnUrl: returnUrl,
          trialDays: trialDays || 0
        })
      });

      if (!checkoutResponse.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await checkoutResponse.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error starting trial:', error);
      alert('Failed to start trial. Please try again.');
      setIsProcessing(false);
    }
  };

  // Personalized bullets based on use case
  const personalizedBullets: string[] = (() => {
    switch (useCase) {
      case 'sales':
        return [
          'Auto-generated deal notes and next steps',
          'CRM-ready summaries after each call',
          'Real-time objection handling cues',
        ];
      case 'interviews':
        return [
          'Structured notes by question and candidate',
          'Highlights and timestamps for quick review',
          'Shareable recap for your panel',
        ];
      case 'meetings':
        return [
          'Auto action items with owners and due dates',
          'Prep context before your calls',
          'Instant recap to share with your team',
        ];
      case 'education':
        return [
          'Lecture notes with key takeaways',
          'Timestamped highlights for revision',
          'Shareable summaries for classmates',
        ];
      case 'podcasts':
        return [
          'Episode show notes and chapters',
          'Pull quotes and highlights for socials',
          'Searchable transcripts for your archive',
        ];
      default:
        return [
          'AI-powered transcription and summaries',
          'Action items and next steps automatically',
          'Unlimited access to Nova AI assistant',
        ];
    }
  })();

  const effectiveTrialDays = trialDaysOverride ?? preFetchedTrialDays ?? 7;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="text-center mb-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex p-2.5 bg-gradient-to-br from-app-primary/10 to-app-primary/5 rounded-full mb-3"
        >
          <Sparkles className="w-5 h-5 text-app-primary" />
        </motion.div>
        
        <h2 className="text-2xl font-bold mb-1">
          Start your {effectiveTrialDays}-day Pro trial
        </h2>
        <p className="text-muted-foreground text-sm">
          Full Pro features. Cancel anytime. You won’t be charged today.
        </p>
        {currentStep && totalSteps ? (
          <p className="text-xs text-muted-foreground mt-1">Step {currentStep} of {totalSteps} • Almost done</p>
        ) : null}
      </div>

      {/* Pro Plan Card */}
      <div className="max-w-md mx-auto">
        <Card className="p-5 mb-6 relative overflow-hidden border border-border bg-card">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
              FREE TRIAL
            </div>
            <div className="absolute top-0 left-0 ml-0 mt-0">
              <span className="inline-block bg-purple-600/90 text-white text-[10px] font-semibold tracking-wide px-2 py-1 rounded-br-lg">
                PRO PLAN
              </span>
            </div>
            
            <div className="space-y-3">
              {/* Trial Info */}
              <div className="text-center py-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 mb-3">
                    <span className="text-3xl font-bold text-green-600">7</span>
                  </div>
                  <p className="text-lg font-semibold">Days Free on Pro</p>
                  <p className="text-sm text-muted-foreground">Cancel anytime • No charge today</p>
                </div>
              </div>

              {/* Personalized Feature List */}
              <div className="border-t border-border/50 pt-4">
                <div className="space-y-2">
                  {personalizedBullets.map((text, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

        {/* Actions */}
        <div className="flex gap-3 items-center flex-wrap sm:flex-nowrap">
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={isLoading}
            className="flex-shrink-0"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>

          <Button
            onClick={handleStartTrial}
            disabled={isLoading || checkingEligibility || isProcessing}
            className="flex-1 min-w-[200px] bg-gradient-to-r from-app-primary to-app-primary-dark hover:from-app-primary-dark hover:to-app-primary text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {checkingEligibility || isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {isProcessing ? 'Processing...' : 'Loading'}
              </>
            ) : (
              <>
                Start {effectiveTrialDays}-day Pro Trial
                <ArrowRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>

          {/* Explicit secondary path */}
          <Button
            variant="outline"
            onClick={onSkip}
            disabled={isLoading}
            className="flex-1 min-w-[200px]"
          >
            Continue on Free plan
          </Button>
        </div>
        <div className="text-center mt-2">
          <button onClick={onSkip} className="text-xs text-muted-foreground hover:underline">
            Maybe later
          </button>
        </div>

        {/* Assurance */}
        <p className="text-xs text-muted-foreground text-center mt-3">Includes all Pro features during trial • Takes less than 10 seconds</p>

        {/* Trust Row */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center text-[11px] text-muted-foreground">
          <div className="flex items-center justify-center gap-1">
            <Shield className="w-3.5 h-3.5" />
            Bank-level security
          </div>
          <div className="flex items-center justify-center gap-1">
            <Zap className="w-3.5 h-3.5" />
            99.9% uptime
          </div>
          <div className="flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Loved by teams
          </div>
        </div>
      </div>
    </div>
  );
}