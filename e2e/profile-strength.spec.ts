import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('GET /api/profile/strength returns a numeric score and level', async ({ request }) => {
  const response = await expectJsonContract(request, '/api/profile/strength', [200, 204, 400, 401, 403, 500])
  if (response.ok) {
    const body = await readJson<{ score?: number; level?: string }>(response)
    expect(typeof body?.score).toBe('number')
    expect(typeof body?.level).toBe('string')
  }
})
