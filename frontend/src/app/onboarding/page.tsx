'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { WelcomeStep } from '@/components/onboarding/WelcomeStep';
import { UseCaseStep } from '@/components/onboarding/UseCaseStep';
import { CalendarStep } from '@/components/onboarding/CalendarStep';
import { useOnboarding } from '@/lib/hooks/useOnboarding';
import { supabase } from '@/lib/supabase';

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
  const { completeOnboarding, isLoading } = useOnboarding();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    organization_name: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    use_case: '',
    acquisition_source: '',
    calendar_connected: false,
    auto_join_enabled: false,
    auto_record_enabled: false
  });

  const totalSteps = 3;
  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  useEffect(() => {
    // Check if user has already completed onboarding
    const checkOnboardingStatus = async () => {
      if (!user || !session) return;
      
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

  const updateData = (data: Partial<OnboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    
    try {
      // Check if user has already completed onboarding
      const { data: userData, error: checkError } = await supabase
        .from('users')
        .select('has_completed_onboarding')
        .eq('id', user.id)
        .single();

      if (!checkError && userData?.has_completed_onboarding) {
        console.log('User already completed onboarding, saving preferences only');
        
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
              console.error('Failed to save calendar preferences');
            }
          } catch (error) {
            console.error('Error saving calendar preferences:', error);
          }
        }
        
        // Redirect to dashboard
        router.push(redirectUrl);
        return;
      }

      // If not onboarded, complete the onboarding process
      await completeOnboarding({
        organization_name: onboardingData.organization_name,
        timezone: onboardingData.timezone,
        use_case: onboardingData.use_case,
        acquisition_source: onboardingData.acquisition_source
      });
      
      // Save calendar preferences after successful onboarding
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
            console.error('Failed to save calendar preferences');
          }
        } catch (error) {
          console.error('Error saving calendar preferences:', error);
        }
      }
      
      router.push(redirectUrl);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      // Still redirect even if there's an error
      router.push(redirectUrl);
    }
  };

  const renderStep = () => {
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
            onComplete={handleComplete}
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