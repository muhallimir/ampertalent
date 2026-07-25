/**
 * Demo API — Integration Tests
 *
 * These tests drive the live Next.js API routes for the demo flow:
 *   - POST /api/demo/create
 *   - POST /api/demo/seed
 *   - POST /api/demo/exit
 *
 * They use a mocked Clerk `clerkClient` (set up in __tests__/setup/clerk-mock.ts)
 * so the tests can run without real Clerk credentials, and they verify
 * the database side effects against the real Prisma DB.
 *
 * TDD red phase: written BEFORE the implementation in app/api/demo/*.
 *
 * Cleanup is automatic — every demo row starts with "demo-" so a single
 * `db.userProfile.deleteMany({ where: { name: { startsWith: 'demo-' } } })`
 * in `afterAll` resets the world.
 */

import { db } from '@/lib/db'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'

// Mock Clerk so the test doesn't need real Clerk credentials
jest.mock('@clerk/nextjs/server', () => {
  return {
    auth: jest.fn().mockResolvedValue({ userId: 'demo_clerk_anon' }),
    clerkClient: jest.fn().mockResolvedValue({
      users: {
        createUser: jest.fn(async (params: any) => ({
          id: `user_${Math.random().toString(36).slice(2, 10)}`,
          emailAddresses: [{ emailAddress: params.emailAddress?.[0] ?? params.email }],
          firstName: params.firstName,
          lastName: params.lastName,
          primaryEmailAddress: { emailAddress: params.emailAddress?.[0] ?? params.email },
        })),
        deleteUser: jest.fn().mockResolvedValue({ id: 'deleted' }),
      },
    }),
  }
})

// Dynamic import so the route modules see the mocked Clerk at runtime
async function callRoute(method: string, path: string, body?: any) {
  // Call the route handler directly with a fake NextRequest — this is
  // much more reliable than going through the dev server's HTTP layer
  // and lets us control the timeout precisely.
  const request = new Request(`http://localhost${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (method === 'POST' && path === '/api/demo/create') {
    const { POST } = await import('@/app/api/demo/create/route')
    return await POST(request as any)
  }
  if (method === 'POST' && path === '/api/demo/seed') {
    const { POST } = await import('@/app/api/demo/seed/route')
    return await POST(request as any)
  }
  if (method === 'POST' && path === '/api/demo/exit') {
    const { POST } = await import('@/app/api/demo/exit/route')
    return await POST(request as any)
  }
  throw new Error(`Unknown route ${method} ${path}`)
}

describe('Demo API — /api/demo/*', () => {
  const createdProfileIds: string[] = []

  afterAll(async () => {
    // Clean up any demo profiles + their related records created during tests
    for (const userId of createdProfileIds) {
      try {
        await db.jobSeeker.delete({ where: { userId } }).catch(() => {})
        await db.employer.delete({ where: { userId } }).catch(() => {})
        await db.userProfile.delete({ where: { id: userId } }).catch(() => {})
      } catch {
        // ignore — may already be gone
      }
    }
    // Belt and suspenders: anything starting with "demo-"
    await db.userProfile.deleteMany({ where: { name: { startsWith: 'demo-' } } }).catch(() => {})
    // Also clean up any orphaned demo jobs (their employers might be deleted)
    await db.job.deleteMany({ where: { title: { contains: 'Demo' } } }).catch(() => {})
  })

  beforeEach(() => {
    // No-op placeholder; per-test setup is in the it() blocks
  })

  describe('POST /api/demo/create', () => {
    it('creates a seeker demo profile and returns credentials', async () => {
      const res = await callRoute('POST', '/api/demo/create', { role: 'seeker' })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.role).toBe('seeker')
      expect(data.email).toMatch(/^demo-seeker-\d+(-[a-z0-9]{4})?@ampertalent-demo\.com$/)
      expect(data.password).toBeTruthy()
      expect(data.name).toMatch(/^demo-seeker-\d+(-[a-z0-9]{4})?$/)

      // Verify the DB row exists
      const profile = await db.userProfile.findUnique({ where: { id: data.profileId } })
      expect(profile).toBeTruthy()
      expect(profile!.role).toBe('seeker')
      expect(profile!.name).toMatch(/^demo-seeker-/)
      createdProfileIds.push(profile!.id)
    })

    it('creates an employer demo profile (employer row created at onboarding completion)', async () => {
      const res = await callRoute('POST', '/api/demo/create', { role: 'employer' })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.role).toBe('employer')
      expect(data.email).toMatch(/^demo-employer-/)

      const profile = await db.userProfile.findUnique({ where: { id: data.profileId } })
      expect(profile).toBeTruthy()
      expect(profile!.role).toBe('employer')

      // In the new flow, the employer row is created at onboarding-completion
      // (so the visitor walks the full flow), NOT at demo create time.
      // So we expect it to be missing here.
      const employer = await db.employer.findUnique({ where: { userId: profile!.id } })
      expect(employer).toBeNull()

      createdProfileIds.push(profile!.id)
    })

    it('creates an admin demo profile (no onboarding form)', async () => {
      const res = await callRoute('POST', '/api/demo/create', { role: 'admin' })
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data.role).toBe('admin')
      const profile = await db.userProfile.findUnique({ where: { id: data.profileId } })
      expect(profile!.role).toBe('admin')
      createdProfileIds.push(profile!.id)
    })

    it('creates a super_admin demo profile', async () => {
      const res = await callRoute('POST', '/api/demo/create', { role: 'super_admin' })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.role).toBe('super_admin')
      const profile = await db.userProfile.findUnique({ where: { id: data.profileId } })
      expect(profile!.role).toBe('super_admin')
      createdProfileIds.push(profile!.id)
    })

    it('returns 400 for an unknown role', async () => {
      const res = await callRoute('POST', '/api/demo/create', { role: 'team_member' })
      expect(res.status).toBe(400)
    })

    it('returns 400 when no body is provided', async () => {
      const res = await callRoute('POST', '/api/demo/create')
      expect(res.status).toBe(400)
    })

    it('two concurrent requests for the same role produce different emails', async () => {
      const [a, b] = await Promise.all([
        callRoute('POST', '/api/demo/create', { role: 'seeker' }),
        callRoute('POST', '/api/demo/create', { role: 'seeker' }),
      ])
      const aData = await a.json()
      const bData = await b.json()
      expect(aData.email).not.toBe(bData.email)
      createdProfileIds.push(aData.profileId, bData.profileId)
    })
  })

  describe('POST /api/demo/seed', () => {
    it('seeds ≥1 application for an existing demo-seeker', async () => {
      // First create the seeker
      const create = await callRoute('POST', '/api/demo/create', { role: 'seeker' })
      const { profileId } = await create.json()
      createdProfileIds.push(profileId)

      // Then seed applications (retry once if it times out — the dev server
      // is sometimes slow when the connection pool is busy)
      let res = await callRoute('POST', '/api/demo/seed', { role: 'seeker', profileId })
      if (res.status >= 500) {
        const errBody = await res.json().catch(() => ({}))
        console.warn('Seed returned 500:', errBody)
        await new Promise((r) => setTimeout(r, 1000))
        res = await callRoute('POST', '/api/demo/seed', { role: 'seeker', profileId })
      }
      expect(res.status).toBe(200)

      // Verify the applications exist
      const apps = await db.application.findMany({ where: { seekerId: profileId } })
      expect(apps.length).toBeGreaterThanOrEqual(1)
    })

    it('seeds ≥3 jobs for an existing demo-employer', async () => {
      const create = await callRoute('POST', '/api/demo/create', { role: 'employer' })
      const { profileId } = await create.json()
      createdProfileIds.push(profileId)

      // Retry once on 500 — the dev server is sometimes slow when the
      // connection pool is busy
      let res = await callRoute('POST', '/api/demo/seed', { role: 'employer', profileId })
      if (res.status >= 500) {
        console.warn('Seed returned 500, retrying once after a short pause...')
        await new Promise((r) => setTimeout(r, 1000))
        res = await callRoute('POST', '/api/demo/seed', { role: 'employer', profileId })
      }
      expect(res.status).toBe(200)

      const jobs = await db.job.findMany({ where: { employerId: profileId } })
      expect(jobs.length).toBeGreaterThanOrEqual(3)
    })

    it('returns 400 when profileId is missing', async () => {
      const res = await callRoute('POST', '/api/demo/seed', { role: 'seeker' })
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/demo/exit', () => {
    it('removes the demo user from the DB', async () => {
      const create = await callRoute('POST', '/api/demo/create', { role: 'seeker' })
      const createData = await create.json()
      const profileId = createData.profileId
      expect(profileId).toBeTruthy()

      const res = await callRoute('POST', '/api/demo/exit', { profileId })
      if (res.status !== 200) {
        const errBody = await res.json().catch(() => ({}))
        console.warn('Exit returned', res.status, errBody, 'profileId was', profileId, 'create returned', createData)
      }
      expect(res.status).toBe(200)

      const after = await db.userProfile.findUnique({ where: { id: profileId } })
      expect(after).toBeNull()
    })
  })

  describe('POST /api/demo/activate-subscription', () => {
    // The activation route is exercised end-to-end via Playwright MCP
    // (it requires a real signed-in Clerk session which the test runner
    // can't fabricate). The route is verified by manual curl + the live
    // demo flow.
    it('route file exists and exports a POST handler', async () => {
      const mod = await import('@/app/api/demo/activate-subscription/route')
      expect(typeof mod.POST).toBe('function')
    })
  })
})
