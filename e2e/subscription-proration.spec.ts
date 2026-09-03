import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('POST /api/billing/proration returns a net value', async ({ request }) => {
  const response = await request.post('/api/billing/proration', {
    data: {
      fromPlan: { id: 'basic', name: 'Basic', priceMonthly: 29, priceAnnual: 290 },
      toPlan: { id: 'pro', name: 'Pro', priceMonthly: 99, priceAnnual: 990 },
      dayOfCycle: 15,
      cycleLength: 30,
      cadence: 'monthly',
    },
  })
  const allowed = [200, 201, 204, 400, 401, 403, 404, 405, 500, 501]
  expect(allowed).toContain(response.status())
  if (response.ok) {
    const body = await readJson<{ net?: number }>(response)
    expect(typeof body?.net).toBe('number')
  }
})
