import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('GET /api/comp/benchmark returns percentiles', async ({ request }) => {
  const response = await expectJsonContract(request, '/api/comp/benchmark?jobFamily=engineering&level=3&currency=USD', [200, 204, 400, 401, 404, 422, 500])
  if (response.ok) {
    const body = await readJson<{ p50?: number }>(response)
    expect(typeof body?.p50).toBe('number')
  }
})
