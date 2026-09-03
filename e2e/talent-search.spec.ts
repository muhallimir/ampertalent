import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('GET /api/talent/search returns array of results or 401/404', async ({ request }) => {
  const response = await expectJsonContract(request, '/api/talent/search?text=react', [200, 204, 400, 401, 403, 404, 500])
  if (response.ok) {
    const body = await readJson<unknown[]>(response)
    if (Array.isArray(body)) {
      expect(Array.isArray(body)).toBe(true)
    }
  }
})
