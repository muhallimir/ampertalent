export function EarningsCard({ totalCents, pendingCents, paidCents, byJob }: { totalCents: number; pendingCents: number; paidCents: number; byJob: Record<string, number> }) {
  if (totalCents === 0) {
    return (
      <div data-testid="ec-empty" className="rounded-md border border-dashed p-3 text-sm text-gray-500">
        No earnings yet.
      </div>
    )
  }
  const fmt = (n: number) => `$${(n / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return (
    <div data-testid="ec" className="rounded-md border p-3 text-sm">
      <h3 className="font-semibold">Referral earnings</h3>
      <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-gray-500">Total</dt>
          <dd data-testid="ec-total" className="font-mono">{fmt(totalCents)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Pending</dt>
          <dd data-testid="ec-pending" className="font-mono">{fmt(pendingCents)}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Paid</dt>
          <dd data-testid="ec-paid" className="font-mono">{fmt(paidCents)}</dd>
        </div>
      </dl>
      {Object.keys(byJob).length > 0 && (
        <ul className="mt-2 text-xs text-gray-500">
          {Object.entries(byJob).map(([job, amt]) => (
            <li key={job}>{job}: {fmt(amt)}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
