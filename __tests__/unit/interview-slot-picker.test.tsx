import { render, screen } from '@testing-library/react'
import { InterviewSlotList } from '@/components/features/interview-slot-list'

describe('InterviewSlotList', () => {
  it('renders each slot start as a button', () => {
    const slots = [
      { start: '2026-01-05T10:00:00', end: '2026-01-05T10:30:00', interviewer: 'Maya' },
      { start: '2026-01-05T11:00:00', end: '2026-01-05T11:30:00', interviewer: 'Maya' },
    ]
    render(<InterviewSlotList slots={slots} />)
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('renders an empty state when no slots are available', () => {
    render(<InterviewSlotList slots={[]} />)
    expect(screen.getByText(/no slots available/i)).toBeInTheDocument()
  })
})
