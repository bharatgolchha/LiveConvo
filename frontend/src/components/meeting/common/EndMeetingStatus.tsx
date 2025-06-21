import React from 'react';
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react';

interface EndMeetingStatusProps {
  isVisible: boolean;
  step: string;
  isSuccess: boolean;
  error?: string | null;
}

export function EndMeetingStatus({ isVisible, step, isSuccess, error }: EndMeetingStatusProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[1000] max-w-sm animate-slide-up">
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-6">
        <div className="flex items-start gap-4">
          {/* Status Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {error ? (
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            ) : isSuccess ? (
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-bounce-once">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            ) : (
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 dark:text-white mb-1">
              {error ? 'Error' : isSuccess ? 'Success!' : 'Ending Meeting'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {error || step}
            </div>
            
            {/* Progress indicator for non-error states */}
            {!error && !isSuccess && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full animate-progress" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Success celebration */}
        {isSuccess && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 animate-fade-in-delayed">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <span>🎉</span>
              <span>Redirecting to your report...</span>
            </div>
          </div>
        )}
      </div>

      {/* Background overlay for errors */}
      {error && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10 animate-fade-in" />
      )}

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes bounce-once {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
        
        @keyframes progress {
          0% {
            width: 0%;
          }
          100% {
            width: 100%;
          }
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes fade-in-delayed {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        
        .animate-bounce-once {
          animation: bounce-once 0.5s ease-out;
        }
        
        .animate-progress {
          animation: progress 3s ease-in-out infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .animate-fade-in-delayed {
          animation: fade-in-delayed 0.4s ease-out 0.2s both;
        }
      `}</style>
    </div>
  );
} 