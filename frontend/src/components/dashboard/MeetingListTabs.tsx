import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';

interface MeetingListTabsProps {
  view: 'live' | 'all';
  onViewChange: (view: 'live' | 'all') => void;
  counts: {
    live: number;
    total: number;
  };
  className?: string;
  showStatusIndicator?: boolean;
}

export const MeetingListTabs: React.FC<MeetingListTabsProps> = ({
  view,
  onViewChange,
  counts,
  className = 'mb-4',
  showStatusIndicator = true,
}) => {
  return (
    <div className={`${className}`}>
      {/* Tabs (desktop); component also renders a mobile select below */}
      <div className="hidden sm:block">
        <Tabs value={view} onValueChange={(value) => onViewChange(value as 'live' | 'all')}>
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="live" className="relative">
              <span className="flex items-center gap-2">
                {counts.live > 0 && (
                  <AnimatePresence>
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="relative flex h-2 w-2"
                    >
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </motion.span>
                  </AnimatePresence>
                )}
                Live
                {counts.live > 0 && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({counts.live})
                  </span>
                )}
              </span>
            </TabsTrigger>
            <TabsTrigger value="all">
              All Meetings
              <span className="ml-1 text-xs text-muted-foreground">
                ({counts.total})
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Mobile Dropdown */}
      <div className="sm:hidden">
        <select
          value={view}
          onChange={(e) => onViewChange(e.target.value as 'live' | 'all')}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="live">
            Live {counts.live > 0 ? `(${counts.live})` : ''}
          </option>
          <option value="all">
            All Meetings ({counts.total})
          </option>
        </select>
      </div>

      {/* Status indicator text */}
      {showStatusIndicator && view === 'live' && counts.live > 0 && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 text-sm text-muted-foreground"
        >
          {counts.live} active meeting{counts.live === 1 ? '' : 's'} in progress
        </motion.p>
      )}
    </div>
  );
};