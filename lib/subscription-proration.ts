export type Cadence = 'monthly' | 'annual'

export interface PlanTier {
  id: string
  name: string
  priceMonthly: number
  priceAnnual: number
}

export interface ProrationInput {
  fromPlan: PlanTier
  toPlan: PlanTier
  /** Day of the current billing cycle (1 = first day). 1-indexed. */
  dayOfCycle: number
  /** Total days in the cycle (e.g. 30 monthly, 365 annual). */
  cycleLength: number
  cadence: Cadence
}

export interface ProrationResult {
  /** Refund owed to the customer for the unused portion of the old plan. */
  refund: number
  /** Cost of the remaining portion of the new plan. */
  cost: number
  /** Net charge (cost - refund). Can be negative if a refund dominates. */
  net: number
  daysRemaining: number
}

export function prorate(input: ProrationInput): ProrationResult {
  if (input.dayOfCycle < 1 || input.dayOfCycle > input.cycleLength) {
    throw new Error('prorate: dayOfCycle out of range')
  }
  if (input.cycleLength <= 0) throw new Error('prorate: cycleLength must be positive')

  const oldPrice = input.cadence === 'monthly' ? input.fromPlan.priceMonthly : input.fromPlan.priceAnnual
  const newPrice = input.cadence === 'monthly' ? input.toPlan.priceMonthly : input.toPlan.priceAnnual
  const daysRemaining = Math.max(0, input.cycleLength - input.dayOfCycle + 1)
  const fraction = daysRemaining / input.cycleLength

  // Refund is for the *unused* portion of the old plan.
  const refund = +(oldPrice * fraction).toFixed(2)
  // Cost is for the *remaining* portion of the new plan.
  const cost = +(newPrice * fraction).toFixed(2)
  const net = +(cost - refund).toFixed(2)
  return { refund, cost, net, daysRemaining }
}
