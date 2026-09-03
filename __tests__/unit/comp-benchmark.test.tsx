import { render, screen } from '@testing-library/react'
import { BenchmarkChart } from '@/components/features/benchmark-chart'

describe('BenchmarkChart', () => {
  it('renders p25, p50, p75, and p90', () => {
    render(
      <BenchmarkChart
        currency="USD"
        level={3}
        p25={100000}
        p50={130000}
        p75={160000}
        p90={200000}
        source={42}
      />,
    )
    expect(screen.getByTestId('bench-p50').textContent).toMatch(/130,000/)
    expect(screen.getByTestId('bench-p75').textContent).toMatch(/160,000/)
    expect(screen.getByTestId('bench-source').textContent).toMatch(/42/)
  })

  it('renders a not-enough-data state when no points are present', () => {
    render(<BenchmarkChart currency="USD" level={3} p25={0} p50={0} p75={0} p90={0} source={0} />)
    expect(screen.getByTestId('bench-empty').textContent).toMatch(/not enough data/i)
  })
})
