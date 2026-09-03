export interface AuditEvent {
  id: string
  at: string
  actor: string
  action: string
  target?: string
  ip?: string
  meta?: Record<string, unknown>
}

export interface AuditQuery {
  actor?: string
  action?: string
  target?: string
  from?: string
  to?: string
  text?: string
  limit?: number
  offset?: number
}

export function filterAudit(events: AuditEvent[], q: AuditQuery): AuditEvent[] {
  const from = q.from ? Date.parse(q.from) : -Infinity
  const to = q.to ? Date.parse(q.to) : Infinity
  const text = (q.text ?? '').toLowerCase().trim()
  const actor = (q.actor ?? '').toLowerCase().trim()
  const action = (q.action ?? '').toLowerCase().trim()
  const target = (q.target ?? '').toLowerCase().trim()
  const limit = q.limit ?? 50
  const offset = q.offset ?? 0

  const filtered = events.filter((e) => {
    const t = Date.parse(e.at)
    if (Number.isNaN(t)) return false
    if (t < from || t > to) return false
    if (actor && !e.actor.toLowerCase().includes(actor)) return false
    if (action && !e.action.toLowerCase().includes(action)) return false
    if (target && !(e.target ?? '').toLowerCase().includes(target)) return false
    if (text) {
      const hay = `${e.actor} ${e.action} ${e.target ?? ''} ${JSON.stringify(e.meta ?? {})}`.toLowerCase()
      if (!hay.includes(text)) return false
    }
    return true
  })

  return filtered.slice(offset, offset + limit)
}

export function summarize(events: AuditEvent[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const e of events) {
    out[e.action] = (out[e.action] ?? 0) + 1
  }
  return out
}
