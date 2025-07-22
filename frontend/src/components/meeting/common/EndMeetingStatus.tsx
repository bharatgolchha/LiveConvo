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
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm animate-in fade-in-0 zoom-in-95 duration-200">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-3">
              {error ? (
                <AlertTriangle className="w-6 h-6 text-red-500" />
              ) : isSuccess ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {error ? 'Error Occurred' : isSuccess ? 'Meeting Ended' : 'Ending Meeting'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {error ? 'Something went wrong' : 'Processing...'}
            </p>
          </div>

          {/* Progress Steps - Compact */}
          <div className="space-y-2 mb-4">
            {steps.map((stepItem) => (
              <div 
                key={stepItem.id} 
                className={cn(
                  "flex items-center gap-2.5 p-2 rounded-lg transition-all duration-300",
                  stepItem.status === 'in-progress' && "bg-blue-50 dark:bg-blue-900/10",
                  stepItem.status === 'completed' && "opacity-60"
                )}
              >
                <div className="flex-shrink-0">
                  {stepItem.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  ) : stepItem.status === 'in-progress' ? (
                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  ) : stepItem.status === 'error' ? (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "text-sm",
                    stepItem.status === 'completed' && "text-gray-500 dark:text-gray-400",
                    stepItem.status === 'in-progress' && "text-gray-900 dark:text-white font-medium",
                    stepItem.status === 'error' && "text-red-600 dark:text-red-400",
                    stepItem.status === 'pending' && "text-gray-400 dark:text-gray-500"
                  )}>
                    {stepItem.label}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Progress Bar - Simplified */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              <span>{Math.round(progressPercentage)}%</span>
              {!isSuccess && !error && (
                <span>{elapsedTime}s</span>
              )}
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {isSuccess && (
            <div className="text-center">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Meeting ended successfully
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Redirecting...
              </p>
            </div>
          )}

          {/* Current Status (for non-error, non-success states) */}
          {!error && !isSuccess && step && (
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              {step}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}