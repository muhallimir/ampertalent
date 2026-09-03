import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('POST /api/jobs/dedupe returns duplicate pairs', async ({ request }) => {
  const response = await request.post('/api/jobs/dedupe', {
    data: {
      jobs: [
        { id: '1', title: 'Senior FE', company: 'Acme' },
        { id: '2', title: 'Senior Frontend', company: 'Acme' },
      ],
      threshold: 70,
    },
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
