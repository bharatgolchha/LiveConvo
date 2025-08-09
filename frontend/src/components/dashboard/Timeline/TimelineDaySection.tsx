'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DayGroup } from '@/lib/meeting/grouping'
import { MeetingCardAdapter } from '@/components/dashboard/MeetingCardAdapter'
import type { Session } from '@/lib/hooks/useSessions'

interface TimelineDaySectionProps {
  group: DayGroup
  collapsed?: boolean
  onToggle?: (key: string) => void
  selectedIds?: Set<string>
  onSelect?: (id: string, checked: boolean) => void
  onOpen?: (id: string) => void
  onFollowUp?: (id: string) => void
  onReport?: (id: string) => void
  onShare?: (session: Session) => void
}

export const TimelineDaySection: React.FC<TimelineDaySectionProps> = ({ group, collapsed, onToggle, selectedIds, onSelect, onOpen, onFollowUp, onReport, onShare }) => {
  return (
    <section aria-labelledby={`day-${group.key}`} className="relative">
      {/* Sticky Header */}
      <div className="sticky z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border" style={{ top: '0' }}>
        <button
          id={`day-${group.key}`}
          className="w-full text-left px-4 sm:px-6 py-2.5 sm:py-3 font-medium flex items-center justify-between"
          onClick={() => onToggle?.(group.key)}
          aria-expanded={!collapsed}
        >
          <span>{group.label}</span>
          <span className="text-xs text-muted-foreground">{group.sessions.length}</span>
        </button>
      </div>

      {/* Rail */}
      <div className="relative">
        <div className="absolute left-6 sm:left-8 top-0 bottom-0 w-px bg-border" aria-hidden />

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.ul
              role="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3 sm:space-y-4 px-2 sm:px-4 pt-3"
            >
              {group.sessions.map(session => (
                <li key={session.id} role="listitem" className="relative pl-10 sm:pl-12">
                  {/* Dot on rail */}
                  <span className="absolute left-6 sm:left-8 top-4 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary shadow" aria-hidden />
                  <MeetingCardAdapter
                    session={session as any}
                    selected={!!selectedIds?.has(session.id)}
                    onSelect={(id, checked) => onSelect?.(id, checked)}
                    onOpen={(id) => onOpen?.(id)}
                    onFollowUp={(id) => onFollowUp?.(id)}
                    onReport={(id) => onReport?.(id)}
                    onShare={onShare}
                  />
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

export default TimelineDaySection


