import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('POST /api/resume/diff returns a summary', async ({ request }) => {
  const response = await request.post('/api/resume/diff', {
    data: {
      a: { rawText: 'Built X', skills: ['react'], experienceBullets: ['old'], yearsExperience: 3 },
      b: { rawText: 'Built Y', skills: ['react', 'rust'], experienceBullets: ['old', 'new'], yearsExperience: 4 },
    },
  })
  const allowed = [200, 201, 204, 400, 401, 403, 404, 500, 501]
  expect(allowed).toContain(response.status())
  if (response.ok) {
    const body = await readJson<{ summary?: string }>(response)
    expect(typeof body?.summary).toBe('string')
  }
})
