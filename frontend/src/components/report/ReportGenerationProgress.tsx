import React from 'react';
import { Loader2 } from 'lucide-react';

interface ReportGenerationProgressProps {
  step: string;
  progress: number;
  total: number;
}

export function ReportGenerationProgress({ step, progress, total }: ReportGenerationProgressProps) {
  const percentage = Math.round((progress / total) * 100);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 p-8">
      <div className="relative">
        <div className="w-24 h-24 border-4 border-primary/20 rounded-full"></div>
        <div 
          className="absolute inset-0 w-24 h-24 border-4 border-primary rounded-full animate-spin"
          style={{
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
            transform: `rotate(${(progress / total) * 360}deg)`,
            transition: 'transform 0.5s ease-in-out'
          }}
        ></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-primary">{percentage}%</span>
        </div>
      </div>
      
      <div className="text-center space-y-2 max-w-md">
        <h3 className="text-lg font-semibold text-foreground">Generating Report</h3>
        <p className="text-sm text-muted-foreground animate-pulse">{step}</p>
      </div>
      
      <div className="w-full max-w-md">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>Step {progress} of {total}</span>
          <span>{percentage}% complete</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Processing conversation data...</span>
      </div>
    </div>
  );
}