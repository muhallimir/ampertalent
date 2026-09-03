import { render, screen } from '@testing-library/react'
import { ResumeScoreCard } from '@/components/features/resume-score-card'

describe('ResumeScoreCard', () => {
  it('renders the overall score and a list of signals', () => {
    render(
      <ResumeScoreCard
        overall={82}
        signals={[{ name: 'Length', present: true, points: 15 }]}
        suggestions={['Add metrics.']}
      />,
    )
    expect(screen.getByTestId('resume-overall').textContent).toMatch(/82/)
    expect(screen.getByText(/length/i)).toBeInTheDocument()
    expect(screen.getByText(/add metrics/i)).toBeInTheDocument()
  })

  it('renders a 0% state when no signals', () => {
    render(<ResumeScoreCard overall={0} signals={[]} suggestions={[]} />)
    expect(screen.getByTestId('resume-overall').textContent).toMatch(/0/)
  })
})
