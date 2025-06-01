import React from 'react';
import { Clock, AlertCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsageDisplayProps {
  currentSessionTime: string;
  monthlyMinutesUsed: number;
  monthlyMinutesLimit: number;
  minutesRemaining: number;
  isApproachingLimit: boolean;
  isOverLimit: boolean;
  className?: string;
}

export function UsageDisplay({
  currentSessionTime,
  monthlyMinutesUsed,
  monthlyMinutesLimit,
  minutesRemaining,
  isApproachingLimit,
  isOverLimit,
  className
}: UsageDisplayProps) {
  const usagePercentage = monthlyMinutesLimit > 0 
    ? Math.min((monthlyMinutesUsed / monthlyMinutesLimit) * 100, 100)
    : 0;

  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Current Session Time */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Session
        </span>
        <span className="font-mono font-medium">{currentSessionTime}</span>
      </div>

      {/* Monthly Usage */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Monthly Usage
          </span>
          <span className={cn(
            "font-medium",
            isOverLimit && "text-destructive",
            isApproachingLimit && !isOverLimit && "text-warning"
          )}>
            {formatMinutes(monthlyMinutesUsed)} / {formatMinutes(monthlyMinutesLimit)}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "absolute left-0 top-0 h-full transition-all duration-300",
              isOverLimit ? "bg-destructive" :
              isApproachingLimit ? "bg-warning" :
              "bg-primary"
            )}
            style={{ width: `${usagePercentage}%` }}
          />
        </div>

        {/* Warning Messages */}
        {(isApproachingLimit || isOverLimit) && (
          <div className={cn(
            "flex items-start gap-2 text-xs mt-2 p-2 rounded-md",
            isOverLimit ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
          )}>
            <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <div>
              {isOverLimit ? (
                <span>Monthly limit exceeded. Upgrade to continue recording.</span>
              ) : (
                <span>Only {formatMinutes(minutesRemaining)} remaining this month.</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}