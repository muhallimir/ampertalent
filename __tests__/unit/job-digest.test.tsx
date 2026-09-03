import { render, screen } from '@testing-library/react'
import { DigestPreview } from '@/components/features/digest-preview'

describe('DigestPreview', () => {
  it('renders the subject and total count', () => {
    render(
      <DigestPreview
        subject="3 new jobs for Sam — Mon, Jan 5"
        preheader="3 hand-picked roles"
        totalJobs={3}
        sections={[{ heading: 'Engineering', jobs: [] }]}
      />,
    )
    expect(screen.getByTestId('digest-subject').textContent).toMatch(/3 new jobs for sam/i)
    expect(screen.getByTestId('digest-total').textContent).toMatch(/3/)
  })

  it('renders an empty state when there are no jobs', () => {
    render(
      <DigestPreview subject="No new jobs" preheader="Nothing today" totalJobs={0} sections={[]} />,
    )
    expect(screen.getByText(/no new jobs today/i)).toBeInTheDocument()
  })
})
