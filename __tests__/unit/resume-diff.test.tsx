import { render, screen } from '@testing-library/react'
import { ResumeDiffCard } from '@/components/features/resume-diff-card'

describe('ResumeDiffCard', () => {
  it('renders the summary and added/removed skills', () => {
    render(
      <ResumeDiffCard
        addedSkills={['rust', 'kubernetes']}
        removedSkills={['perl']}
        addedBullets={['Built X']}
        removedBullets={[]}
        yearsDelta={1}
        wordsAdded={120}
        wordsRemoved={50}
        summary="2 skills added, 1 removed, 1 new bullets, +1y experience."
      />,
    )
    expect(screen.getByTestId('diff-summary').textContent).toMatch(/2 skills added/i)
    expect(screen.getByText('rust')).toBeInTheDocument()
    expect(screen.getByText('perl')).toBeInTheDocument()
  })

  it('renders an empty state when nothing changed', () => {
    render(
      <ResumeDiffCard
        addedSkills={[]}
        removedSkills={[]}
        addedBullets={[]}
        removedBullets={[]}
        yearsDelta={0}
        wordsAdded={0}
        wordsRemoved={0}
        summary="No changes."
      />,
    )
    expect(screen.getByText(/no changes/i)).toBeInTheDocument()
  })
})
