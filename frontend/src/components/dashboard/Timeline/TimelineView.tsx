'use client'

import React from 'react'
import { groupSessionsByDay, DayGroup } from '@/lib/meeting/grouping'
import type { Session } from '@/lib/hooks/useSessions'
import { TimelineDaySection } from './TimelineDaySection'

interface TimelineViewProps {
  sessions: Session[]
  selectedIds?: Set<string>
  onSelect?: (id: string, checked: boolean) => void
  onOpen?: (id: string) => void
  onFollowUp?: (id: string) => void
  onReport?: (id: string) => void
  onShare?: (session: Session) => void
}

export const TimelineView: React.FC<TimelineViewProps> = ({ sessions, selectedIds, onSelect, onOpen, onFollowUp, onReport, onShare }) => {
  const groups = React.useMemo<DayGroup[]>(() => groupSessionsByDay(sessions), [sessions])
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({})

  const toggle = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  if (!sessions || sessions.length === 0) return null

  return (
    <div className="flex flex-col" style={{ scrollMarginTop: 'var(--toolbar-offset, 64px)' }}>
      {groups.map(g => (
        <TimelineDaySection
          key={g.key}
          group={g}
          collapsed={!!collapsed[g.key]}
          onToggle={toggle}
          selectedIds={selectedIds}
          onSelect={onSelect}
          onOpen={onOpen}
          onFollowUp={onFollowUp}
          onReport={onReport}
          onShare={onShare}
        />
      ))}
    </div>
  )
}

export default TimelineView


