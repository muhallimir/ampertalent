import { render, screen } from '@testing-library/react'
import { AuditTable } from '@/components/features/audit-table'

describe('AuditTable', () => {
  it('renders each event with actor + action', () => {
    const events = [
      { id: '1', at: '2026-01-05T10:00:00Z', actor: 'admin', action: 'user.create' },
      { id: '2', at: '2026-01-05T11:00:00Z', actor: 'admin', action: 'user.delete', target: 'user-3' },
    ]
    render(<AuditTable events={events} />)
    expect(screen.getAllByTestId('audit-row')).toHaveLength(2)
    expect(screen.getByText('user.create')).toBeInTheDocument()
  })

  it('renders an empty state', () => {
    render(<AuditTable events={[]} />)
    expect(screen.getByText(/no events match/i)).toBeInTheDocument()
  })
})
