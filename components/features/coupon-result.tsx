export function CouponResult({ ok, reason, discountCents, newTotalCents }: { ok: boolean; reason?: string; discountCents: number; newTotalCents: number }) {
  if (ok) {
    return (
      <div data-testid="coupon-ok" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        Coupon applied: −${(discountCents / 100).toFixed(2)} — new total ${(newTotalCents / 100).toFixed(2)}
      </div>
    )
  }
  return (
    <div data-testid="coupon-error" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      Coupon not applied: {reason ?? 'unknown'}
    </div>
  )
}
