'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { WelcomeStep } from '@/components/onboarding/WelcomeStep';
import { UseCaseStep } from '@/components/onboarding/UseCaseStep';
import { CalendarStep } from '@/components/onboarding/CalendarStep';
import { UpgradeStep } from '@/components/onboarding/UpgradeStep';
import { useOnboarding } from '@/lib/hooks/useOnboarding';
import { supabase } from '@/lib/supabase';
import { CheckoutSuccessHandler } from '@/components/checkout/CheckoutSuccessHandler';
import { trackEvent, setUserProperties } from '@/lib/analytics/tracking';

interface OnboardingData {
  organization_name: string;
  timezone: string;
  use_case: string;
  acquisition_source: string;
  calendar_connected: boolean;
  auto_join_enabled: boolean;
  auto_record_enabled: boolean;
  auto_email_summary_enabled: boolean;
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, session } = useAuth();
  const { completeOnboarding, isLoading, error: onboardingError } = useOnboarding();
  
  const [currentStep, setCurrentStep] = useState(() => {
    // Try to restore current step from sessionStorage
    if (typeof window !== 'undefined') {
      const savedStep = sessionStorage.getItem('onboardingStep');
      if (savedStep) {
        const step = parseInt(savedStep);
        if (!isNaN(step) && step >= 1 && step <= 4) {
          console.log('📍 Restored onboarding step:', step);
          return step;
        }
      }
    }
    return 1;
  });
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isInvited, setIsInvited] = useState<boolean>(false);
  const [invitedOrgName, setInvitedOrgName] = useState<string | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(() => {
    // Try to restore from sessionStorage
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('onboardingData');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          console.log('📂 Restored onboarding data from session:', parsed);
          return parsed;
        } catch (e) {
          console.error('Failed to parse saved onboarding data:', e);
        }
      }
    }
    
    return {
      organization_name: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      use_case: '',
      acquisition_source: '',
      calendar_connected: false,
      auto_join_enabled: true,
      auto_record_enabled: true,
      auto_email_summary_enabled: true
    };
  });

  const totalSteps = isInvited ? 3 : 4;
  // Default redirect after onboarding completion
  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  const stepParam = searchParams.get('step');
  const subscribedParam = searchParams.get('subscribed');

  // Prefetched trial/pricing info to avoid friction on step 4
  const [trialEligible, setTrialEligible] = useState<boolean | null>(null);
  const [prefetchedPriceId, setPrefetchedPriceId] = useState<string | null>(null);
  const [prefetchedTrialDays, setPrefetchedTrialDays] = useState<number | null>(null);
  const [prefetchingTrialData, setPrefetchingTrialData] = useState<boolean>(false);
  
  // Clamp step if invited (no payment step)
  useEffect(() => {
    if (isInvited && currentStep > 3) {
      setCurrentStep(3);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('onboardingStep', '3');
      }
    }
  }, [isInvited, currentStep]);

  useEffect(() => {
    // Check if user has already completed onboarding
    const checkOnboardingStatus = async () => {
      if (!user || !session) {
        // If we are unauthenticated, unblock UI to avoid endless spinner
        setCheckingStatus(false);
        return;
      }
      
      try {
        // Check if user has a pending invite by email and reflect UI immediately
        try {
          if (session?.access_token) {
            const res = await fetch('/api/team/invitations/resolve-by-email', {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            })
            if (res.ok) {
              const info = await res.json().catch(() => ({}))
              if (info?.invited) {
                setIsInvited(true)
                if (info?.organization_name) setInvitedOrgName(info.organization_name)
              }
            }
          }
        } catch {}

        // Then attempt auto-accept by email (idempotent)
        let invited = false
        let invitedName: string | null = null
        try {
          if (session?.access_token) {
            const resp = await fetch('/api/team/accept/by-email', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            })
            if (resp.ok) {
              const data = await resp.json().catch(() => ({}))
              if (data?.success && data?.invited) {
                invited = true
                invitedName = (data?.organization_name as string | undefined) || null
              }
            }
          }
        } catch {}

        // Check current onboarding status
        const { data: userData, error } = await supabase
          .from('users')
          .select('has_completed_onboarding,current_organization_id')
          .eq('id', user.id)
          .single();

        // Only redirect if onboarding is actually completed
        if (!error && userData?.has_completed_onboarding) {
          router.push(redirectUrl);
          return;
        }

        // If the by-email acceptance succeeded during this run, reflect invited state
        if (invited) {
          setIsInvited(true)
          if (invitedName) setInvitedOrgName(invitedName)
        }

        // Do not auto-redirect on current_organization_id alone; invited users should still see onboarding steps
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkOnboardingStatus();
  }, [user, session, router, redirectUrl]);

  

  // Prefetch trial eligibility and pricing as soon as possible
  useEffect(() => {
    const prefetch = async () => {
      if (!session) return;
      try {
        setPrefetchingTrialData(true);
        // Run both in parallel
        const [eligibilityResp, pricingResp] = await Promise.all([
          fetch('/api/trials/check-eligibility', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          }),
          fetch('/api/pricing')
        ]);

        if (eligibilityResp.ok) {
          const data = await eligibilityResp.json();
          setTrialEligible(!!data.eligible || !!data.isEligible);
        }

        if (pricingResp.ok) {
          const data = await pricingResp.json();
          const plans = data.plans || [];
          const proPlan = plans.find((p: any) => p.slug === 'pro' || p.slug === 'individual_pro' || p.name === 'Pro');
          if (proPlan) {
            const priceId = proPlan.stripe?.monthlyPriceId || null;
            setPrefetchedPriceId(priceId);
            const days = proPlan.trial?.enabled ? (proPlan.trial?.days || 7) : null;
            setPrefetchedTrialDays(days);
          }
        }
      } catch (e) {
        // Best-effort prefetch; fallback flows exist in UpgradeStep
        console.error('Prefetch trial/pricing failed', e);
      } finally {
        setPrefetchingTrialData(false);
      }
    };

    if (user && session && trialEligible === null && prefetchedPriceId === null) {
      prefetch();
    }
  }, [user, session, trialEligible, prefetchedPriceId]);

  const updateData = useCallback((data: Partial<OnboardingData>) => {
    setOnboardingData(prev => {
      const updated = { ...prev, ...data };
      // Save to sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('onboardingData', JSON.stringify(updated));
        console.log('💾 Saved onboarding data to session:', updated);
      }
      return updated;
    });
  }, []);

  // Prefill a sensible default organization name to remove friction
  useEffect(() => {
    if (user && !onboardingData.organization_name) {
      const email = user.email || '';
      const first = (user.user_metadata?.full_name as string | undefined)?.split(' ')[0]
        || email.split('@')[0]
        || 'My';
      updateData({ organization_name: `${first}'s Workspace` });
    }
  }, [user, onboardingData.organization_name, updateData]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('onboardingStep', nextStep.toString());
      }
      try { trackEvent('onboarding_continue', 'onboarding', { from_step: currentStep, to_step: nextStep }); } catch {}
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('onboardingStep', prevStep.toString());
      }
      try { trackEvent('onboarding_back', 'onboarding', { from_step: currentStep, to_step: prevStep }); } catch {}
    }
  };

  const handleComplete = useCallback(async () => {
    if (!user) return;
    
    console.log('🚀 Starting onboarding completion for user:', user.id);
    console.log('📋 Onboarding data:', onboardingData);
    
    try {
      // Check if user has already completed onboarding
      const { data: userData, error: checkError } = await supabase
        .from('users')
        .select('has_completed_onboarding')
        .eq('id', user.id)
        .single();

      if (!checkError && userData?.has_completed_onboarding) {
        console.log('✅ User already completed onboarding, saving preferences only');
        
        // If already onboarded, just save calendar preferences if needed
        if (onboardingData.calendar_connected && session?.access_token) {
          try {
            const response = await fetch('/api/calendar/preferences', {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                auto_join_enabled: onboardingData.auto_join_enabled,
                auto_record_enabled: onboardingData.auto_record_enabled,
                join_buffer_minutes: 2,
                notify_before_join: true,
                notification_minutes: 5
              })
            });

            if (!response.ok) {
              console.error('❌ Failed to save calendar preferences:', response.status);
            } else {
              console.log('✅ Calendar preferences saved successfully');
            }
          } catch (error) {
            console.error('❌ Error saving calendar preferences:', error);
          }
        }
        
        // Redirect to dashboard
        console.log('🔄 Redirecting to:', redirectUrl);
        router.push(redirectUrl);
        return;
      }

      console.log('📝 User has not completed onboarding, proceeding with onboarding...');

      let result: any = null;
      if (isInvited) {
        // Invited users already have an org set; mark onboarding complete and save preferences only
        await supabase
          .from('users')
          .update({ has_completed_onboarding: true })
          .eq('id', user.id);
      } else {
        // If not invited, complete org creation flow
        result = await completeOnboarding({
          organization_name: onboardingData.organization_name,
          timezone: onboardingData.timezone,
          use_case: onboardingData.use_case,
          acquisition_source: onboardingData.acquisition_source
        });
      }
      
      console.log('✅ Onboarding completed successfully:', result);
      try { trackEvent('onboarding_completed', 'onboarding'); } catch {}
      
      // Save calendar preferences after successful onboarding
      if (onboardingData.calendar_connected && session?.access_token) {
        try {
          console.log('💾 Saving calendar preferences...');
          const response = await fetch('/api/calendar/preferences', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              auto_join_enabled: onboardingData.auto_join_enabled,
              auto_record_enabled: onboardingData.auto_record_enabled,
              auto_email_summary_enabled: onboardingData.auto_email_summary_enabled,
              join_buffer_minutes: 2,
              notify_before_join: true,
              notification_minutes: 5
            })
          });

          if (!response.ok) {
            console.error('❌ Failed to save calendar preferences:', response.status);
          } else {
            console.log('✅ Calendar preferences saved successfully');
          }
        } catch (error) {
          console.error('❌ Error saving calendar preferences:', error);
        }
      }
      
      // Clear sessionStorage on successful completion
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('onboardingData');
        sessionStorage.removeItem('onboardingStep');
        console.log('🧹 Cleared onboarding session data');
      }
      
      console.log('🔄 Redirecting to:', redirectUrl);
      router.push(redirectUrl);
    } catch (error) {
      console.error('❌ Failed to complete onboarding:', error);
      // Don't redirect on error, show the error to user
      alert('Failed to complete onboarding. Please check the console for details.');
    }
  }, [user, onboardingData, completeOnboarding, router, redirectUrl, session]);

  useEffect(() => {
    // Handle return from Stripe checkout
    if (stepParam === 'complete' && subscribedParam === 'true' && user && !checkingStatus) {
      console.log('User returned from checkout, completing onboarding...');
      handleComplete();
    }
  }, [stepParam, subscribedParam, user, checkingStatus, handleComplete]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <WelcomeStep
            data={onboardingData}
            updateData={updateData}
            onNext={handleNext}
            isInvited={isInvited}
            invitedOrgName={invitedOrgName}
          />
        );
      case 2:
        return (
          <UseCaseStep
            data={onboardingData}
            updateData={updateData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <CalendarStep
            data={onboardingData}
            updateData={updateData}
            onComplete={handleComplete}
            onNext={handleNext}
            onBack={handleBack}
            isLastStep={isInvited}
          />
        );
      case 4:
        return (
          <UpgradeStep
            onUpgrade={handleComplete}
            onSkip={handleComplete}
            onBack={handleBack}
            isLoading={isLoading}
            // Prefetched data to eliminate spinner friction
            preFetchedEligibility={trialEligible ?? undefined}
            preFetchedPriceId={prefetchedPriceId ?? undefined}
            preFetchedTrialDays={prefetchedTrialDays ?? undefined}
            useCase={onboardingData.use_case}
            currentStep={currentStep}
            totalSteps={totalSteps}
          />
        );
      default:
        return null;
    }
  };

  // Track step views and set user properties when available
  useEffect(() => {
    try {
      trackEvent('onboarding_view', 'onboarding', { step: currentStep });
      if (onboardingData.use_case || onboardingData.acquisition_source) {
        setUserProperties({
          use_case: onboardingData.use_case || undefined,
          acquisition_source: onboardingData.acquisition_source || undefined,
          timezone: onboardingData.timezone || undefined,
        });
      }
    } catch {}
  }, [currentStep, onboardingData.use_case, onboardingData.acquisition_source, onboardingData.timezone]);

  // Show loading state while checking onboarding status
  if (checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-app-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <CheckoutSuccessHandler />
      <OnboardingLayout currentStep={currentStep} totalSteps={totalSteps} onSkip={handleComplete}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {isInvited && (
              <div className="px-8 pt-6">
                <div className="mb-4 rounded-lg border border-app-success/30 bg-app-success/10 p-3 text-sm text-app-success">
                  You were invited{invitedOrgName ? ` to join ${invitedOrgName}` : ''}. Payment is managed by your team, so we’ll skip the upgrade step.
                </div>
              </div>
            )}
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </OnboardingLayout>
    </>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-app-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}