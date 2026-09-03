import type { TimelineEvent } from '@/lib/application-timeline'
import { groupByDay } from '@/lib/application-timeline'

const ICONS: Record<TimelineEvent['type'], string> = {
  created: '✦',
  status_change: '⇄',
  note: '✎',
  message: '✉',
  interview: '☎',
  offer: '★',
  closed: '■',
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <div data-testid="timeline-empty" className="rounded-md border border-dashed p-3 text-sm text-gray-500">
        No activity yet.
      </div>
    )
  }
  const groups = groupByDay(events)
  return (
    <div data-testid="timeline" className="space-y-3">
      {groups.map((g) => (
        <section key={g.date}>
          <h4 className="text-xs font-semibold text-gray-500">{g.date}</h4>
          <ul className="mt-1 space-y-1">
            {g.events.map((e) => (
              <li key={e.id} className="flex items-start gap-2 text-sm">
                <span aria-hidden className="w-4 text-center">{ICONS[e.type]}</span>
                <div>
                  <div>{e.summary}</div>
                  <div className="text-[11px] text-gray-500">{new Date(e.at).toLocaleTimeString()} · {e.by}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
