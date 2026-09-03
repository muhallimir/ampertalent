export type PayPeriod = 'hourly' | 'weekly' | 'monthly' | 'annual'

export interface SalaryInput {
  amount: number
  currency: string // ISO 4217, e.g. "USD"
  period: PayPeriod
}

export interface SalaryNormalized {
  annual: number
  monthly: number
  weekly: number
  hourly: number
  currency: string
}

/**
 * Convert a salary into a normalized form.
 *
 * Assumptions:
 * - 52 working weeks per year
 * - 5 working days per week → 8 hours per day (used to derive hourly from
 *   annual, weekly, monthly) or 40 hours per week
 * - 12 calendar months per year
 */
const WEEKS_PER_YEAR = 52
const MONTHS_PER_YEAR = 12
const HOURS_PER_WEEK = 40

const TO_ANNUAL: Record<PayPeriod, number> = {
  hourly: HOURS_PER_WEEK * WEEKS_PER_YEAR,
  weekly: WEEKS_PER_YEAR,
  monthly: MONTHS_PER_YEAR,
  annual: 1,
}

export function normalizeSalary(input: SalaryInput): SalaryNormalized {
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new Error(`normalizeSalary: invalid amount ${input.amount}`)
  }
  if (!input.currency || input.currency.length !== 3) {
    throw new Error(`normalizeSalary: invalid currency "${input.currency}"`)
  }
  const annual = input.amount * TO_ANNUAL[input.period]
  return {
    annual,
    monthly: annual / MONTHS_PER_YEAR,
    weekly: annual / WEEKS_PER_YEAR,
    hourly: annual / (WEEKS_PER_YEAR * HOURS_PER_WEEK),
    currency: input.currency.toUpperCase(),
  }
}

/** Round to 2 decimals. */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Compare two salaries and return a multiplier (a / b). Useful for
 * "this salary is 1.12x your current" callouts.
 */
export function salaryRatio(a: SalaryInput, b: SalaryInput): number {
  const an = normalizeSalary(a).annual
  const bn = normalizeSalary(b).annual
  if (bn === 0) return 0
  return Math.round((an / bn) * 100) / 100
}
