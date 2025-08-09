import { Session } from '@/lib/hooks/useSessions'

export interface DayGroup {
  key: string
  label: string
  date: Date
  sessions: Session[]
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatDayLabel(d: Date, now = new Date()): string {
  const today = startOfDay(now)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (isSameDay(d, today)) return 'Today'
  if (isSameDay(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

export function groupSessionsByDay(sessions: Session[], now: Date = new Date()): DayGroup[] {
  const map = new Map<string, DayGroup>()
  for (const s of sessions) {
    const base = s.recording_started_at || s.created_at
    const date = startOfDay(new Date(base))
    const key = date.toISOString().slice(0, 10)
    if (!map.has(key)) {
      map.set(key, { key, label: formatDayLabel(date, now), date, sessions: [] })
    }
    map.get(key)!.sessions.push(s)
  }

  const groups = Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime())
  // Sort each group's sessions by time descending (newest first)
  groups.forEach(g => g.sessions.sort((a, b) => {
    const at = new Date(a.recording_started_at || a.created_at).getTime()
    const bt = new Date(b.recording_started_at || b.created_at).getTime()
    return bt - at
  }))
  return groups
}


