export function BenchmarkChart({
  currency,
  level,
  p25,
  p50,
  p75,
  p90,
  source,
}: {
  currency: string
  level: number
  p25: number
  p50: number
  p75: number
  p90: number
  source: number
}) {
  if (source === 0) {
    return (
      <div data-testid="bench-empty" className="rounded-md border border-dashed p-3 text-sm text-gray-500">
        Not enough data for {currency} level {level}.
      </div>
    )
  }
  const fmt = (n: number) => `${currency} ${n.toLocaleString()}`
  return (
    <div data-testid="bench-chart" className="rounded-md border p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">Comp benchmark</h3>
        <span data-testid="bench-source" className="text-xs text-gray-500">n={source}</span>
      </div>
      <ul className="grid grid-cols-4 gap-2 text-center text-xs">
        <li><div className="text-gray-500">p25</div><div data-testid="bench-p25" className="font-mono">{fmt(p25)}</div></li>
        <li><div className="text-gray-500">p50</div><div data-testid="bench-p50" className="font-mono">{fmt(p50)}</div></li>
        <li><div className="text-gray-500">p75</div><div data-testid="bench-p75" className="font-mono">{fmt(p75)}</div></li>
        <li><div className="text-gray-500">p90</div><div data-testid="bench-p90" className="font-mono">{fmt(p90)}</div></li>
      </ul>
    </div>
  )
}
