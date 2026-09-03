export function ProrationSummary({ refund, cost, net, daysRemaining }: { refund: number; cost: number; net: number; daysRemaining: number }) {
  return (
    <div data-testid="proration" className="rounded-md border p-3 text-sm">
      <h3 className="font-semibold">Proration</h3>
      <dl className="mt-2 grid grid-cols-2 gap-y-1 text-xs">
        <dt>Refund</dt>
        <dd data-testid="proration-refund" className="text-right font-mono">${refund.toFixed(2)}</dd>
        <dt>Cost of new plan (remaining)</dt>
        <dd data-testid="proration-cost" className="text-right font-mono">${cost.toFixed(2)}</dd>
        <dt className="font-semibold">Net</dt>
        <dd data-testid="proration-net" className="text-right font-mono">${net.toFixed(2)}</dd>
        <dt>Days remaining</dt>
        <dd className="text-right font-mono">{daysRemaining}</dd>
      </dl>
    </div>
  )
}
