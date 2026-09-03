import { render, screen } from '@testing-library/react'
import { WebhookStatusPill } from '@/components/features/webhook-status-pill'

describe('WebhookStatusPill', () => {
  it('renders a delivered status', () => {
    render(<WebhookStatusPill status="delivered" attempts={1} />)
    expect(screen.getByTestId('webhook-pill')).toHaveAttribute('data-status', 'delivered')
  })
  it('renders a failed status', () => {
    render(<WebhookStatusPill status="failed" attempts={5} />)
    expect(screen.getByTestId('webhook-pill')).toHaveAttribute('data-status', 'failed')
  })
  it('renders a pending status with attempt count', () => {
    render(<WebhookStatusPill status="pending" attempts={2} />)
    expect(screen.getByTestId('webhook-pill').textContent).toMatch(/attempt 2/i)
  })
})
