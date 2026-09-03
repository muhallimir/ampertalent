export function JobMatchBadge({ score }: { score: number }) {
  const safe = Math.max(0, Math.min(100, Math.round(score)))
  let label = 'weak match'
  if (safe >= 80) label = 'strong match'
  else if (safe >= 50) label = 'good match'

  return (
    <span
      data-testid="job-match-badge"
      data-score={safe}
      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
    >
      <span aria-hidden>{safe}%</span>
      <span>{label}</span>
    </span>
  )
}
