import { render, screen } from '@testing-library/react'
import { ImportResultPanel } from '@/components/features/import-result-panel'

describe('ImportResultPanel', () => {
  it('renders the imported count and lists issues', () => {
    render(
      <ImportResultPanel
        total={10}
        imported={8}
        issues={[{ line: 5, field: 'email', message: 'invalid email' }]}
      />,
    )
    expect(screen.getByTestId('import-count').textContent).toMatch(/8\/10/)
    expect(screen.getByText(/line 5/i)).toBeInTheDocument()
  })

  it('renders a success state when there are no issues', () => {
    render(<ImportResultPanel total={3} imported={3} issues={[]} />)
    expect(screen.getByText(/all rows imported/i)).toBeInTheDocument()
  })
})
