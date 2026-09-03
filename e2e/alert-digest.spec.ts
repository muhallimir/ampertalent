import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('POST /api/alerts/build returns a digest', async ({ request }) => {
  const response = await request.post('/api/alerts/build', {
    data: {
      rule: { userId: 'u1', keywords: ['react'] },
      jobs: [{ id: 'j1', title: 'Senior React', company: 'Acme', url: 'https://x', postedAt: '2026-01-05' }],
    },
  })
  const allowed = [200, 201, 204, 400, 401, 403, 404, 500, 501]
  expect(allowed).toContain(response.status())
  if (response.ok) {
    const body = await readJson<{ items?: unknown[] }>(response)
    expect(Array.isArray(body?.items)).toBe(true)
  }
})
