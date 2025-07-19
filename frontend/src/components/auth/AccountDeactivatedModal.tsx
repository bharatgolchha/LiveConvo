'use client';

import { AlertTriangle } from 'lucide-react';

export function AccountDeactivatedModal() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop - not clickable */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal content */}
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col items-center text-center">
          {/* Icon */}
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          
          {/* Title */}
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            Account Deactivated
          </h2>
          
          {/* Message */}
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your account has been deactivated by an administrator. You no longer have access to this application.
          </p>
          
          {/* Contact info */}
          <div className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              If you believe this is an error, please contact support at:
            </p>
            <a 
              href="mailto:support@liveprompt.ai" 
              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
            >
              support@liveprompt.ai
            </a>
          </div>
          
          {/* Sign out button */}
          <button
            onClick={() => {
              // Clear local storage and redirect to login
              localStorage.clear();
              sessionStorage.clear();
              window.location.href = '/auth/login';
            }}
            className="mt-6 w-full px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors font-medium"
          >
            Return to Login
          </button>
        </div>
      </div>
    </div>
  );
}