import { render, screen } from '@testing-library/react'
import { AlertDigestList } from '@/components/features/alert-digest-list'

describe('AlertDigestList', () => {
  it('renders each item with its score', () => {
    render(
      <AlertDigestList
        items={[
          { job: { id: '1', title: 'Senior FE', company: 'Acme', url: 'https://x', postedAt: '2026-01-05' }, matched: ['react'], score: 90 },
        ]}
      />,
    )
    expect(screen.getByText(/senior fe/i)).toBeInTheDocument()
    expect(screen.getByTestId('alert-digest').textContent).toMatch(/90/)
  })
  it('renders an empty state', () => {
    render(<AlertDigestList items={[]} />)
    expect(screen.getByText(/no matching jobs/i)).toBeInTheDocument()
  })
})
