import { render, screen } from '@testing-library/react'
import { PostingScoreCard } from '@/components/features/posting-score-card'

describe('PostingScoreCard', () => {
  it('renders the overall score and signals', () => {
    render(
      <PostingScoreCard
        overall={84}
        reasons={['salary disclosed']}
        signals={[{ name: 'Salary disclosed', present: true, points: 20 }]}
        suggestions={['Add apply URL.']}
      />,
    )
    expect(screen.getByTestId('posting-overall').textContent).toMatch(/84/)
    expect(screen.getByTestId('posting-score').textContent).toMatch(/salary disclosed/i)
    expect(screen.getByTestId('posting-score').textContent).toMatch(/add apply url/i)
  })
})
