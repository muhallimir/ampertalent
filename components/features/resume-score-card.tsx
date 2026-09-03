import type { ResumeScore } from '@/lib/resume-quality-scorer'

export function ResumeScoreCard({ overall, signals, suggestions }: ResumeScore) {
  return (
    <div data-testid="resume-score" className="rounded-md border p-4 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Resume score</h3>
        <span data-testid="resume-overall" className="font-mono text-lg">{overall}%</span>
      </div>
      <ul className="mt-3 space-y-1 text-xs">
        {signals.map((s) => (
          <li key={s.name} className="flex items-center justify-between">
            <span>
              <span aria-hidden className={s.present ? 'text-emerald-600' : 'text-amber-600'}>
                {s.present ? '✓' : '!'}
              </span>{' '}
              {s.name}
              {s.note && <span className="ml-1 text-gray-500">({s.note})</span>}
            </span>
            <span className="font-mono text-[11px] text-gray-500">+{s.points}</span>
          </li>
        ))}
      </ul>
      {suggestions.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-semibold uppercase text-gray-500">Suggestions</h4>
          <ul className="mt-1 space-y-0.5 text-xs">
            {suggestions.map((s) => <li key={s}>• {s}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
