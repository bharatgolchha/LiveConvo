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
    sm: { containerSize: 'w-16 h-16', strokeWidth: 3, fontSize: 'text-sm' },
    md: { containerSize: 'w-20 h-20', strokeWidth: 4, fontSize: 'text-base' },
    lg: { containerSize: 'w-24 h-24', strokeWidth: 5, fontSize: 'text-lg' }
  };

  const config = sizeConfig[size];

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen bg-background ${className}`}>
      <div className="flex flex-col items-center space-y-6">
        {/* Glowing Circular Loader */}
        <div className="relative">
          {/* Outer glow effect */}
          <div className={`${config.containerSize} absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 animate-pulse`} />
          
          {/* Main SVG loader */}
          <svg
            className={`${config.containerSize} relative z-10`}
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
              className="text-muted/20"
              fill="none"
            />
            
            {/* Animated gradient circle */}
            <defs>
              <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0B3D2E" stopOpacity="1" />
                <stop offset="50%" stopColor="#6BB297" stopOpacity="1" />
                <stop offset="100%" stopColor="#FFC773" stopOpacity="1" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="url(#glowGradient)"
              strokeWidth={config.strokeWidth}
              strokeLinecap="round"
              strokeDasharray="70 200"
              fill="none"
              filter="url(#glow)"
              className="animate-spin origin-center"
              style={{
                animationDuration: '2s',
                animationTimingFunction: 'ease-in-out'
              }}
            />
            
            {/* Inner rotating dots */}
            <g className="animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}>
              <circle cx="50" cy="20" r="2" fill="url(#glowGradient)" opacity="0.8" />
              <circle cx="80" cy="50" r="2" fill="url(#glowGradient)" opacity="0.6" />
              <circle cx="50" cy="80" r="2" fill="url(#glowGradient)" opacity="0.4" />
              <circle cx="20" cy="50" r="2" fill="url(#glowGradient)" opacity="0.5" />
            </g>
          </svg>

          {/* Center pulse dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-gradient-to-r from-primary to-accent rounded-full animate-pulse" />
          </div>
        </div>

        {/* Loading text */}
        <div className="text-center space-y-2">
          <h3 className={`font-semibold text-foreground ${config.fontSize}`}>
            {message}
          </h3>
          <div className="flex items-center justify-center space-x-1">
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 bg-gradient-to-r from-primary to-accent rounded-full animate-bounce"
                  style={{
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: '1.5s'
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Custom styles for enhanced animations */}
      <style jsx>{`
        @keyframes gentlePulse {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
        
        .animate-gentle-pulse {
          animation: gentlePulse 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
} 