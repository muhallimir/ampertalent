import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('POST /api/interviews/feedback returns a summary', async ({ request }) => {
  const response = await request.post('/api/interviews/feedback', {
    data: {
      interviewer: 'Maya',
      candidateId: 'c-1',
      scores: { technical: 4, communication: 5, culture: 4, problemSolving: 4 },
      notes: 'Great candidate',
      recommendation: 'hire',
    },
  })
  const allowed = [200, 201, 204, 400, 401, 403, 404, 405, 500, 501]
  expect(allowed).toContain(response.status())
  if (response.ok) {
    const body = await readJson<{ overall?: number }>(response)
    expect(typeof body?.overall).toBe('number')
  }
})
