import { render, screen } from '@testing-library/react'
import { CreditsBadge } from '@/components/features/credits-badge'

describe('CreditsBadge', () => {
  it('renders the balance and a label', () => {
    render(<CreditsBadge balance={12} />)
    expect(screen.getByTestId('credits-badge').textContent).toMatch(/12/)
  })

  it('warns when balance is zero', () => {
    render(<CreditsBadge balance={0} />)
    expect(screen.getByTestId('credits-badge')).toHaveAttribute('data-state', 'empty')
  })

  it('marks low balance', () => {
    render(<CreditsBadge balance={2} />)
    expect(screen.getByTestId('credits-badge')).toHaveAttribute('data-state', 'low')
  })

  it('marks healthy balance', () => {
    render(<CreditsBadge balance={20} />)
    expect(screen.getByTestId('credits-badge')).toHaveAttribute('data-state', 'ok')
  })
})
