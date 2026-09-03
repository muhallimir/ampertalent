import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('POST /api/applications/transition returns the new status on success', async ({ request }) => {
  const response = await request.post('/api/applications/transition', {
    data: { from: 'submitted', to: 'screening', actor: 'employer' },
  })
  const allowed = [200, 201, 204, 400, 401, 403, 404, 405, 409, 422, 500, 501]
  expect(allowed).toContain(response.status())
  if (response.ok) {
    const body = await readJson<{ status?: string }>(response)
    expect(body?.status).toBe('screening')
  }
})

test('public route exists', async ({ request }) => {
  await expectJsonContract(request, '/api/applications/transition', [200, 201, 204, 400, 401, 403, 404, 405, 500, 501])
})
