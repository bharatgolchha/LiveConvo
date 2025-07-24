import React from 'react';

interface GlowingLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function GlowingLoader({ 
  message = "Loading meeting...", 
  size = 'lg',
  className = ""
}: GlowingLoaderProps) {
  const sizeConfig = {
    sm: { containerSize: 'w-12 h-12', strokeWidth: 2, fontSize: 'text-sm' },
    md: { containerSize: 'w-16 h-16', strokeWidth: 2.5, fontSize: 'text-base' },
    lg: { containerSize: 'w-20 h-20', strokeWidth: 3, fontSize: 'text-lg' }
  };

  const config = sizeConfig[size];

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen bg-background ${className}`}>
      <div className="flex flex-col items-center space-y-8">
        {/* Minimalist Circular Loader */}
        <div className="relative">
          {/* Main SVG loader */}
          <svg
            className={`${config.containerSize} relative`}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth={config.strokeWidth}
              className="text-border"
              fill="none"
            />
            
            {/* Animated circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth={config.strokeWidth}
              strokeLinecap="round"
              strokeDasharray="70 200"
              fill="none"
              className="text-primary animate-spin origin-center"
              style={{
                animationDuration: '2s',
                animationTimingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
              }}
            />
          </svg>
        </div>

        {/* Loading text */}
        <div className="text-center space-y-3">
          <p className={`text-muted-foreground ${config.fontSize}`}>
            {message}
          </p>
          <div className="flex items-center justify-center space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1 h-1 bg-muted-foreground rounded-full opacity-40"
                style={{
                  animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Inline keyframes for dot animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 60%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          30% {
            opacity: 1;
            transform: scale(1.3);
          }
        }
      `}</style>
    </div>
  );
} 