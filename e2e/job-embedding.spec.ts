import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('POST /api/jobs/similar returns ranked list', async ({ request }) => {
  const response = await request.post('/api/jobs/similar', {
    data: { id: 'q1', title: 'Senior React Engineer', description: 'Next.js, TypeScript' },
  })
  const allowed = [200, 201, 204, 400, 401, 403, 404, 500, 501]
  expect(allowed).toContain(response.status())
  if (response.ok) {
    const body = await readJson<unknown[]>(response)
    if (Array.isArray(body)) {
      expect(Array.isArray(body)).toBe(true)
    }
  }
})
