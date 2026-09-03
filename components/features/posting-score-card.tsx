import type { PostingScore } from '@/lib/job-posting-scorer'

export function PostingScoreCard({ overall, reasons, signals, suggestions }: PostingScore) {
  return (
    <div data-testid="posting-score" className="rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Posting quality</h3>
        <span data-testid="posting-overall" className="font-mono">{overall}%</span>
      </div>
      <ul className="mt-2 space-y-0.5 text-xs">
        {signals.map((s) => (
          <li key={s.name}>
            <span className={s.present ? 'text-emerald-600' : 'text-amber-600'}>
              {s.present ? '✓' : '!'}
            </span>{' '}
            {s.name} {s.note && <span className="text-gray-500">({s.note})</span>}
          </li>
        ))}
      </ul>
      {suggestions.length > 0 && (
        <p className="mt-2 text-xs text-gray-600">
          Try: {suggestions.join(' ')}
        </p>
      )}
      {reasons.length > 0 && (
        <p className="mt-1 text-[11px] text-gray-500">Why: {reasons.join('; ')}</p>
      )}
    </div>
  )
}
