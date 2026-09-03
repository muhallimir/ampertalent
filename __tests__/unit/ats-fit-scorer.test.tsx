import { render, screen } from '@testing-library/react'
import { AtsBreakdownPanel } from '@/components/features/ats-breakdown-panel'

describe('AtsBreakdownPanel', () => {
  it('renders matched and missing skills', () => {
    render(
      <AtsBreakdownPanel
        score={72}
        matched={['react', 'typescript']}
        missing={['graphql']}
        niceMatched={['docker']}
      />,
    )
    expect(screen.getByText(/72%/)).toBeInTheDocument()
    expect(screen.getByText('react')).toBeInTheDocument()
    expect(screen.getByText('typescript')).toBeInTheDocument()
    expect(screen.getByText('graphql')).toBeInTheDocument()
  })

  it('renders an empty state when no signals are present', () => {
    render(<AtsBreakdownPanel score={0} matched={[]} missing={[]} niceMatched={[]} />)
    expect(screen.getByText(/add a few skills to your resume to see fit/i)).toBeInTheDocument()
  })
})
