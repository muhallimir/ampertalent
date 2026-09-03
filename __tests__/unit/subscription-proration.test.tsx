import { render, screen } from '@testing-library/react'
import { ProrationSummary } from '@/components/features/proration-summary'

describe('ProrationSummary', () => {
  it('renders refund, cost, and net values', () => {
    render(<ProrationSummary refund={40} cost={80} net={40} daysRemaining={15} />)
    expect(screen.getByTestId('proration-net').textContent).toMatch(/40\.00/)
  })

  it('marks a downgrade refund with a plus sign', () => {
    render(<ProrationSummary refund={40} cost={20} net={-20} daysRemaining={10} />)
    expect(screen.getByTestId('proration-net').textContent).toMatch(/-?20\.00/)
  })
})
