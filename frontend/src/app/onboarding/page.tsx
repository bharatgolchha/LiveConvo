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

interface OnboardingData {
  organization_name: string;
  timezone: string;
  use_case: string;
  acquisition_source: string;
  calendar_connected: boolean;
  auto_join_enabled: boolean;
  auto_record_enabled: boolean;
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, session } = useAuth();
  const { completeOnboarding, isLoading, error: onboardingError } = useOnboarding();
  const [invitationToken, setInvitationToken] = useState('');
  
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
  const [invitationData, setInvitationData] = useState<any>(null);
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
      auto_join_enabled: false,
      auto_record_enabled: false
    };
  });

  const totalSteps = invitationToken ? 2 : 4; // Invited users skip some steps
  const redirectUrl = searchParams.get('redirect') || '/dashboard';
  const stepParam = searchParams.get('step');
  const subscribedParam = searchParams.get('subscribed');
  const invitationParam = searchParams.get('invitation');

  useEffect(() => {
    // Set invitation token if present
    if (invitationParam) {
      setInvitationToken(invitationParam);
    }
  }, [invitationParam]);

  useEffect(() => {
    // Check if user has already completed onboarding
    const checkOnboardingStatus = async () => {
      if (!user || !session) {
        // If we are unauthenticated, unblock UI to avoid endless spinner
        setCheckingStatus(false);
        return;
      }
      
      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('has_completed_onboarding')
          .eq('id', user.id)
          .single();
        
        if (!error && userData?.has_completed_onboarding) {
          console.log('User already completed onboarding, redirecting...');
          router.push(redirectUrl);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkOnboardingStatus();
  }, [user, session, router, redirectUrl]);

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

  const handleNext = () => {
    if (currentStep < totalSteps) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('onboardingStep', nextStep.toString());
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('onboardingStep', prevStep.toString());
      }
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
      
      // If not onboarded, complete the onboarding process
      const result = await completeOnboarding({
        organization_name: onboardingData.organization_name,
        timezone: onboardingData.timezone,
        use_case: onboardingData.use_case,
        acquisition_source: onboardingData.acquisition_source,
        invitation_token: invitationToken || undefined
      });
      
      console.log('✅ Onboarding completed successfully:', result);
      
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
    // For invited users, show simplified flow
    if (invitationToken) {
      switch (currentStep) {
        case 1:
          return (
            <WelcomeStep
              data={onboardingData}
              updateData={updateData}
              onNext={handleNext}
              isInvited={true}
              invitationData={invitationData}
            />
          );
        case 2:
          return (
            <UseCaseStep
              data={onboardingData}
              updateData={updateData}
              onNext={handleComplete}
              onBack={handleBack}
              isLastStep={true}
            />
          );
        default:
          return null;
      }
    }

    // Regular onboarding flow
    switch (currentStep) {
      case 1:
        return (
          <WelcomeStep
            data={onboardingData}
            updateData={updateData}
            onNext={handleNext}
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
            onNext={handleNext}
            onBack={handleBack}
            isLastStep={false}
          />
        );
      case 4:
        return (
          <UpgradeStep
            onUpgrade={handleComplete}
            onSkip={handleComplete}
            onBack={handleBack}
            isLoading={isLoading}
          />
        );
      default:
        return null;
    }
  };

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
      <OnboardingLayout currentStep={currentStep} totalSteps={totalSteps}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
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