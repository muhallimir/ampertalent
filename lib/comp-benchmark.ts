export interface SalaryPoint {
  /** ISO 4217 currency, e.g. "USD". */
  currency: string
  /** Job level: 1 = junior, 5 = principal. */
  level: number
  /** Annual salary. */
  amount: number
}

export interface BenchmarkRequest {
  currency: string
  level: number
  jobFamily: string
}

export interface BenchmarkResult {
  currency: string
  level: number
  p25: number
  p50: number
  p75: number
  p90: number
  source: number
  recommended: { min: number; max: number }
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

/** Filter the dataset to the requested currency, level band, and job family. */
function filter(points: SalaryPoint[], family: string, currency: string, level: number): SalaryPoint[] {
  return points.filter((p) => {
    if (p.currency.toUpperCase() !== currency.toUpperCase()) return false
    if (p.jobFamily.toLowerCase() !== family.toLowerCase()) return false
    return Math.abs(p.level - level) <= 1
  })
}

export function benchmark(points: SalaryPoint[], req: BenchmarkRequest): BenchmarkResult {
  const candidates = filter(points, req.jobFamily, req.currency, req.level)
  const values = candidates.map((p) => p.amount)
  const p25 = Math.round(percentile(values, 0.25))
  const p50 = Math.round(percentile(values, 0.5))
  const p75 = Math.round(percentile(values, 0.75))
  const p90 = Math.round(percentile(values, 0.9))
  return {
    currency: req.currency.toUpperCase(),
    level: req.level,
    p25,
    p50,
    p75,
    p90,
    source: candidates.length,
    recommended: { min: p25, max: p75 },
  }
}
