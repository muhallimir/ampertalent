import { render, screen } from '@testing-library/react'
import { FeedbackSummaryCard } from '@/components/features/feedback-summary-card'

describe('FeedbackSummaryCard', () => {
  it('renders the overall score and recommendation', () => {
    render(
      <FeedbackSummaryCard
        overall={80}
        recommendation="hire"
        weighted={4.1}
        redFlags={[]}
        highlights={['Strong technical signal']}
      />,
    )
    expect(screen.getByTestId('feedback-overall').textContent).toMatch(/80/)
    expect(screen.getByText(/strong technical signal/i)).toBeInTheDocument()
  })

  it('renders red flags when present', () => {
    render(
      <FeedbackSummaryCard
        overall={32}
        recommendation="no_hire"
        weighted={1.6}
        redFlags={['Technical score is low', 'Struggled with problem solving']}
        highlights={[]}
      />,
    )
    expect(screen.getByText(/technical score is low/i)).toBeInTheDocument()
    expect(screen.getByText(/struggled with problem solving/i)).toBeInTheDocument()
  })
})
