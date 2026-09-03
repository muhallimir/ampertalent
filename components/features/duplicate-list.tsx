import type { DuplicatePair } from '@/lib/job-dedupe'

export function DuplicateList({ pairs }: { pairs: DuplicatePair[] }) {
  if (pairs.length === 0) {
    return (
      <div data-testid="dup-empty" className="rounded-md border border-dashed p-3 text-sm text-gray-500">
        No duplicates found.
      </div>
    )
  }
  return (
    <ul data-testid="dup-list" className="space-y-2">
      {pairs.map((p) => (
        <li
          key={`${p.a.id}-${p.b.id}`}
          data-testid="dup-pair"
          className="rounded-md border p-2 text-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{p.a.title}</div>
              <div className="text-xs text-gray-500">{p.a.company}</div>
            </div>
            <span className="text-xs">≈ {p.score}%</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">vs.</div>
          <div>
            <div className="font-medium">{p.b.title}</div>
            <div className="text-xs text-gray-500">{p.b.company}</div>
          </div>
        </li>
      ))}
    </ul>
  )
}
