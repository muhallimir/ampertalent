import type { AlertDigestItem } from '@/lib/alert-digest'

export function AlertDigestList({ items }: { items: AlertDigestItem[] }) {
  if (items.length === 0) {
    return <div data-testid="alert-empty" className="rounded-md border border-dashed p-3 text-sm text-gray-500">No matching jobs.</div>
  }
  return (
    <ul data-testid="alert-digest" className="space-y-1 text-sm">
      {items.map((i) => (
        <li key={i.job.id} className="flex items-center justify-between rounded border px-2 py-1">
          <a href={i.job.url} className="hover:underline">{i.job.title} — {i.job.company}</a>
          <span className="font-mono text-xs text-gray-500">{i.score}</span>
        </li>
      ))}
    </ul>
  )
}
