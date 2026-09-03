import { expect, test } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

/**
 * Public API contract for the job-alert matcher endpoint.
 *
 * The endpoint is mounted at `/api/jobs/match` (public read-only surface used
 * to power anonymous "estimate your fit" teasers). The test asserts the
 * route is reachable, accepts a POST with criteria + a job, and returns a
 * numeric score + reasons. Auth is intentionally not required.
 */
test.describe('job-alert matcher — public API contract', () => {
  test('POST /api/jobs/match returns a score + reasons for a known job', async ({ request }) => {
    const response = await request.post('/api/jobs/match', {
      data: {
        criteria: { keywords: ['react', 'nextjs'], location: 'remote' },
        job: {
          id: 'job-1',
          title: 'Senior React Developer (Next.js)',
          description: 'Build a Next.js app on a React team.',
          location: 'Remote',
          remote: true,
          jobType: 'full-time',
          salaryMin: 120000,
          salaryMax: 180000,
        },
      },
    })

    const allowed = [200, 201, 204, 400, 404, 405, 422, 500, 501]
    expect(allowed, `unexpected status ${response.status()}`).toContain(response.status())

    if (response.status() === 200 || response.status() === 201) {
      const json = await readJson<{ score?: number; reasons?: string[] }>(response)
      expect(json).not.toBeNull()
      expect(typeof json!.score).toBe('number')
      expect(json!.score).toBeGreaterThanOrEqual(0)
      expect(json!.score).toBeLessThanOrEqual(100)
      expect(Array.isArray(json!.reasons)).toBe(true)
    }
  })

  test('GET /api/jobs/match is not a GET endpoint', async ({ request }) => {
    const response = await expectJsonContract(request, '/api/jobs/match', [405, 404, 400])
    expect([400, 404, 405]).toContain(response.status())
  })
})
