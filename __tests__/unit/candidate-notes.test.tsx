import { render, screen } from '@testing-library/react'
import { NotesList } from '@/components/features/notes-list'

describe('NotesList', () => {
  it('renders each note body and tag', () => {
    const notes = [
      { id: '1', candidateId: 'c1', authorId: 'a1', body: 'Strong React', at: '2026-01-05T10:00:00Z', tags: ['react', 'top'], pinned: true },
      { id: '2', candidateId: 'c1', authorId: 'a2', body: 'Good culture fit', at: '2026-01-04T10:00:00Z', tags: ['culture'] },
    ]
    render(<NotesList notes={notes} />)
    expect(screen.getByText(/strong react/i)).toBeInTheDocument()
    expect(screen.getByText(/good culture fit/i)).toBeInTheDocument()
    expect(screen.getByText('react')).toBeInTheDocument()
  })

  it('renders an empty state when no notes', () => {
    render(<NotesList notes={[]} />)
    expect(screen.getByText(/no notes yet/i)).toBeInTheDocument()
  })
})
