export function SimilarJobsList({ items }: { items: { id: string; title: string; score: number }[] }) {
  if (items.length === 0) {
    return (
      <div data-testid="similar-empty" className="rounded-md border border-dashed p-3 text-sm text-gray-500">
        No similar jobs.
      </div>
    )
  }
  return (
    <ul data-testid="similar-list" className="space-y-1 text-sm">
      {items.map((i) => (
        <li key={i.id} className="flex items-center justify-between rounded border px-2 py-1">
          <span>{i.title}</span>
          <span className="font-mono text-xs text-gray-500">{i.score.toFixed(2)}</span>
        </li>
      ))}
    </ul>
  )
}
