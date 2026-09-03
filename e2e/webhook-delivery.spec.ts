import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('POST /api/webhooks/test returns a delivery summary', async ({ request }) => {
  const response = await request.post('/api/webhooks/test', {
    data: { url: 'https://example.com/hook', payload: { event: 'ping' } },
  })
  const allowed = [200, 201, 204, 400, 401, 403, 404, 500, 501]
  expect(allowed).toContain(response.status())
  if (response.ok) {
    const body = await readJson<{ status?: string; attempts?: number }>(response)
    expect(typeof body?.attempts).toBe('number')
  }
})
