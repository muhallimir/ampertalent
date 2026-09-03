import type { ProfileStrength } from '@/lib/profile-strength'

const TONE: Record<ProfileStrength['level'], string> = {
  sparse: 'bg-red-100 text-red-800',
  building: 'bg-amber-100 text-amber-800',
  strong: 'bg-blue-100 text-blue-800',
  complete: 'bg-emerald-100 text-emerald-800',
}

export function ProfileStrengthMeter({ score, level, missing }: ProfileStrength) {
  if (level === 'complete') {
    return (
      <div data-testid="psm-complete" className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${TONE[level]}`}>
        Profile complete · {score}%
      </div>
    )
  }
  return (
    <div data-testid="psm" className="rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Profile strength</h3>
        <span data-testid="psm-score" className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE[level]}`}>
          {score}% · {level}
        </span>
      </div>
      {missing.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs">
          {missing.map((m) => <li key={m}>• {m}</li>)}
        </ul>
      )}
    </div>
  )
}
