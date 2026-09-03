import { render, screen } from '@testing-library/react'
import { SimilarJobsList } from '@/components/features/similar-jobs-list'

describe('SimilarJobsList', () => {
  it('renders each similar job with its score', () => {
    render(
      <SimilarJobsList
        items={[
          { id: 'j1', title: 'Senior React Engineer', score: 0.92 },
          { id: 'j2', title: 'Frontend Developer', score: 0.71 },
        ]}
      />,
    )
    expect(screen.getByText(/senior react engineer/i)).toBeInTheDocument()
    expect(screen.getByText(/0\.92/)).toBeInTheDocument()
  })

  it('renders an empty state', () => {
    render(<SimilarJobsList items={[]} />)
    expect(screen.getByText(/no similar jobs/i)).toBeInTheDocument()
  })
})
