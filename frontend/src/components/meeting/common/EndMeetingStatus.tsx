import React, { useEffect, useState } from 'react';
import { CheckCircle, Loader2, AlertTriangle, Circle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EndMeetingStatusProps {
  isVisible: boolean;
  step: string;
  isSuccess: boolean;
  error?: string | null;
  currentStepIndex?: number;
}

interface ProcessStep {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
}

const PROCESS_STEPS: ProcessStep[] = [
  {
    id: 'stop-bot',
    label: 'Stopping Recording',
    description: 'Stopping bot and saving audio data',
    status: 'pending'
  },
  {
    id: 'finalize-session',
    label: 'Finalizing Session',
    description: 'Marking session as completed',
    status: 'pending'
  },
  {
    id: 'generate-summary',
    label: 'Generating Summary',
    description: 'Creating AI-powered meeting summary',
    status: 'pending'
  },
  {
    id: 'process-modules',
    label: 'Processing Analysis',
    description: 'Analyzing participants, decisions, and insights',
    status: 'pending'
  },
  {
    id: 'complete',
    label: 'Complete',
    description: 'Redirecting to your report',
    status: 'pending'
  }
];

export function EndMeetingStatus({ 
  isVisible, 
  step, 
  isSuccess, 
  error
}: EndMeetingStatusProps) {
  const [steps, setSteps] = useState<ProcessStep[]>(PROCESS_STEPS);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [startTime] = useState(() => Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setSteps(PROCESS_STEPS.map(s => ({ ...s, status: 'pending' })));
      setProgressPercentage(0);
      setElapsedTime(0);
      return;
    }

    // Update elapsed time
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [isVisible, startTime]);

  useEffect(() => {
    if (!isVisible) return;

    const updatedSteps = [...PROCESS_STEPS];
    let activeStepIndex = 0;

    // Map the step text to appropriate index
    if (step.includes('Preparing') || step.includes('Stopping recording')) {
      activeStepIndex = 0;
    } else if (step.includes('Bot stopped')) {
      activeStepIndex = 1;
    } else if (step.includes('Session marked') || step.includes('Finalizing')) {
      activeStepIndex = 1;
    } else if (step.includes('Generating') && step.includes('summary')) {
      activeStepIndex = 2;
    } else if (step.includes('Analyzing') || step.includes('Processing')) {
      activeStepIndex = 3;
    } else if (step.includes('successfully') || step.includes('Redirecting')) {
      activeStepIndex = 4;
    }

    updatedSteps.forEach((s, index) => {
      if (index < activeStepIndex) {
        s.status = 'completed';
      } else if (index === activeStepIndex) {
        s.status = error ? 'error' : 'in-progress';
      } else {
        s.status = 'pending';
      }
    });

    if (isSuccess) {
      updatedSteps.forEach(s => s.status = 'completed');
      setProgressPercentage(100);
    } else if (error) {
      setProgressPercentage((activeStepIndex / PROCESS_STEPS.length) * 100);
    } else {
      // Calculate progress based on completed steps + partial progress of current step
      const completedSteps = updatedSteps.filter(s => s.status === 'completed').length;
      const baseProgress = (completedSteps / PROCESS_STEPS.length) * 100;
      const stepProgress = (1 / PROCESS_STEPS.length) * 100;
      
      // Add partial progress for in-progress step
      if (updatedSteps.some(s => s.status === 'in-progress')) {
        setProgressPercentage(baseProgress + (stepProgress * 0.6)); // 60% through current step
      } else {
        setProgressPercentage(baseProgress);
      }
    }

    setSteps(updatedSteps);
  }, [step, isSuccess, error]);

  if (!isVisible) return null;

  const getStepIcon = (status: ProcessStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-300 dark:text-gray-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-4">
              {error ? (
                <AlertTriangle className="w-8 h-8 text-red-500" />
              ) : isSuccess ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              )}
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {error ? 'Error Occurred' : isSuccess ? 'Meeting Ended Successfully!' : 'Ending Meeting'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {error ? 'Something went wrong while ending the meeting' : 'Please wait while we process your meeting'}
            </p>
          </div>

          {/* Progress Steps */}
          <div className="space-y-3 mb-6">
            {steps.map((stepItem) => (
              <div 
                key={stepItem.id} 
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg transition-all duration-300",
                  stepItem.status === 'in-progress' && "bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800",
                  stepItem.status === 'completed' && "bg-green-50 dark:bg-green-900/10",
                  stepItem.status === 'error' && "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800"
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getStepIcon(stepItem.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "font-medium text-sm",
                    stepItem.status === 'completed' && "text-green-700 dark:text-green-400",
                    stepItem.status === 'in-progress' && "text-blue-700 dark:text-blue-400",
                    stepItem.status === 'error' && "text-red-700 dark:text-red-400",
                    stepItem.status === 'pending' && "text-gray-500 dark:text-gray-400"
                  )}>
                    {stepItem.label}
                  </div>
                  <div className={cn(
                    "text-xs mt-0.5",
                    stepItem.status === 'pending' ? "text-gray-400 dark:text-gray-500" : "text-gray-600 dark:text-gray-400"
                  )}>
                    {stepItem.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
              <span>Progress</span>
              <div className="flex items-center gap-3">
                <span>{Math.round(progressPercentage)}%</span>
                {!isSuccess && !error && (
                  <span className="text-gray-400 dark:text-gray-500">
                    {elapsedTime}s elapsed
                  </span>
                )}
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden relative">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${progressPercentage}%` }}
              >
                {/* Animated shimmer effect */}
                {!isSuccess && !error && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {isSuccess && (
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Your meeting has been successfully processed
              </p>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                <span className="animate-pulse">🎉</span>
                <span>Redirecting to your report...</span>
              </div>
            </div>
          )}

          {/* Current Status (for non-error, non-success states) */}
          {!error && !isSuccess && step && (
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">
                {step}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}