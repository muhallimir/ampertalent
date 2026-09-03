import { render, screen } from '@testing-library/react'
import { ApplicationStatusPill } from '@/components/features/application-status-pill'

describe('ApplicationStatusPill', () => {
  it('renders a label per status', () => {
    render(<ApplicationStatusPill status="interview_scheduled" />)
    expect(screen.getByText(/interview scheduled/i)).toBeInTheDocument()
  })

  it('marks terminal statuses with a strike-through', () => {
    render(<ApplicationStatusPill status="hired" />)
    expect(screen.getByTestId('status-pill')).toHaveAttribute('data-terminal', 'true')
  })

  it('marks in-flight statuses as not terminal', () => {
    render(<ApplicationStatusPill status="submitted" />)
    expect(screen.getByTestId('status-pill')).toHaveAttribute('data-terminal', 'false')
  })
})
