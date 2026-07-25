/**
 * Demo Mode — localStorage + role metadata — Unit Tests
 *
 * These tests pin the contract for `lib/demo-mode.ts`:
 *  - reading / writing the demo account marker in localStorage
 *  - expiry (24h TTL)
 *  - role display names and dashboard paths
 *
 * All tests are written before the implementation (TDD red phase).
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import {
  DEMO_STORAGE_KEY,
  DEMO_TTL_MS,
  isDemoRole,
  getDemoDisplayName,
  getDemoDashboardPath,
  getDemoRouteAfterOnboarding,
  getDemoRoleColorClasses,
  readDemoAccount,
  writeDemoAccount,
  clearDemoAccount,
  isDemoExpired,
  isDemoActive,
} from '@/lib/demo-mode'
import type { DemoAccountInfo, DemoRole } from '@/lib/demo-mode'

describe('Demo Mode — localStorage & role helpers', () => {
  // Reset localStorage between tests
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear()
      jest.restoreAllMocks()
    }
  })

  describe('constants', () => {
    it('uses ampertalent_demo as storage key', () => {
      expect(DEMO_STORAGE_KEY).toBe('ampertalent_demo')
    })

    it('uses a 24h TTL', () => {
      expect(DEMO_TTL_MS).toBe(24 * 60 * 60 * 1000)
    })
  })

  describe('isDemoRole', () => {
    it('accepts the four supported roles', () => {
      expect(isDemoRole('super_admin')).toBe(true)
      expect(isDemoRole('admin')).toBe(true)
      expect(isDemoRole('employer')).toBe(true)
      expect(isDemoRole('seeker')).toBe(true)
    })

    it('rejects team_member and unknown roles', () => {
      expect(isDemoRole('team_member')).toBe(false)
      expect(isDemoRole('user')).toBe(false)
      expect(isDemoRole('guest')).toBe(false)
      expect(isDemoRole('')).toBe(false)
    })
  })

  describe('getDemoDisplayName', () => {
    it('returns human-readable names for each role', () => {
      expect(getDemoDisplayName('super_admin')).toBe('Super Admin')
      expect(getDemoDisplayName('admin')).toBe('Admin')
      expect(getDemoDisplayName('employer')).toBe('Employer')
      expect(getDemoDisplayName('seeker')).toBe('Job Seeker')
    })
  })

  describe('getDemoDashboardPath', () => {
    it('maps seeker/employer to their dashboards', () => {
      expect(getDemoDashboardPath('seeker')).toBe('/seeker/dashboard')
      expect(getDemoDashboardPath('employer')).toBe('/employer/dashboard')
    })

    it('maps admin/super_admin to the admin dashboard', () => {
      expect(getDemoDashboardPath('admin')).toBe('/admin/dashboard')
      expect(getDemoDashboardPath('super_admin')).toBe('/admin/dashboard')
    })
  })

  describe('getDemoRouteAfterOnboarding', () => {
    it('routes seeker/employer back to onboarding (no skip)', () => {
      expect(getDemoRouteAfterOnboarding('seeker')).toBe('/onboarding')
      expect(getDemoRouteAfterOnboarding('employer')).toBe('/onboarding')
    })

    it('routes admin/super_admin to their dashboard (skip onboarding)', () => {
      expect(getDemoRouteAfterOnboarding('admin')).toBe('/admin/dashboard')
      expect(getDemoRouteAfterOnboarding('super_admin')).toBe('/admin/dashboard')
    })
  })

  describe('getDemoRoleColorClasses', () => {
    it('returns tailwind classes for each role', () => {
      const seeker = getDemoRoleColorClasses('seeker')
      const employer = getDemoRoleColorClasses('employer')
      const admin = getDemoRoleColorClasses('admin')
      const superAdmin = getDemoRoleColorClasses('super_admin')
      expect(seeker).toMatch(/teal|emerald|cyan/i)
      expect(employer).toMatch(/coral|orange|amber|blue/i)
      expect(admin).toMatch(/violet|purple|indigo/i)
      expect(superAdmin).toMatch(/rose|pink|red|fuchsia/i)
    })
  })

  describe('localStorage round-trip', () => {
    const sample: DemoAccountInfo = {
      name: 'demo-seeker-1719938112443',
      email: 'demo-seeker-1719938112443@ampertalent-demo.com',
      password: '<TEST-ONLY-NOT-REAL>',
      role: 'seeker',
      createdAt: '2024-07-01T00:00:00.000Z',
      expiresAt: '2024-07-02T00:00:00.000Z',
    }

    it('readDemoAccount returns null when no marker is stored', () => {
      expect(readDemoAccount()).toBeNull()
    })

    it('writeDemoAccount persists the marker', () => {
      writeDemoAccount(sample)
      const raw = window.localStorage.getItem(DEMO_STORAGE_KEY)
      expect(raw).toBeTruthy()
      expect(JSON.parse(raw!)).toEqual(sample)
    })

    it('readDemoAccount round-trips through writeDemoAccount', () => {
      writeDemoAccount(sample)
      expect(readDemoAccount()).toEqual(sample)
    })

    it('readDemoAccount returns null for a corrupt marker (defensive)', () => {
      window.localStorage.setItem(DEMO_STORAGE_KEY, '{not-json')
      expect(readDemoAccount()).toBeNull()
    })

    it('clearDemoAccount removes the marker', () => {
      writeDemoAccount(sample)
      clearDemoAccount()
      expect(window.localStorage.getItem(DEMO_STORAGE_KEY)).toBeNull()
    })
  })

  describe('expiry', () => {
    const pastExpiry: DemoAccountInfo = {
      name: 'demo-seeker-1',
      email: 'demo-seeker-1@ampertalent-demo.com',
      password: '<TEST-ONLY-NOT-REAL>',
      role: 'seeker',
      createdAt: '2000-01-01T00:00:00.000Z',
      expiresAt: '2000-01-02T00:00:00.000Z',
    }
    const futureExpiry: DemoAccountInfo = {
      ...pastExpiry,
      createdAt: '2099-01-01T00:00:00.000Z',
      expiresAt: '2099-01-02T00:00:00.000Z',
    }

    it('isDemoExpired returns true when expiresAt is in the past', () => {
      expect(isDemoExpired(pastExpiry)).toBe(true)
    })

    it('isDemoExpired returns false when expiresAt is in the future', () => {
      expect(isDemoExpired(futureExpiry)).toBe(false)
    })

    it('isDemoActive returns true only when a valid non-expired marker exists', () => {
      writeDemoAccount(futureExpiry)
      expect(isDemoActive()).toBe(true)
    })

    it('isDemoActive returns false when the marker is missing', () => {
      expect(isDemoActive()).toBe(false)
    })

    it('isDemoActive returns false when the marker is expired', () => {
      writeDemoAccount(pastExpiry)
      expect(isDemoActive()).toBe(false)
    })

    it('isDemoActive auto-clears an expired marker from localStorage', () => {
      writeDemoAccount(pastExpiry)
      isDemoActive()
      expect(window.localStorage.getItem(DEMO_STORAGE_KEY)).toBeNull()
    })
  })
})
