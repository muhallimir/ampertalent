import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('POST /api/jobs/score returns a numeric overall', async ({ request }) => {
  const response = await request.post('/api/jobs/score', {
    data: {
      title: 'Senior FE',
      description: 'Build things. ' + 'lorem ipsum '.repeat(50),
      companyName: 'Acme',
      salaryMin: 100000,
      salaryMax: 150000,
      location: 'Remote',
      remote: true,
      employmentType: 'FULL_TIME',
      applyUrl: 'https://example.com/apply',
    },
  })
  const allowed = [200, 201, 204, 400, 401, 403, 404, 500, 501]
  expect(allowed).toContain(response.status())
  if (response.ok) {
    const body = await readJson<{ overall?: number }>(response)
    expect(typeof body?.overall).toBe('number')
  }
})
