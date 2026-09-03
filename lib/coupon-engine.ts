export type DiscountType = 'percentage' | 'fixed'

export interface Coupon {
  code: string
  type: DiscountType
  /** Percent (1..100) when type=percentage, cents when type=fixed. */
  amount: number
  expiresAt?: string
  minOrderCents?: number
  /** Max redemptions across all customers. */
  maxRedemptions?: number
  redemptions?: number
  /** Per-customer cap. */
  perCustomerLimit?: number
}

export interface ApplyContext {
  orderTotalCents: number
  customerId: string
  customerRedemptions?: number
  now?: Date
}

export interface ApplyResult {
  ok: boolean
  reason?: string
  discountCents: number
  newTotalCents: number
}

export function validateCoupon(coupon: Coupon, ctx: ApplyContext): ApplyResult {
  const now = ctx.now ?? new Date()
  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
    return { ok: false, reason: 'expired', discountCents: 0, newTotalCents: ctx.orderTotalCents }
  }
  if (typeof coupon.maxRedemptions === 'number' && (coupon.redemptions ?? 0) >= coupon.maxRedemptions) {
    return { ok: false, reason: 'maxed_out', discountCents: 0, newTotalCents: ctx.orderTotalCents }
  }
  if (typeof coupon.perCustomerLimit === 'number' && (ctx.customerRedemptions ?? 0) >= coupon.perCustomerLimit) {
    return { ok: false, reason: 'customer_limit', discountCents: 0, newTotalCents: ctx.orderTotalCents }
  }
  if (typeof coupon.minOrderCents === 'number' && ctx.orderTotalCents < coupon.minOrderCents) {
    return { ok: false, reason: 'below_minimum', discountCents: 0, newTotalCents: ctx.orderTotalCents }
  }
  if (coupon.type === 'percentage') {
    if (coupon.amount <= 0 || coupon.amount > 100) {
      return { ok: false, reason: 'invalid_amount', discountCents: 0, newTotalCents: ctx.orderTotalCents }
    }
    const discount = Math.round((ctx.orderTotalCents * coupon.amount) / 100)
    return { ok: true, discountCents: discount, newTotalCents: ctx.orderTotalCents - discount }
  }
  if (coupon.type === 'fixed') {
    if (coupon.amount <= 0) {
      return { ok: false, reason: 'invalid_amount', discountCents: 0, newTotalCents: ctx.orderTotalCents }
    }
    const discount = Math.min(coupon.amount, ctx.orderTotalCents)
    return { ok: true, discountCents: discount, newTotalCents: ctx.orderTotalCents - discount }
  }
  return { ok: false, reason: 'unknown_type', discountCents: 0, newTotalCents: ctx.orderTotalCents }
}
