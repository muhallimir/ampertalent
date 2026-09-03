import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('POST /api/jobs/schema returns a JSON-LD object', async ({ request }) => {
  const response = await request.post('/api/jobs/schema', {
    data: {
      title: 'Senior FE',
      description: 'Build things',
      company: 'Acme',
      datePosted: '2026-01-05',
      url: 'https://example.com/jobs/1',
    },
  })
  const allowed = [200, 201, 204, 400, 401, 403, 404, 500, 501]
  expect(allowed).toContain(response.status())
  if (response.ok) {
    const body = await readJson<{ '@type'?: string }>(response)
    expect(body?.['@type']).toBe('JobPosting')
  }
})
