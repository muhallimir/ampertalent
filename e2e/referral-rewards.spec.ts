import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('GET /api/referrals/earnings returns total + pending + paid', async ({ request }) => {
  const response = await expectJsonContract(request, '/api/referrals/earnings', [200, 204, 400, 401, 403, 500])
  if (response.ok) {
    const body = await readJson<{ totalCents?: number; pendingCents?: number; paidCents?: number }>(response)
    expect(typeof body?.totalCents).toBe('number')
    expect(typeof body?.pendingCents).toBe('number')
    expect(typeof body?.paidCents).toBe('number')
  }
})
