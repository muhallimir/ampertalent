/**
 * Demo PayPal Sandbox — Integration Tests
 *
 * Mirrors `__tests__/integration/demo-stripe-sandbox.test.ts` but for the
 * new `/api/demo/employer-paypal-sandbox` route. The route must:
 *   1. Refuse unauthenticated callers with 401
 *   2. Create a real PayPal billing-agreement token for authenticated
 *      callers and return the approvalUrl
 *   3. Auto-provision the missing Employer row for demo accounts so the
 *      subsequent execute-billing-agreement call doesn't 403
 *
 * The PayPal SDK is mocked because we don't have a live client in tests.
 */

import { db } from '@/lib/db'
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals'

// Mock Clerk — default user is "user_test_anon" with a verified email.
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

// Mock the PayPal SDK to capture the call args and return a fake token.
const mockPaypalCreate = jest.fn(async (params: any) => ({
  tokenId: 'BA-FAKE-TOKEN-123',
  approvalUrl: `https://www.sandbox.paypal.com/agreements/approve?ba_token=BA-FAKE-TOKEN-123&token=${encodeURIComponent(params.returnUrl)}`,
}))

jest.mock('@/lib/paypal', () => {
  return {
    getPayPalClient: () => ({
      isConfigured: () => true,
      createBillingAgreementToken: mockPaypalCreate,
    }),
    formatPayPalStorageId: (id: string) => `PAYPAL|${id}`,
    isPayPalPaymentMethod: (id: string | null) =>
      !!id && id.startsWith('PAYPAL|B-'),
    extractBillingAgreementId: (id: string | null) => {
      if (!id || !id.startsWith('PAYPAL|B-')) return null
      const parts = id.split('|')
      return parts.length === 2 ? parts[1] : null
    },
  }
})

// Dynamic import so the route module sees the mocks at runtime.
async function callRoute(method: string, body?: any) {
  const mod = await import('@/app/api/demo/employer-paypal-sandbox/route')
  const req = new Request('http://localhost:3000/api/demo/employer-paypal-sandbox', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return mod.POST(req as any)
}

describe('/api/demo/employer-paypal-sandbox', () => {
  beforeAll(() => {
    // nothing to set up
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

  it('returns 503 when PayPal is not configured on the server', async () => {
    // Reset the module-level env so the route sees "no env"
    const originalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    const originalSecret = process.env.PAYPAL_CLIENT_SECRET
    delete process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
    delete process.env.PAYPAL_CLIENT_SECRET
    try {
      const clerk = await importClerk()
      clerk.auth.mockResolvedValueOnce({ userId: 'user_test_anon' })
      const res = await callRoute('POST')
      // The route checks isConfigured() on the PayPal client (which we mock
      // to always return true) AND the env vars. The env-var check fires
      // first, so this returns 503.
      expect(res.status).toBe(503)
      const json = await res.json()
      expect(json.error).toMatch(/not configured/i)
    } finally {
      process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID = originalClientId
      process.env.PAYPAL_CLIENT_SECRET = originalSecret
    }
  })

  it('creates a PayPal billing-agreement token and returns the approval URL', async () => {
    const clerk = await importClerk()
    clerk.auth.mockResolvedValueOnce({ userId: 'user_test_anon' })
    mockPaypalCreate.mockClear()
    const res = await callRoute('POST')
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.token).toBe('BA-FAKE-TOKEN-123')
    expect(json.approvalUrl).toMatch(/^https:\/\/www\.sandbox\.paypal\.com\//)

    // Verify the PayPal client was called with our return URL
    expect(mockPaypalCreate).toHaveBeenCalledTimes(1)
    const callArgs = mockPaypalCreate.mock.calls[0][0]
    expect(callArgs.returnUrl).toMatch(/\/employer\/billing\/paypal-setup-return\?sandbox=1/)
    expect(callArgs.cancelUrl).toMatch(/paypal_sandbox=cancelled/)
    expect(callArgs.description).toMatch(/sandbox/i)
  })
})
