import React from 'react';
import { Card } from '@/components/ui/Card';

export default function SummaryLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <header className="bg-card/95 backdrop-blur-sm border-b border-border px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Back button skeleton */}
            <div className="w-24 h-9 bg-muted animate-pulse rounded-md" />
            
            <div>
              {/* Title skeleton */}
              <div className="w-64 h-6 bg-muted animate-pulse rounded-md mb-2" />
              {/* Meta info skeleton */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-4 bg-muted animate-pulse rounded-md" />
                <div className="w-20 h-4 bg-muted animate-pulse rounded-md" />
                <div className="w-24 h-4 bg-muted animate-pulse rounded-md" />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Export button skeleton */}
            <div className="w-20 h-9 bg-muted animate-pulse rounded-md" />
            {/* Share button skeleton */}
            <div className="w-20 h-9 bg-muted animate-pulse rounded-md" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Skeleton */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              {/* Quick Stats title */}
              <div className="w-32 h-5 bg-muted animate-pulse rounded-md mb-4" />
              
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i}>
                    <div className="w-24 h-3 bg-muted animate-pulse rounded-md mb-2" />
                    <div className="w-32 h-4 bg-muted animate-pulse rounded-md" />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Main Content Skeleton */}
          <div className="lg:col-span-3 space-y-6">
            {/* TL;DR Card */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-20 h-5 bg-muted animate-pulse rounded-md" />
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="w-full h-4 bg-amber-200/50 dark:bg-amber-800/50 animate-pulse rounded-md" />
              </div>
            </Card>

            {/* AI Summary Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-32 h-5 bg-muted animate-pulse rounded-md" />
                <div className="w-16 h-8 bg-muted animate-pulse rounded-md" />
              </div>
              
              {/* Summary text skeleton */}
              <div className="space-y-2 mb-6">
                <div className="w-full h-4 bg-muted animate-pulse rounded-md" />
                <div className="w-full h-4 bg-muted animate-pulse rounded-md" />
                <div className="w-3/4 h-4 bg-muted animate-pulse rounded-md" />
              </div>
              
              {/* Key Points skeleton */}
              <div className="mt-6">
                <div className="w-24 h-4 bg-muted animate-pulse rounded-md mb-3" />
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-muted rounded-full mt-2 flex-shrink-0" />
                      <div className={`h-4 bg-muted animate-pulse rounded-md ${i === 3 ? 'w-2/3' : 'w-full'}`} />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Action Items skeleton */}
              <div className="mt-6">
                <div className="w-32 h-4 bg-muted animate-pulse rounded-md mb-3" />
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-4 h-4 border-2 border-muted rounded mt-0.5 flex-shrink-0" />
                      <div className={`h-4 bg-muted animate-pulse rounded-md ${i === 2 ? 'w-5/6' : 'w-full'}`} />
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Performance Metrics Card */}
            <Card className="p-6">
              <div className="w-40 h-5 bg-muted animate-pulse rounded-md mb-4" />
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-muted/50 rounded-lg p-4">
                    <div className="w-32 h-3 bg-muted animate-pulse rounded-md mb-2" />
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted rounded-full h-2" />
                      <div className="w-10 h-4 bg-muted animate-pulse rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Transcript Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div className="w-32 h-5 bg-muted animate-pulse rounded-md" />
                <div className="flex items-center gap-2">
                  <div className="w-16 h-4 bg-muted animate-pulse rounded-md" />
                  <div className="w-5 h-5 bg-muted animate-pulse rounded-md" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}