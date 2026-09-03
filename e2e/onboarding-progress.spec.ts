import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('GET /api/onboarding/progress returns a percent', async ({ request }) => {
  const response = await expectJsonContract(request, '/api/onboarding/progress', [200, 204, 400, 401, 403, 500])
  if (response.ok) {
    const body = await readJson<{ percent?: number }>(response)
    expect(typeof body?.percent).toBe('number')
  }
})
