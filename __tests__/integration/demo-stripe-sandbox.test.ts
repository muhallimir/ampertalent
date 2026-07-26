/**
 * Demo follow-up fix — Integration Tests
 *
 * Drives the new /api/demo/employer-stripe-sandbox route (Issue #3b) to
 * confirm it refuses anonymous callers and creates a real Stripe test
 * checkout session for authenticated callers. The Stripe SDK is mocked
 * because we don't have a live key in the test env.
 */

import { db } from '@/lib/db'
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals'

// Mock Clerk — default user is "user_test_anon" with a verified email.
// Tests call `(await importClerk()).auth.mockResolvedValueOnce(...)`
// to override per-call.
jest.mock('@clerk/nextjs/server', () => {
  const authFn: any = jest.fn()
  authFn.mockResolvedValue({ userId: 'user_test_anon' })
  return {
    auth: authFn,
    clerkClient: jest.fn(() =>
      Promise.resolve({
        users: {
          getUser: jest.fn(async () => ({
            id: 'user_test_anon',
            emailAddresses: [{ emailAddress: 'demo@ampertalent-demo.com' }],
          })),
        },
      })
    ),
  }
})

async function importClerk() {
  return (await import('@clerk/nextjs/server')) as any
}

// Mock the Stripe SDK to capture the call args and return a fake session.
const mockStripeCreate = jest.fn(async (params: any) => ({
  id: 'cs_test_fake_123',
  url: `https://checkout.stripe.com/c/pay/cs_test_fake_123#${params.metadata?.isStripeSandbox ?? '?'}`,
}))
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockStripeCreate } },
  }))
})

// Dynamic import so the route module sees the mocks at runtime.
async function callRoute(method: string, body?: any) {
  const mod = await import('@/app/api/demo/employer-stripe-sandbox/route')
  const req = new Request('http://localhost:3000/api/demo/employer-stripe-sandbox', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return mod.POST(req as any)
}

describe('/api/demo/employer-stripe-sandbox', () => {
  beforeAll(() => {
    // Ensure the Prisma client is connected
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  it('returns 401 when there is no authenticated user', async () => {
    const clerk = await importClerk()
    clerk.auth.mockResolvedValueOnce({ userId: null })
    const res = await callRoute('POST')
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('creates a Stripe test checkout session for authenticated callers', async () => {
    const clerk = await importClerk()
    clerk.auth.mockResolvedValueOnce({ userId: 'user_test_anon' })
    mockStripeCreate.mockClear()
    const res = await callRoute('POST')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.url).toMatch(/^https:\/\/checkout\.stripe\.com\//)
    expect(json.sessionId).toBe('cs_test_fake_123')

    // Verify Stripe was called with the correct amount ($1.00 = 100 cents)
    expect(mockStripeCreate).toHaveBeenCalledTimes(1)
    const callArgs = mockStripeCreate.mock.calls[0][0]
    expect(callArgs.line_items[0].price_data.unit_amount).toBe(100)
    expect(callArgs.line_items[0].price_data.currency).toBe('usd')
    expect(callArgs.line_items[0].price_data.product_data.name).toMatch(/sandbox/i)
    expect(callArgs.metadata.isStripeSandbox).toBe('1')
    expect(callArgs.metadata.clerkUserId).toBe('user_test_anon')
  })
})
