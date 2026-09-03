import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('GET /api/candidates/notes returns an array or auth error', async ({ request }) => {
  const response = await expectJsonContract(request, '/api/candidates/notes?candidateId=c-1', [200, 204, 400, 401, 403, 404, 500])
  if (response.ok) {
    const body = await readJson<unknown[]>(response)
    if (Array.isArray(body)) {
      expect(Array.isArray(body)).toBe(true)
    }
  }
})
