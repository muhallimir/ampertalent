import { render, screen } from '@testing-library/react'
import { SalaryDisplay } from '@/components/features/salary-display'

describe('SalaryDisplay', () => {
  it('renders annual, monthly, weekly, and hourly figures', () => {
    render(<SalaryDisplay annual={120000} monthly={10000} weekly={2307.69} hourly={57.69} currency="USD" />)
    expect(screen.getByTestId('salary-display').textContent).toMatch(/\$120,000\.00/)
    expect(screen.getByTestId('salary-display').textContent).toMatch(/year/i)
  })

  it('hides zero values', () => {
    render(<SalaryDisplay annual={0} monthly={0} weekly={0} hourly={0} currency="USD" />)
    expect(screen.getByText(/salary not provided/i)).toBeInTheDocument()
  })
})
