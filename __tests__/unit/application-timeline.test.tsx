import { render, screen } from '@testing-library/react'
import { Timeline } from '@/components/features/timeline'

describe('Timeline', () => {
  it('groups events by day and renders the day headers', () => {
    const events = [
      { id: '1', at: '2026-01-05T10:00:00Z', type: 'created' as const, by: 'system', summary: 'Application created' },
      { id: '2', at: '2026-01-05T14:00:00Z', type: 'status_change' as const, by: 'employer', summary: 'Moved to screening' },
      { id: '3', at: '2026-01-06T09:00:00Z', type: 'interview' as const, by: 'employer', summary: 'Interview scheduled' },
    ]
    render(<Timeline events={events} />)
    expect(screen.getByText(/2026-01-05/)).toBeInTheDocument()
    expect(screen.getByText(/2026-01-06/)).toBeInTheDocument()
  })

  it('renders an empty state', () => {
    render(<Timeline events={[]} />)
    expect(screen.getByText(/no activity yet/i)).toBeInTheDocument()
  })
})
