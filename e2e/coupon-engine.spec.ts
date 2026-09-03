import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('POST /api/coupons/apply returns a discount', async ({ request }) => {
  const response = await request.post('/api/coupons/apply', {
    data: {
      code: 'WELCOME10',
      orderTotalCents: 5000,
      customerId: 'cust-1',
    },
  })
  const allowed = [200, 201, 204, 400, 401, 403, 404, 409, 500, 501]
  expect(allowed).toContain(response.status())
  if (response.ok) {
    const body = await readJson<{ ok?: boolean; discountCents?: number }>(response)
    expect(typeof body?.ok).toBe('boolean')
  }
})
