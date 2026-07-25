/**
 * Demo Onboarding — Integration Tests
 *
 * Pins the contract that `POST /api/onboarding/complete`:
 *  - accepts `role: 'admin'` ONLY when a valid demo token is supplied
 *  - rejects `role: 'admin'` without a demo token (defence in depth)
 *  - still works for the regular seeker/employer paths (regression guard)
 *
 * TDD red phase: written BEFORE the implementation change in
 * app/api/onboarding/complete/route.ts.
 */

import { db } from '@/lib/db'
import { describe, it, expect, afterAll } from '@jest/globals'

// Mock Clerk auth
jest.mock('@clerk/nextjs/server', () => {
  return {
    auth: jest.fn().mockResolvedValue({ userId: 'demo_clerk_admin' }),
    clerkClient: jest.fn().mockResolvedValue({
      users: {
        getUser: jest.fn(async (id: string) => ({
          id,
          emailAddresses: [{ emailAddress: `demo-admin-${id}@ampertalent-demo.com` }],
          firstName: 'Demo',
          lastName: 'Admin',
          primaryEmailAddress: { emailAddress: `demo-admin-${id}@ampertalent-demo.com` },
        })),
      },
    }),
  }
})

async function callComplete(body: any) {
  const { POST } = await import('@/app/api/onboarding/complete/route')
  const request = new Request('http://localhost/api/onboarding/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return await POST(request as any)
}

describe('Onboarding API — demo role support', () => {
  const createdIds: string[] = []

  afterAll(async () => {
    for (const id of createdIds) {
      try {
        await db.jobSeeker.delete({ where: { userId: id } }).catch(() => {})
        await db.employer.delete({ where: { userId: id } }).catch(() => {})
        await db.userProfile.delete({ where: { id } }).catch(() => {})
      } catch {
        // ignore
      }
    }
    await db.userProfile.deleteMany({ where: { name: { startsWith: 'demo-' } } }).catch(() => {})
  })

  it('accepts role=admin when a valid demo token is supplied', async () => {
    const res = await callComplete({
      role: 'admin',
      firstName: 'Demo',
      lastName: 'Admin',
      location: 'Remote',
      demoToken: 'demo-admin-1719938112443',
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.role).toBe('admin')
    if (data.userId) createdIds.push(data.userId)
  })

  it('rejects role=admin without a demo token (403)', async () => {
    const res = await callComplete({
      role: 'admin',
      firstName: 'Demo',
      lastName: 'Admin',
      location: 'Remote',
    })
    expect(res.status).toBe(403)
  })

  it('rejects role=super_admin without a demo token (403)', async () => {
    const res = await callComplete({
      role: 'super_admin',
      firstName: 'Demo',
      lastName: 'Super',
      location: 'Remote',
    })
    expect(res.status).toBe(403)
  })

  it('still works for the regular seeker path (regression guard)', async () => {
    const res = await callComplete({
      role: 'seeker',
      firstName: 'Demo',
      lastName: 'Seeker',
      location: 'Remote',
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.role).toBe('seeker')
    if (data.userId) createdIds.push(data.userId)
  })
})
