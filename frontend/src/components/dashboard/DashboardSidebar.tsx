import React, { useState } from 'react';
import {
  MicrophoneIcon,
  ArchiveBoxIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { Crown } from 'lucide-react';
import type { Session } from '@/lib/hooks/useSessions';
import { PricingModal } from '@/components/ui/PricingModal';

export interface UsageStats {
  monthlyAudioHours: number;
  monthlyAudioLimit: number;
  monthlyMinutesUsed?: number;
  monthlyMinutesLimit?: number;
  minutesRemaining?: number;
  totalSessions: number;
  completedSessions: number;
}

interface DashboardSidebarProps {
  usageStats: UsageStats;
  activePath: string;
  onNavigate: (path: string) => void;
  currentUser: { plan: 'free' | 'pro' | 'team'; };
  sessions: Session[];
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ usageStats, activePath, onNavigate, currentUser, sessions }) => {
  // Calculate counts
  const archivedCount = sessions.filter((s) => s.status === 'archived').length;
  const activeCount = sessions.filter((s) => s.status !== 'archived').length;

  // Format minutes to a human-friendly string
  const formatMinutes = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins === 0 ? `${hours} hr${hours !== 1 ? 's' : ''}` : `${hours} hr${hours !== 1 ? 's' : ''} ${mins} min`;
  };

  const navItems = [
    { path: 'conversations', label: 'Meetings', icon: MicrophoneIcon, count: activeCount },
    { path: 'archive', label: 'Archive', icon: ArchiveBoxIcon, count: archivedCount },
    { path: 'settings', label: 'Settings', icon: Cog6ToothIcon },
  ];

  const isUnlimited = usageStats.monthlyMinutesLimit == null;
  const usagePercentage = isUnlimited
    ? 0
    : Math.min(
        (usageStats.monthlyMinutesUsed || 0) / (usageStats.monthlyMinutesLimit || 600) * 100,
        100,
      );

  const [isPricingOpen, setIsPricingOpen] = useState(false);

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => onNavigate(item.path)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
              activePath === item.path ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50'
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

      {/* Usage Stats */}
      <div className="px-4 py-3 border-t border-border">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Bot Minutes Used</span>
            <span className="font-medium">
              {isUnlimited ? 'Unlimited' : `${formatMinutes(usageStats.monthlyMinutesUsed || 0)} / ${formatMinutes(usageStats.monthlyMinutesLimit || 0)}`}
            </span>
          </div>
          
          {!isUnlimited && (
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  usagePercentage >= 90 ? 'bg-red-500' : 
                  usagePercentage >= 75 ? 'bg-yellow-500' : 
                  'bg-primary'
                }`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
          )}
          
          {!isUnlimited && usagePercentage >= 90 && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {usagePercentage >= 100 ? 'Limit reached' : 'Approaching limit'}
            </p>
          )}
        </div>
      </div>

      {/* Upgrade Button for Free Plan */}
      {currentUser.plan === 'free' && (
        <button
          onClick={() => setIsPricingOpen(true)}
          className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg text-sm font-medium hover:from-primary/90 hover:to-primary disabled:opacity-50"
        >
          <Crown className="w-4 h-4" />
          Upgrade to Pro
        </button>
      )}

      {/* Pricing Modal */}
      <PricingModal isOpen={isPricingOpen} onClose={() => setIsPricingOpen(false)} />
    </aside>
  );
};

export default DashboardSidebar; 