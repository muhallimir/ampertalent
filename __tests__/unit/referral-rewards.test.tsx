import { render, screen } from '@testing-library/react'
import { EarningsCard } from '@/components/features/earnings-card'

describe('EarningsCard', () => {
  it('renders totals in dollars', () => {
    render(
      <EarningsCard
        totalCents={150000}
        pendingCents={50000}
        paidCents={100000}
        byJob={{ 'j1': 150000 }}
      />,
    )
    expect(screen.getByTestId('ec-total').textContent).toMatch(/1,500\.00/)
    expect(screen.getByTestId('ec-pending').textContent).toMatch(/500\.00/)
    expect(screen.getByTestId('ec-paid').textContent).toMatch(/1,000\.00/)
  })

  it('renders an empty state when no earnings', () => {
    render(<EarningsCard totalCents={0} pendingCents={0} paidCents={0} byJob={{}} />)
    expect(screen.getByText(/no earnings yet/i)).toBeInTheDocument()
  })
})
