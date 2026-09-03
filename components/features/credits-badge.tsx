export function CreditsBadge({ balance }: { balance: number }) {
  const state = balance <= 0 ? 'empty' : balance < 5 ? 'low' : 'ok'
  const tone = state === 'empty' ? 'bg-red-100 text-red-700' : state === 'low' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
  return (
    <span
      data-testid="credits-badge"
      data-state={state}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}
    >
      <span>{balance} credits</span>
    </span>
  )
}
