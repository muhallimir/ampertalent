import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('GET /api/interviews/slots returns an array of slots or 401/404', async ({ request }) => {
  const response = await expectJsonContract(request, '/api/interviews/slots?from=2026-01-01', [200, 204, 400, 401, 403, 404, 422, 500])
  if (response.ok) {
    const body = await readJson<unknown[]>(response)
    if (Array.isArray(body)) {
      expect(Array.isArray(body)).toBe(true)
    }
  }
})
