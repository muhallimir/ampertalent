import { render, screen } from '@testing-library/react'
import { BrandChecklist } from '@/components/features/brand-checklist'

describe('BrandChecklist', () => {
  it('renders the score and missing items', () => {
    render(
      <BrandChecklist
        hasLogo={true}
        hasBanner={false}
        hasAbout={true}
        hasTestimonial={false}
        photoCount={2}
        videoCount={0}
        score={45}
        missing={['Add a banner image', 'Add at least one employee testimonial']}
      />,
    )
    expect(screen.getByTestId('brand-score').textContent).toMatch(/45/)
    expect(screen.getByText(/add a banner image/i)).toBeInTheDocument()
  })

  it('renders a perfect state when nothing is missing', () => {
    render(
      <BrandChecklist
        hasLogo={true}
        hasBanner={true}
        hasAbout={true}
        hasTestimonial={true}
        photoCount={3}
        videoCount={1}
        score={100}
        missing={[]}
      />,
    )
    expect(screen.getByText(/brand profile complete/i)).toBeInTheDocument()
  })
})
