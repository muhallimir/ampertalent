export interface TimelineEvent {
  id: string
  at: string
  type: 'created' | 'status_change' | 'note' | 'message' | 'interview' | 'offer' | 'closed'
  by: string
  summary: string
  meta?: Record<string, unknown>
}

export function sortTimeline(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => a.at.localeCompare(b.at))
}

export interface GroupedTimeline {
  date: string // YYYY-MM-DD
  events: TimelineEvent[]
}

export function groupByDay(events: TimelineEvent[]): GroupedTimeline[] {
  const sorted = sortTimeline(events)
  const out: GroupedTimeline[] = []
  let cur: GroupedTimeline | null = null
  for (const e of sorted) {
    const day = e.at.slice(0, 10)
    if (!cur || cur.date !== day) {
      cur = { date: day, events: [e] }
      out.push(cur)
    } else {
      cur.events.push(e)
    }
  }
  return out
}

export function duration(events: TimelineEvent[]): { first: string; last: string; days: number } | null {
  if (events.length === 0) return null
  const sorted = sortTimeline(events)
  const first = Date.parse(sorted[0].at)
  const last = Date.parse(sorted[sorted.length - 1].at)
  if (Number.isNaN(first) || Number.isNaN(last)) return null
  return { first: sorted[0].at, last: sorted[sorted.length - 1].at, days: Math.max(0, Math.round((last - first) / 86400000)) }
}
