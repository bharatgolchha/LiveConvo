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
}

export function UpgradeStep({ onUpgrade, onSkip, onBack, isLoading }: UpgradeStepProps) {
  const [isEligibleForTrial, setIsEligibleForTrial] = useState(true);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkTrialEligibility();
  }, []);

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

      // Get the Pro plan price ID
      const response = await fetch('/api/pricing');
      if (!response.ok) {
        throw new Error('Failed to fetch pricing plans');
      }
      
      const data = await response.json();
      const plans = data.plans || [];
      console.log('Pricing plans:', plans);
      
      const proPlan = plans.find((p: any) => p.slug === 'pro' || p.slug === 'individual_pro' || p.name === 'Pro');
      
      if (!proPlan) {
        console.error('Pro plan not found in:', plans);
        alert('Pro plan not found. Please contact support.');
        setIsProcessing(false);
        return;
      }

      const priceId = proPlan.stripe?.monthlyPriceId;
      if (!priceId) {
        console.error('No price ID found for Pro plan:', proPlan);
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
          planId: proPlan.id,
          billingCycle: 'monthly',
          returnUrl: returnUrl,
          trialDays: proPlan.trial?.enabled ? proPlan.trial?.days : 0
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
          Try Pro for Free
        </h2>
        <p className="text-muted-foreground text-sm">
          7 days of unlimited access • No credit card required
        </p>
      </div>

      {/* Pro Plan Card */}
      <div className="max-w-md mx-auto">
        <Card className="p-5 mb-6 relative overflow-hidden border border-border bg-card">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
              FREE TRIAL
            </div>
            
            <div className="space-y-3">
              {/* Trial Info */}
              <div className="text-center py-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 mb-3">
                    <span className="text-3xl font-bold text-green-600">7</span>
                  </div>
                  <p className="text-lg font-semibold">Days Free</p>
                  <p className="text-sm text-muted-foreground">Cancel anytime</p>
                </div>
              </div>

              {/* Simple Feature List */}
              <div className="border-t border-border/50 pt-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span>20 hours AI-powered meeting transcription per month</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span>Detailed meeting reports</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span>Unlimited access to Nova AI wizard</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

        {/* Actions */}
        <div className="flex gap-3">
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
              variant="outline"
              onClick={onSkip}
              disabled={isLoading}
              className="flex-1"
            >
              Maybe later
            </Button>
            
            <Button
              onClick={handleStartTrial}
              disabled={isLoading || checkingEligibility || isProcessing}
              className="flex-1 bg-gradient-to-r from-app-primary to-app-primary-dark hover:from-app-primary-dark hover:to-app-primary text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {checkingEligibility || isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {isProcessing ? 'Processing...' : 'Loading'}
                </>
              ) : (
                <>
                  Start Free Trial
                  <ArrowRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
        </div>
      </div>
    </div>
  );
}