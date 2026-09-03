import { render, screen } from '@testing-library/react'
import { OnboardingChecklist } from '@/components/features/onboarding-checklist'

describe('OnboardingChecklist', () => {
  it('renders each step with a checkbox-like label', () => {
    const steps = [
      { id: 'profile', label: 'Complete your profile', completed: true, required: true },
      { id: 'avatar', label: 'Upload an avatar', completed: false, required: true },
    ]
    render(<OnboardingChecklist steps={steps} />)
    expect(screen.getByText(/complete your profile/i)).toBeInTheDocument()
    expect(screen.getByText(/upload an avatar/i)).toBeInTheDocument()
    expect(screen.getByTestId('onboarding-percent').textContent).toMatch(/50/)
  })

  it('shows a 100% state when nothing is left', () => {
    const steps = [{ id: 'a', label: 'Done', completed: true, required: true }]
    render(<OnboardingChecklist steps={steps} />)
    expect(screen.getByTestId('onboarding-percent').textContent).toMatch(/100/)
  })
})
