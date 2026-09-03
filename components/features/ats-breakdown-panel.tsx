export function AtsBreakdownPanel({
  score,
  matched,
  missing,
  niceMatched,
}: {
  score: number
  matched: string[]
  missing: string[]
  niceMatched: string[]
}) {
  const safe = Math.max(0, Math.min(100, Math.round(score)))
  if (matched.length === 0 && missing.length === 0 && niceMatched.length === 0) {
    return (
      <div data-testid="ats-empty" className="rounded-md border border-dashed p-4 text-sm text-gray-500">
        Add a few skills to your resume to see fit.
      </div>
    )
  }
  return (
    <div data-testid="ats-panel" className="rounded-md border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">ATS fit</h3>
        <span data-testid="ats-score" className="text-sm font-mono">{safe}%</span>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <h4 className="font-medium">Matched</h4>
          <ul>{matched.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
        <div>
          <h4 className="font-medium">Missing</h4>
          <ul>{missing.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
        {niceMatched.length > 0 && (
          <div className="col-span-2">
            <h4 className="font-medium">Nice-to-have</h4>
            <ul>{niceMatched.map((m) => <li key={m}>{m}</li>)}</ul>
          </div>
        )}
      </div>
    </div>
  )
}
