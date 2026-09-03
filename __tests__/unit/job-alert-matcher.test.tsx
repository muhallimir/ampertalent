import { render, screen } from '@testing-library/react'
import { JobMatchBadge } from '@/components/features/job-match-badge'

describe('JobMatchBadge', () => {
  it('renders the match score as a percentage', () => {
    render(<JobMatchBadge score={87} />)
    expect(screen.getByText(/87%/)).toBeInTheDocument()
  })

  it('labels very strong matches', () => {
    render(<JobMatchBadge score={90} />)
    expect(screen.getByText(/strong match/i)).toBeInTheDocument()
  })

  it('labels weak matches', () => {
    render(<JobMatchBadge score={20} />)
    expect(screen.getByText(/weak match/i)).toBeInTheDocument()
  })

  it('clamps negative scores to 0%', () => {
    render(<JobMatchBadge score={-50} />)
    expect(screen.getByText(/0%/)).toBeInTheDocument()
  })

  it('clamps scores above 100 to 100%', () => {
    render(<JobMatchBadge score={250} />)
    expect(screen.getByText(/100%/)).toBeInTheDocument()
  })
})
