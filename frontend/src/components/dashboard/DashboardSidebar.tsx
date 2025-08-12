import React, { useState, useMemo, useEffect } from 'react';
import {
  MicrophoneIcon,
  ArchiveBoxIcon,
  Cog6ToothIcon,
  XMarkIcon,
  ShareIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Crown, Gift, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface UsageStats {
  monthlyAudioHours: number;
  monthlyAudioLimit: number;
  monthlyMinutesUsed?: number;
  monthlyMinutesLimit?: number;
  minutesRemaining?: number;
  totalSessions: number;
  completedSessions: number;
  activeSessions?: number;
  draftSessions?: number;
  archivedSessions?: number;
  sharedSessions?: number;
  monthlyBotMinutesUsed?: number;
  monthlyBotMinutesLimit?: number;
  session_minutes_used?: number;
}

interface DashboardSidebarProps {
  usageStats: UsageStats | null;
  activePath: string;
  onNavigate: (path: string) => void;
  currentUser: { plan: 'free' | 'pro' | 'team'; };
  onCloseMobile?: () => void;
  sharedCount?: number;
  isEligibleForTrial?: boolean;
  pendingCount?: number;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ usageStats, activePath, onNavigate, currentUser, onCloseMobile, sharedCount, isEligibleForTrial, pendingCount }) => {
  // Debug: Log the usageStats to see what's being passed
  React.useEffect(() => {
    if (usageStats) {
      console.log('📊 DashboardSidebar usageStats:', {
        monthlyMinutesUsed: usageStats.monthlyMinutesUsed,
        monthlyMinutesLimit: usageStats.monthlyMinutesLimit,
        minutesRemaining: usageStats.minutesRemaining,
        fullStats: usageStats
      });
    } else {
      console.log('📊 DashboardSidebar usageStats: null (loading)');
    }
  }, [usageStats]);

  // Use counts from stats instead of calculating from sessions
  const { archivedCount, activeCount } = useMemo(() => {
    if (!usageStats) {
      return { archivedCount: 0, activeCount: 0 };
    }
    // Use the counts from usageStats which has the full picture
    const archived = usageStats.archivedSessions || 0;
    // Active count should include all non-archived sessions (active + draft + completed)
    const active = (usageStats.activeSessions || 0) + 
                   (usageStats.draftSessions || 0) + 
                   (usageStats.completedSessions || 0);
    return { archivedCount: archived, activeCount: active };
  }, [usageStats]);

  // Format minutes to a human-friendly string
  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins === 0 ? `${hours} hr${hours !== 1 ? 's' : ''}` : `${hours} hr${hours !== 1 ? 's' : ''} ${mins} min`;
  };

  const navItems = [
    { path: 'conversations', label: 'Meetings', icon: MicrophoneIcon, count: activeCount },
    { path: 'people', label: 'People', icon: Users },
    { path: 'action_items', label: 'Action Items', icon: ClockIcon, count: pendingCount },
    { path: 'shared', label: 'Shared Meetings', icon: ShareIcon, count: sharedCount },
    { path: 'archive', label: 'Archive', icon: ArchiveBoxIcon, count: archivedCount },
    { path: 'settings', label: 'Settings', icon: Cog6ToothIcon },
  ];

  const monthlyMinutesUsed = usageStats?.monthlyMinutesUsed || 0;
  const monthlyMinutesLimit = usageStats?.monthlyMinutesLimit;
  const isUnlimited = monthlyMinutesLimit == null || monthlyMinutesLimit >= 999999;
  const usagePercentage = isUnlimited
    ? 0
    : Math.min(
        monthlyMinutesUsed / (monthlyMinutesLimit || 600) * 100,
        100,
      );

  const router = useRouter();

  return (
    <aside className="w-64 h-full bg-card border-r border-border flex flex-col">
      {/* Mobile Header with Close Button */}
      {onCloseMobile && (
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Menu</h2>
          <button
            onClick={onCloseMobile}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Close menu"
          >
            <XMarkIcon className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      )}
      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => onNavigate(item.path)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
              activePath === item.path ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            {item.count !== undefined && (
              <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom section with usage stats and upgrade button */}
      <div className="mt-auto">
        {/* Refer and Earn Button */}
        <div className="px-4 pb-3">
          <button
            onClick={() => onNavigate('referrals')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
              activePath === 'referrals' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Gift className="w-5 h-5" />
              <span className="text-sm font-medium">Refer and Earn</span>
            </div>
            <span className="text-xs bg-green-500/20 text-green-600 rounded-full px-2 py-0.5">
              $5
            </span>
          </button>
        </div>

        {/* Usage Stats - Now includes bot minutes */}
        <div className="px-4 py-3 border-t border-border">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Usage</span>
              <span className="font-medium">
                {isUnlimited ? 'Unlimited' : `${formatMinutes(monthlyMinutesUsed)} / ${formatMinutes(monthlyMinutesLimit || 0)}`}
              </span>
            </div>
            
            {!isUnlimited && (
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    usagePercentage >= 90 ? 'bg-destructive' : 
                    usagePercentage >= 75 ? 'bg-accent' : 
                    'bg-primary'
                  }`}
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                />
              </div>
            )}
            
            {!isUnlimited && usagePercentage >= 90 && (
              <p className="text-xs text-destructive mt-1">
                {usagePercentage >= 100 ? 'Limit reached' : 'Approaching limit'}
              </p>
            )}
          </div>
        </div>

        {/* Upgrade Button for Free Plan */}
        {currentUser.plan === 'free' && (
          <div className="px-4 pb-6">
            <button
              onClick={() => router.push('/pricing')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg text-sm font-medium hover:from-primary/90 hover:to-primary disabled:opacity-50"
            >
              <Crown className="w-4 h-4" />
              {isEligibleForTrial ? 'Start Free Trial' : 'Upgrade to Pro'}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default React.memo(DashboardSidebar); 