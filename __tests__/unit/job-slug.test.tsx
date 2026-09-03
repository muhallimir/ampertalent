import { render, screen } from '@testing-library/react'
import { SlugPreview } from '@/components/features/slug-preview'

describe('SlugPreview', () => {
  it('renders the slug and the source', () => {
    render(<SlugPreview source="Senior FE Engineer" slug="senior-fe-engineer" />)
    expect(screen.getByTestId('slug-value').textContent).toBe('senior-fe-engineer')
  })
})
