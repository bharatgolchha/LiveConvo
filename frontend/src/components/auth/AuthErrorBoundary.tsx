'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class AuthErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's an auth error
    if (
      error.message?.includes('Refresh Token') ||
      error.message?.includes('Invalid Refresh Token') ||
      error.name === 'AuthApiError'
    ) {
      return { hasError: true, error };
    }
    return { hasError: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Auth error caught by boundary:', error, errorInfo);
  }

  handleClearSession = () => {
    // Clear all auth-related storage
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      // Redirect to clear auth
      window.location.href = '/auth/clear';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-card border border-border rounded-lg shadow-lg p-6 text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Authentication Error
              </h2>
              
              <p className="text-muted-foreground mb-6">
                Your session has expired or become invalid. Please sign in again to continue.
              </p>
              
              <div className="space-y-3">
                <Button
                  onClick={this.handleClearSession}
                  className="w-full"
                  variant="primary"
                >
                  Sign In Again
                </Button>
                
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  className="w-full"
                >
                  Go to Homepage
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground mt-4">
                Error: {this.state.error?.message || 'Invalid authentication token'}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}