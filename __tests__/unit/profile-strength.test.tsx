import { render, screen } from '@testing-library/react'
import { ProfileStrengthMeter } from '@/components/features/profile-strength-meter'

describe('ProfileStrengthMeter', () => {
  it('renders the score and level', () => {
    render(
      <ProfileStrengthMeter
        score={82}
        level="strong"
        missing={['Add education', 'Add a portfolio link']}
      />,
    )
    expect(screen.getByTestId('psm-score').textContent).toMatch(/82/)
    expect(screen.getByText(/strong/i)).toBeInTheDocument()
    expect(screen.getByText(/add education/i)).toBeInTheDocument()
  })

  it('renders a complete state with no missing items', () => {
    render(<ProfileStrengthMeter score={100} level="complete" missing={[]} />)
    expect(screen.getByText(/profile complete/i)).toBeInTheDocument()
  })
})
