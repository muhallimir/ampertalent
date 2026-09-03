import { render, screen } from '@testing-library/react'
import { FxConverterForm } from '@/components/features/fx-converter-form'

describe('FxConverterForm', () => {
  it('renders the default amount and currencies', () => {
    render(<FxConverterForm amount={100} from="USD" to="EUR" converted={108} />)
    expect(screen.getByTestId('fx-amount').textContent).toMatch(/100/)
    expect(screen.getByTestId('fx-converted').textContent).toMatch(/108/)
  })

  it('renders an error state for invalid conversions', () => {
    render(<FxConverterForm amount={0} from="USD" to="USD" converted={0} error="Unknown currency XYZ" />)
    expect(screen.getByTestId('fx-error').textContent).toMatch(/unknown currency/i)
  })
})
