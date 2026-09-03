import type { AuditEvent } from '@/lib/audit-filter'

export function AuditTable({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) {
    return (
      <div data-testid="audit-empty" className="rounded-md border border-dashed p-3 text-sm text-gray-500">
        No events match the current filter.
      </div>
    )
  }
  return (
    <table data-testid="audit-table" className="w-full text-sm">
      <thead className="text-left text-xs text-gray-500">
        <tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th></tr>
      </thead>
      <tbody>
        {events.map((e) => (
          <tr key={e.id} data-testid="audit-row" className="border-t">
            <td className="py-1 pr-2 font-mono text-xs">{new Date(e.at).toLocaleString()}</td>
            <td className="py-1 pr-2">{e.actor}</td>
            <td className="py-1 pr-2 font-mono text-xs">{e.action}</td>
            <td className="py-1 pr-2 text-xs text-gray-500">{e.target ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
