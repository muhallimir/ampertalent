import { render, screen } from '@testing-library/react'
import { DuplicateList } from '@/components/features/duplicate-list'

describe('DuplicateList', () => {
  it('renders each duplicate pair', () => {
    const pairs = [
      {
        a: { id: '1', title: 'Senior FE', company: 'Acme' },
        b: { id: '2', title: 'Senior Frontend', company: 'Acme' },
        score: 88,
        reasons: ['company identical'],
      },
    ]
    render(<DuplicateList pairs={pairs} />)
    expect(screen.getByTestId('dup-pair').textContent).toMatch(/senior fe/i)
    expect(screen.getByTestId('dup-pair').textContent).toMatch(/senior frontend/i)
  })

  it('renders an empty state', () => {
    render(<DuplicateList pairs={[]} />)
    expect(screen.getByText(/no duplicates found/i)).toBeInTheDocument()
  })
})
