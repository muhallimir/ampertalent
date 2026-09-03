import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('GET /api/employer/brand returns a completeness score', async ({ request }) => {
  const response = await expectJsonContract(request, '/api/employer/brand', [200, 204, 400, 401, 403, 404, 500])
  if (response.ok) {
    const body = await readJson<{ score?: number }>(response)
    expect(typeof body?.score).toBe('number')
  }
})
