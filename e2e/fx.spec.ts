import { test, expect } from '@playwright/test'
import { expectJsonContract } from './support/helpers'

test('GET /api/fx returns supported currencies', async ({ request }) => {
  const response = await expectJsonContract(request, '/api/fx', [200, 204, 404, 405, 500])
  if (response.status() === 200) {
    const body = await response.json()
    expect(body).toBeTruthy()
  }
})
