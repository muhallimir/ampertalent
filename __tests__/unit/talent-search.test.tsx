import { render, screen } from '@testing-library/react'
import { TalentCard } from '@/components/features/talent-card'

describe('TalentCard', () => {
  it('renders the headline and skill tags', () => {
    render(
      <TalentCard
        id="p1"
        name="Sam"
        headline="Senior React Engineer"
        skills={['react', 'typescript']}
        yearsExperience={6}
        status="open"
        score={92}
      />,
    )
    expect(screen.getByText(/sam/i)).toBeInTheDocument()
    expect(screen.getByText(/senior react engineer/i)).toBeInTheDocument()
    expect(screen.getByText('react')).toBeInTheDocument()
    expect(screen.getByText('typescript')).toBeInTheDocument()
  })

  it('hides the score when zero', () => {
    render(
      <TalentCard id="p2" name="Rae" headline="PM" skills={[]} yearsExperience={1} status="closed" score={0} />,
    )
    expect(screen.queryByTestId('talent-score')).toBeNull()
  })
})
