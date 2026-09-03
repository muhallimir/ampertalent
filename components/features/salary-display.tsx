const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
  JPY: '¥',
  INR: '₹',
}

function symbolFor(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] ?? `${currency} `
}

export function SalaryDisplay({
  annual,
  monthly,
  weekly,
  hourly,
  currency,
}: {
  annual: number
  monthly: number
  weekly: number
  hourly: number
  currency: string
}) {
  if (annual <= 0) {
    return (
      <div data-testid="salary-empty" className="text-sm text-gray-500">
        Salary not provided.
      </div>
    )
  }
  const symbol = symbolFor(currency)
  return (
    <div data-testid="salary-display" className="rounded-md border p-3 text-sm">
      <div className="font-semibold">
        <span>{symbol}</span>
        <span>{annual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span className="ml-1 text-xs text-gray-500">/ year</span>
      </div>
      <dl className="mt-1 grid grid-cols-3 gap-1 text-xs text-gray-600">
        <div>
          <dt className="inline">Monthly: </dt>
          <dd className="inline">{monthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</dd>
        </div>
        <div>
          <dt className="inline">Weekly: </dt>
          <dd className="inline">{weekly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</dd>
        </div>
        <div>
          <dt className="inline">Hourly: </dt>
          <dd className="inline">{hourly.toLocaleString(undefined, { maximumFractionDigits: 2 })}</dd>
        </div>
      </dl>
    </div>
  )
}
