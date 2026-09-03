import type { BrandCompleteness } from '@/lib/employer-brand'

export function BrandChecklist(props: BrandCompleteness) {
  if (props.missing.length === 0) {
    return (
      <div data-testid="brand-complete" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        Brand profile complete ({props.score}%).
      </div>
    )
  }
  return (
    <div data-testid="brand-checklist" className="rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Brand profile</h3>
        <span data-testid="brand-score" className="font-mono">{props.score}%</span>
      </div>
      <ul className="mt-2 space-y-0.5 text-xs">
        {props.missing.map((m) => <li key={m}>• {m}</li>)}
      </ul>
    </div>
  )
}
