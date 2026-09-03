import { render, screen } from '@testing-library/react'
import { CouponResult } from '@/components/features/coupon-result'

describe('CouponResult', () => {
  it('renders an accepted coupon', () => {
    render(<CouponResult ok={true} discountCents={500} newTotalCents={4500} />)
    expect(screen.getByTestId('coupon-ok').textContent).toMatch(/5\.00/)
  })

  it('renders a rejection reason', () => {
    render(<CouponResult ok={false} reason="expired" discountCents={0} newTotalCents={5000} />)
    expect(screen.getByTestId('coupon-error').textContent).toMatch(/expired/i)
  })
})
