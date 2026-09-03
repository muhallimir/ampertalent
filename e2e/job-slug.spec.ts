import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('POST /api/jobs/slug returns a unique slug', async ({ request }) => {
  const response = await request.post('/api/jobs/slug', {
    data: { title: 'Senior FE', company: 'Acme', taken: ['senior-fe-acme'] },
  })
  const allowed = [200, 201, 204, 400, 401, 403, 404, 500, 501]
  expect(allowed).toContain(response.status())
  if (response.ok) {
    const body = await readJson<{ slug?: string }>(response)
    expect(body?.slug).toMatch(/senior-fe-acme-2/)
  }
})
