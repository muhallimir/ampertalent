import type { OnboardingStep } from '@/lib/onboarding-progress'
import { progress } from '@/lib/onboarding-progress'

export function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const p = progress(steps)
  return (
    <div data-testid="onboarding" className="rounded-md border p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">Get started</h3>
        <span data-testid="onboarding-percent" className="font-mono text-xs">{p.percent}%</span>
      </div>
      <ul className="space-y-1">
        {steps.map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            <span
              aria-hidden
              className={[
                'inline-flex h-4 w-4 items-center justify-center rounded border text-[10px]',
                s.completed ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 text-gray-400',
              ].join(' ')}
            >
              {s.completed ? '✓' : '·'}
            </span>
            <span className={s.completed ? 'line-through text-gray-500' : ''}>{s.label}</span>
            {s.required && !s.completed && <span className="ml-auto text-[10px] text-amber-700">required</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
