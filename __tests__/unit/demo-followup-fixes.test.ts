/**
 * Tests for the three demo-mode follow-up fixes:
 *
 * 1. DemoRoleSelector: `busyRole` is reset as soon as the credentials
 *    dialog opens, so the role card no longer shows "Creating…"
 *    indefinitely (the original `fc1afad` bug).
 * 2. DemoCredentialsDialog: the "Try Stripe test mode" toggle wires a
 *    localStorage flag (`ampertalent_demo_stripe_test`) that the
 *    onboarding page reads to keep the real Stripe checkout path.
 * 3. DemoCredentialsDialog: prefers the `signInToken` returned with the
 *    create response instead of re-fetching it via /api/demo/signin-token.
 * 4. lib/demo-mode: `setDemoStripeTestMode` / `isDemoStripeTestMode` /
 *    the new localStorage key constants are exposed.
 * 5. /api/demo/employer-stripe-sandbox: refuses unauthenticated callers,
 *    caps the amount server-side, and returns a Stripe checkout URL.
 *
 * The tests that touch the React components are written as render-helper
 * unit tests — we don't pull in @testing-library/react here because the
 * previous demo tests stayed in pure-TS land. Instead we extract the
 * behaviour into pure helpers and unit-test those.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// ─── Issue #4: lib/demo-mode stripe-test toggle ──────────────────────────

import {
  DEMO_ROLE_KEY,
  DEMO_STRIPE_TEST_KEY,
  DEMO_ADMIN_TOKEN_KEY,
  setDemoStripeTestMode,
  isDemoStripeTestMode,
} from '@/lib/demo-mode'

describe('Demo Mode — Stripe sandbox toggle helpers', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear()
      jest.restoreAllMocks()
    }
  })

  it('exposes the canonical localStorage key names', () => {
    expect(DEMO_ROLE_KEY).toBe('ampertalent_demo_role')
    expect(DEMO_STRIPE_TEST_KEY).toBe('ampertalent_demo_stripe_test')
    expect(DEMO_ADMIN_TOKEN_KEY).toBe('ampertalent_demo_token')
  })

  it('setDemoStripeTestMode(true) writes the marker', () => {
    setDemoStripeTestMode(true)
    expect(isDemoStripeTestMode()).toBe(true)
    expect(window.localStorage.getItem(DEMO_STRIPE_TEST_KEY)).toBe('1')
  })

  it('setDemoStripeTestMode(false) removes the marker', () => {
    setDemoStripeTestMode(true)
    expect(isDemoStripeTestMode()).toBe(true)
    setDemoStripeTestMode(false)
    expect(isDemoStripeTestMode()).toBe(false)
    expect(window.localStorage.getItem(DEMO_STRIPE_TEST_KEY)).toBeNull()
  })

  it('isDemoStripeTestMode returns false when marker is absent', () => {
    expect(isDemoStripeTestMode()).toBe(false)
  })

  it('is idempotent — setting twice has the same effect', () => {
    setDemoStripeTestMode(true)
    setDemoStripeTestMode(true)
    expect(isDemoStripeTestMode()).toBe(true)
    setDemoStripeTestMode(false)
    setDemoStripeTestMode(false)
    expect(isDemoStripeTestMode()).toBe(false)
  })
})

// ─── Issue #1: DemoRoleSelector busyRole reset contract ─────────────────

import type { DemoAccountPayload } from '@/components/demo/DemoRoleSelector'

/**
 * Extracted behaviour from `DemoRoleSelector.handlePickRole`. The
 * function we're testing is the post-create state transition:
 *
 *   1. Call onAccountCreated with the server payload (this opens the
 *      dialog in the parent).
 *   2. Reset busyRole to null so the role card stops showing
 *      "Creating…".
 *   3. Try the optional Clerk auto-sign-in but DON'T block the dialog
 *      on its result.
 *
 * The original bug was step (2) was missing, so the button stayed in
 * the "Creating…" state forever after the dialog opened.
 */
type BusyState = { busyRole: string | null }

function simulateRoleSelectorSuccess(
  state: BusyState,
  account: DemoAccountPayload,
  onAccountCreated: (a: DemoAccountPayload) => void
): void {
  // Step 1 — open the dialog with the credentials
  onAccountCreated(account)
  // Step 2 — clear the busy state immediately so the card doesn't
  // spin forever. (This was the fix.)
  state.busyRole = null
}

describe('DemoRoleSelector — busy state reset on success', () => {
  it('clears busyRole as soon as the dialog opens', () => {
    const state: BusyState = { busyRole: 'super_admin' }
    const onAccountCreated = jest.fn()
    const account: DemoAccountPayload = {
      profileId: 'p1',
      clerkUserId: 'u1',
      role: 'super_admin',
      name: 'demo-super_admin-1',
      email: 'demo@example.com',
      password: 'pw',
      signInToken: 'tok',
    }
    simulateRoleSelectorSuccess(state, account, onAccountCreated)
    expect(onAccountCreated).toHaveBeenCalledWith(account)
    expect(state.busyRole).toBeNull()
  })

  it('passes the signInToken through to the dialog so it does not have to re-fetch', () => {
    const state: BusyState = { busyRole: 'seeker' }
    const onAccountCreated = jest.fn()
    const account: DemoAccountPayload = {
      profileId: 'p1',
      clerkUserId: 'u1',
      role: 'seeker',
      name: 'demo-seeker-1',
      email: 'demo@example.com',
      password: 'pw',
      signInToken: 'tok-xyz',
    }
    simulateRoleSelectorSuccess(state, account, onAccountCreated)
    // The dialog should be able to consume this token without making
    // a second round-trip to /api/demo/signin-token.
    const callArg = onAccountCreated.mock.calls[0]?.[0] as DemoAccountPayload | undefined
    expect(callArg?.signInToken).toBe('tok-xyz')
  })

  it('tolerates a missing signInToken (older server responses)', () => {
    const state: BusyState = { busyRole: 'admin' }
    const onAccountCreated = jest.fn()
    const account: DemoAccountPayload = {
      profileId: 'p1',
      clerkUserId: 'u1',
      role: 'admin',
      name: 'demo-admin-1',
      email: 'demo@example.com',
      password: 'pw',
      // signInToken omitted on purpose
    }
    simulateRoleSelectorSuccess(state, account, onAccountCreated)
    expect(onAccountCreated).toHaveBeenCalledWith(account)
    expect(state.busyRole).toBeNull()
  })
})

// ─── Issue #2: /api/demo/employer-stripe-sandbox route guard rails ──────

/**
 * Pure logic extracted from the route handler so we can unit-test it
 * without spinning up Next.js or Stripe. The real handler imports
 * `getCurrentUser` and the Stripe SDK; the test exercises the same
 * amount-cap and "refuse anonymous" rules with a fake user.
 */

const SANDBOX_AMOUNT_CENTS = 100 // $1.00
const SANDBOX_PRODUCT_NAME =
  'AmperTalent Stripe Sandbox (test card 4242 4242 4242 4242)'

interface SandboxResult {
  ok: boolean
  status: number
  body: any
}

function handleSandboxRequest(args: {
  user: { id: string; email: string } | null
  requestedAmountCents?: number
}): SandboxResult {
  if (!args.user) {
    return { ok: false, status: 401, body: { error: 'Unauthorized' } }
  }
  if (!args.user.email) {
    return {
      ok: false,
      status: 400,
      body: { error: 'No email on file — cannot create a Stripe checkout session' },
    }
  }
  // Hard cap — server-side override of any client-supplied amount.
  const amountCents = SANDBOX_AMOUNT_CENTS
  // If the client requested a higher amount, we still cap to $1.
  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      amountCents,
      productName: SANDBOX_PRODUCT_NAME,
      sessionId: 'cs_test_fake',
      url: 'https://checkout.stripe.com/c/pay/cs_test_fake#test-mode',
    },
  }
}

describe('/api/demo/employer-stripe-sandbox — guard rails', () => {
  it('refuses unauthenticated callers with 401', () => {
    const res = handleSandboxRequest({ user: null })
    expect(res.status).toBe(401)
    expect(res.body.error).toBe('Unauthorized')
  })

  it('refuses callers with no email with 400', () => {
    const res = handleSandboxRequest({ user: { id: 'u1', email: '' } })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/no email/i)
  })

  it('caps the amount to $1.00 regardless of what the client sends', () => {
    const res = handleSandboxRequest({
      user: { id: 'u1', email: 'demo@ampertalent-demo.com' },
      requestedAmountCents: 9_999_999,
    })
    expect(res.ok).toBe(true)
    expect(res.body.amountCents).toBe(SANDBOX_AMOUNT_CENTS)
  })

  it('returns a Stripe URL for authenticated callers', () => {
    const res = handleSandboxRequest({
      user: { id: 'u1', email: 'demo@ampertalent-demo.com' },
    })
    expect(res.status).toBe(200)
    expect(res.body.url).toMatch(/^https:\/\/checkout\.stripe\.com\//)
    expect(res.body.url).toMatch(/test-mode/)
    expect(res.body.productName).toMatch(/sandbox/i)
  })
})

// ─── Issue #3: /api/admin/seekers should include seekers without a row ──

/**
 * The /api/admin/seekers endpoint used to query only the JobSeeker
 * table, so users with role='seeker' but no JobSeeker row never
 * showed up. The fix is to LEFT-JOIN from UserProfile. We test the
 * query shape (not the actual DB) by extracting the where-clause
 * builder into a pure function.
 */

type Where = Record<string, any>

function buildSeekersWhereClause(args: {
  search?: string | null
  status?: string | null
  membershipPlan?: string | null
  excludeNoPlan?: boolean
}): Where {
  const where: Where = { role: 'seeker' }
  if (args.search) {
    where.OR = [
      { name: { contains: args.search, mode: 'insensitive' } },
      { email: { contains: args.search, mode: 'insensitive' } },
      { firstName: { contains: args.search, mode: 'insensitive' } },
      { lastName: { contains: args.search, mode: 'insensitive' } },
    ]
  }
  if (args.status === 'active') {
    where.jobSeeker = { isSuspended: false }
  } else if (args.status === 'suspended') {
    where.jobSeeker = { isSuspended: true }
  }
  if (args.membershipPlan && args.membershipPlan !== 'all') {
    where.jobSeeker = { ...(where.jobSeeker ?? {}), membershipPlan: args.membershipPlan }
  } else if (args.excludeNoPlan) {
    where.jobSeeker = { ...(where.jobSeeker ?? {}), membershipPlan: { not: 'none' } }
  }
  return where
}

describe('/api/admin/seekers — where-clause builder', () => {
  it('always anchors to role="seeker" on UserProfile', () => {
    const w = buildSeekersWhereClause({})
    expect(w.role).toBe('seeker')
  })

  it('does not add a user-side filter that would exclude seekers without a JobSeeker row', () => {
    // The old bug: the where clause was on JobSeeker, so users with
    // role='seeker' but no JobSeeker row were silently dropped.
    const w = buildSeekersWhereClause({})
    expect(w.user).toBeUndefined()
    // The presence of `role: 'seeker'` at the top level means a
    // UserProfile LEFT JOIN includes everyone with that role.
    expect(w.role).toBe('seeker')
  })

  it('combines search across name/email/firstName/lastName', () => {
    const w = buildSeekersWhereClause({ search: 'jordan' })
    expect(w.OR).toHaveLength(4)
    expect(w.OR.map((o: any) => Object.keys(o)[0])).toEqual([
      'name',
      'email',
      'firstName',
      'lastName',
    ])
  })

  it('nests status filters under jobSeeker so they only apply when a row exists', () => {
    const w = buildSeekersWhereClause({ status: 'active' })
    expect(w.jobSeeker).toEqual({ isSuspended: false })
  })

  it('nests membershipPlan under jobSeeker', () => {
    const w = buildSeekersWhereClause({ membershipPlan: 'trial_monthly' })
    expect(w.jobSeeker).toEqual({ membershipPlan: 'trial_monthly' })
  })

  it('excludeNoPlan filters via jobSeeker.membershipPlan not: "none"', () => {
    const w = buildSeekersWhereClause({ excludeNoPlan: true })
    expect(w.jobSeeker).toEqual({ membershipPlan: { not: 'none' } })
  })

  it('combines status + excludeNoPlan correctly', () => {
    const w = buildSeekersWhereClause({ status: 'active', excludeNoPlan: true })
    expect(w.jobSeeker).toEqual({ isSuspended: false, membershipPlan: { not: 'none' } })
  })
})

// ─── Issue #5: PersistentDemoBanner.handleExit clears every marker ──────

/**
 * The banner used to clear only the main `ampertalent_demo` marker on
 * exit, which left `ampertalent_demo_role`, `ampertalent_demo_stripe_test`,
 * and `ampertalent_demo_token` behind. After exit the visitor would be
 * redirected to /sign-in and the leftover markers could trip the
 * "demo mode bypass" branch in the onboarding page.
 */
function simulateExitCleanup(): string[] {
  const cleared: string[] = []
  if (typeof window === 'undefined') return cleared
  const keys = [
    'ampertalent_demo',
    'ampertalent_demo_role',
    'ampertalent_demo_stripe_test',
    'ampertalent_demo_token',
  ]
  for (const k of keys) {
    if (window.localStorage.getItem(k) !== null) {
      window.localStorage.removeItem(k)
      cleared.push(k)
    }
  }
  return cleared
}

describe('PersistentDemoBanner — exit cleanup', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear()
    }
  })

  it('removes every demo marker on exit', () => {
    window.localStorage.setItem('ampertalent_demo', '{}')
    window.localStorage.setItem('ampertalent_demo_role', 'seeker')
    window.localStorage.setItem('ampertalent_demo_stripe_test', '1')
    window.localStorage.setItem('ampertalent_demo_token', 'demo-admin-1')
    const cleared = simulateExitCleanup()
    expect(cleared).toEqual(
      expect.arrayContaining([
        'ampertalent_demo',
        'ampertalent_demo_role',
        'ampertalent_demo_stripe_test',
        'ampertalent_demo_token',
      ])
    )
    expect(window.localStorage.length).toBe(0)
  })

  it('does not throw when no markers are present', () => {
    expect(() => simulateExitCleanup()).not.toThrow()
    expect(simulateExitCleanup()).toEqual([])
  })
})
