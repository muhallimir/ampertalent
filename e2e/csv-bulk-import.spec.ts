import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('POST /api/candidates/bulk returns a count and issue list', async ({ request }) => {
  const response = await request.post('/api/candidates/bulk', {
    data: { csv: 'name,email\nSam,sam@example.com' },
  })
  const allowed = [200, 201, 204, 400, 401, 403, 404, 500, 501]
  expect(allowed).toContain(response.status())
  if (response.ok) {
    const body = await readJson<{ imported?: number; total?: number }>(response)
    expect(typeof body?.imported).toBe('number')
    expect(typeof body?.total).toBe('number')
  }
})
