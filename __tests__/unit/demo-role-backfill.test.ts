/**
 * Tests for `lib/demo-role-backfill.ts`.
 *
 * The demo flow defers JobSeeker / Employer row creation to the
 * onboarding-completion step. The payment routes use `ensureDemoRoleRows`
 * to auto-create the missing row when a demo user reaches the Stripe /
 * PayPal / post-a-job flows before finishing onboarding.
 *
 * These tests pin the contract of that helper so the payment routes
 * stay aligned with the demo flow.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

// State is hoisted to module scope so the mock factories can share it.
const state: {
  profile: any
  jobSeeker: any
  employer: any
} = { profile: null, jobSeeker: null, employer: null }

const createProfile = jest.fn()
const createJobSeeker = jest.fn()
const createEmployer = jest.fn()
const findUniqueProfile = jest.fn()

jest.mock('@/lib/db', () => ({
  db: {
    userProfile: {
      findUnique: (...args: any[]) => findUniqueProfile(...args),
    },
    jobSeeker: {
      create: (...args: any[]) => createJobSeeker(...args),
    },
    employer: {
      create: (...args: any[]) => createEmployer(...args),
    },
  },
}))

async function ensureDemoRoleRows(profileId: string) {
  const { ensureDemoRoleRows } = await import('@/lib/demo-role-backfill')
  return ensureDemoRoleRows(profileId)
}

function setProfile(p: any) {
  state.profile = p
  findUniqueProfile.mockImplementation(async ({ where }: any) =>
    state.profile && where.id === state.profile.id ? state.profile : null
  )
}

describe('lib/demo-role-backfill', () => {
  beforeEach(() => {
    state.profile = null
    state.jobSeeker = null
    state.employer = null
    findUniqueProfile.mockReset()
    createJobSeeker.mockReset()
    createEmployer.mockReset()
    // Default: create calls record the row in shared state
    createJobSeeker.mockImplementation(async ({ data }: any) => {
      state.jobSeeker = { userId: data.userId }
      return state.jobSeeker
    })
    createEmployer.mockImplementation(async ({ data }: any) => {
      state.employer = { userId: data.userId, companyName: data.companyName }
      return state.employer
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns isDemo=false for a non-existent profile', async () => {
    setProfile(null)
    const result = await ensureDemoRoleRows('p-does-not-exist')
    expect(result.isDemo).toBe(false)
    expect(result.isSeeker).toBe(false)
    expect(result.isEmployer).toBe(false)
    expect(createJobSeeker).not.toHaveBeenCalled()
    expect(createEmployer).not.toHaveBeenCalled()
  })

  it('returns isDemo=false for a real (non-demo) account and does NOT auto-provision', async () => {
    setProfile({
      id: 'p-real',
      name: 'Jane Real',
      role: 'employer',
      firstName: 'Jane',
      lastName: 'Real',
      employer: null,
      jobSeeker: null,
    })
    const result = await ensureDemoRoleRows('p-real')
    expect(result.isDemo).toBe(false)
    expect(result.isEmployer).toBe(false)
    expect(createJobSeeker).not.toHaveBeenCalled()
    expect(createEmployer).not.toHaveBeenCalled()
  })

  it('creates a missing JobSeeker row for a demo seeker', async () => {
    setProfile({
      id: 'p-seeker-demo',
      name: 'demo-seeker-1719938112443-abc1',
      role: 'seeker',
      firstName: 'Demo',
      lastName: 'Seeker',
      employer: null,
      jobSeeker: null,
    })
    const result = await ensureDemoRoleRows('p-seeker-demo')
    expect(result.isDemo).toBe(true)
    expect(result.isSeeker).toBe(true)
    expect(result.isEmployer).toBe(false)
    expect(result.created).toBe('seeker')
    expect(createJobSeeker).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'p-seeker-demo' }) })
    )
    // Employer should NOT be created for a seeker
    expect(createEmployer).not.toHaveBeenCalled()
  })

  it('creates a missing Employer row for a demo employer', async () => {
    setProfile({
      id: 'p-employer-demo',
      name: 'demo-employer-1719938112443-abc1',
      role: 'employer',
      firstName: 'Demo',
      lastName: 'Employer',
      employer: null,
      jobSeeker: null,
    })
    const result = await ensureDemoRoleRows('p-employer-demo')
    expect(result.isDemo).toBe(true)
    expect(result.isSeeker).toBe(false)
    expect(result.isEmployer).toBe(true)
    expect(result.created).toBe('employer')
    expect(createEmployer).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'p-employer-demo', companyName: expect.any(String) }),
      })
    )
    // JobSeeker should NOT be created for an employer
    expect(createJobSeeker).not.toHaveBeenCalled()
  })

  it('is a no-op when the demo seeker already has a JobSeeker row', async () => {
    setProfile({
      id: 'p-seeker-demo',
      name: 'demo-seeker-1719938112443-abc1',
      role: 'seeker',
      firstName: 'Demo',
      lastName: 'Seeker',
      employer: null,
      jobSeeker: { userId: 'p-seeker-demo', membershipPlan: 'gold_bimonthly' },
    })
    const result = await ensureDemoRoleRows('p-seeker-demo')
    expect(result.isDemo).toBe(true)
    expect(result.isSeeker).toBe(true)
    expect(result.created).toBeNull()
    expect(createJobSeeker).not.toHaveBeenCalled()
  })

  it('is a no-op when the demo employer already has an Employer row', async () => {
    setProfile({
      id: 'p-employer-demo',
      name: 'demo-employer-1719938112443-abc1',
      role: 'employer',
      firstName: 'Demo',
      lastName: 'Employer',
      employer: { userId: 'p-employer-demo', companyName: 'Demo Co.' },
      jobSeeker: null,
    })
    const result = await ensureDemoRoleRows('p-employer-demo')
    expect(result.isDemo).toBe(true)
    expect(result.isEmployer).toBe(true)
    expect(result.created).toBeNull()
    expect(createEmployer).not.toHaveBeenCalled()
  })

  it('does nothing for a demo admin (no role-specific row expected)', async () => {
    setProfile({
      id: 'p-admin-demo',
      name: 'demo-admin-1719938112443-abc1',
      role: 'admin',
      firstName: 'Demo',
      lastName: 'Admin',
      employer: null,
      jobSeeker: null,
    })
    const result = await ensureDemoRoleRows('p-admin-demo')
    expect(result.isDemo).toBe(true)
    expect(result.isSeeker).toBe(false)
    expect(result.isEmployer).toBe(false)
    expect(createEmployer).not.toHaveBeenCalled()
    expect(createJobSeeker).not.toHaveBeenCalled()
  })
})
