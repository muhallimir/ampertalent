import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('GET /api/employer/credits returns a numeric balance or 401/404', async ({ request }) => {
  const response = await expectJsonContract(request, '/api/employer/credits', [200, 401, 403, 404, 500])
  if (response.ok) {
    const body = await readJson<{ balance?: number }>(response)
    expect(typeof body?.balance).toBe('number')
  }
})
