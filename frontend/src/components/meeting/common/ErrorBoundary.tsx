import React, { Component, ReactNode } from 'react';
import { AlertTriangleIcon, RefreshCwIcon } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <div className="text-center space-y-4 max-w-md">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full">
              <AlertTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Something went wrong
              </h3>
              <p className="text-sm text-muted-foreground">
                {this.state.error?.message || 'An unexpected error occurred. Please try again.'}
              </p>
            </div>
            
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <RefreshCwIcon className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorFallback({ 
  error, 
  resetError 
}: { 
  error: Error; 
  resetError: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[200px] p-4">
      <div className="text-center space-y-3">
        <AlertTriangleIcon className="w-8 h-8 text-red-500 mx-auto" />
        <p className="text-sm text-muted-foreground">
          {error.message}
        </p>
        <button
          onClick={resetError}
          className="text-xs text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    </div>
  );
}