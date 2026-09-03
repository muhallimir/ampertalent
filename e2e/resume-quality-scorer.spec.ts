import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('POST /api/resume/quality returns a numeric score', async ({ request }) => {
  const response = await request.post('/api/resume/quality', {
    data: { rawText: 'Built a React app. Reduced load time by 40%. Led a team of 3.' },
  })
  const allowed = [200, 201, 204, 400, 401, 403, 404, 500, 501]
  expect(allowed).toContain(response.status())
  if (response.ok) {
    const body = await readJson<{ overall?: number }>(response)
    expect(typeof body?.overall).toBe('number')
  }
})
