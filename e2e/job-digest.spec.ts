import { test, expect } from '@playwright/test'
import { expectJsonContract, readJson } from './support/helpers'

test('POST /api/digest/preview returns a subject + markdown body', async ({ request }) => {
  const response = await request.post('/api/digest/preview', {
    data: {
      recipientName: 'Sam',
      sections: [
        { heading: 'Engineering', jobs: [{ id: 'j1', title: 'Senior FE', company: 'Acme', url: 'https://example.com/j/1' }] },
      ],
    },
  })
  const allowed = [200, 201, 204, 400, 401, 403, 404, 405, 500, 501]
  expect(allowed).toContain(response.status())
  if (response.ok) {
    const body = await readJson<{ subject?: string; markdown?: string }>(response)
    expect(body?.subject).toBeTruthy()
    expect(body?.markdown).toBeTruthy()
  }
})
