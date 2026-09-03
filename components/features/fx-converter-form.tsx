export function FxConverterForm({
  amount,
  from,
  to,
  converted,
  error,
}: {
  amount: number
  from: string
  to: string
  converted: number
  error?: string
}) {
  if (error) {
    return (
      <div data-testid="fx-error" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
        {error}
      </div>
    )
  }
  return (
    <div data-testid="fx-form" className="rounded-md border p-3 text-sm">
      <div className="flex items-center gap-2">
        <span data-testid="fx-amount">
          {amount.toLocaleString()} {from}
        </span>
        <span>=</span>
        <span data-testid="fx-converted" className="font-mono">
          {converted.toLocaleString(undefined, { maximumFractionDigits: 2 })} {to}
        </span>
      </div>
    </div>
  )
}
