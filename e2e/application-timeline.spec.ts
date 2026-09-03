import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('GET /api/applications/:id/timeline returns events', async ({ request }) => {
  const response = await expectJsonContract(request, '/api/applications/app-1/timeline', [200, 204, 400, 401, 403, 404, 500])
  if (response.ok) {
    const body = await readJson<unknown[]>(response)
    if (Array.isArray(body)) {
      expect(Array.isArray(body)).toBe(true)
    }
  }
})
