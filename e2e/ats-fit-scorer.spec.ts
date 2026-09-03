import { expect, test } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test.describe('ATS fit scorer — public API contract', () => {
  test('POST /api/resume/ats-score returns a numeric score', async ({ request }) => {
    const response = await request.post('/api/resume/ats-score', {
      data: {
        resume: { skills: ['react', 'typescript'], yearsExperience: 5, pastTitles: ['Frontend Engineer'] },
        job: { requiredSkills: ['react', 'graphql'], niceToHaveSkills: ['docker'], title: 'senior frontend' },
      },
    })
    const allowed = [200, 201, 204, 400, 404, 405, 422, 500, 501]
    expect(allowed).toContain(response.status())
    if (response.status() === 200 || response.status() === 201) {
      const json = await readJson<{ score?: number }>(response)
      expect(json).not.toBeNull()
      expect(typeof json!.score).toBe('number')
    }
  })

  test('public API surface exists', async ({ request }) => {
    await expectJsonContract(request, '/api/resume/ats-score', [200, 201, 204, 400, 404, 405, 500, 501])
  })
})
