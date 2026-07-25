/**
 * Demo Credentials — Unit Tests
 *
 * These tests pin the canonical naming convention used for every demo
 * account the AmperTalent demo mode creates (and every test that calls
 * the demo API). The naming convention `demo-{role}-{timestamp}` is the
 * single source of truth for "is this a demo account?" — both for
 * dashboard filtering and for test cleanup.
 *
 * TDD red phase: written BEFORE the implementation in lib/demo-credentials.ts
 * so that the implementation is forced to match the public contract the
 * rest of the app depends on.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'

// Mock import — these modules are implemented AFTER the tests in TDD.
// The tests must fail at the import level until the implementation exists.
import {
  generateDemoName,
  generateDemoEmail,
  generateDemoPassword,
  isValidDemoName,
  DEMO_EMAIL_DOMAIN,
} from '@/lib/demo-credentials'

describe('Demo Credentials — Naming & Generation', () => {
  // Freeze the clock so timestamp-based outputs are deterministic in tests
  const FROZEN_TS = 1719938112443
  let realDateNow: () => number

  beforeEach(() => {
    realDateNow = Date.now
    Date.now = jest.fn(() => FROZEN_TS)
  })

  afterEach(() => {
    Date.now = realDateNow
  })

  describe('generateDemoName', () => {
    it('starts with `demo-seeker-` followed by the timestamp and a random suffix', () => {
      const name = generateDemoName('seeker', FROZEN_TS)
      expect(name).toMatch(/^demo-seeker-1719938112443(-[a-z0-9]{4})?$/)
    })

    it('starts with `demo-employer-` followed by the timestamp and a random suffix', () => {
      const name = generateDemoName('employer', FROZEN_TS)
      expect(name).toMatch(/^demo-employer-1719938112443(-[a-z0-9]{4})?$/)
    })

    it('starts with `demo-admin-` followed by the timestamp and a random suffix', () => {
      const name = generateDemoName('admin', FROZEN_TS)
      expect(name).toMatch(/^demo-admin-1719938112443(-[a-z0-9]{4})?$/)
    })

    it('starts with `demo-super_admin-` followed by the timestamp and a random suffix', () => {
      const name = generateDemoName('super_admin', FROZEN_TS)
      expect(name).toMatch(/^demo-super_admin-1719938112443(-[a-z0-9]{4})?$/)
    })

    it('uses Date.now() when no timestamp is provided', () => {
      const name = generateDemoName('seeker')
      expect(name).toMatch(/^demo-seeker-1719938112443(-[a-z0-9]{4})?$/)
    })

    it('produces different names across calls (random suffix)', () => {
      const a = generateDemoName('seeker', FROZEN_TS)
      const b = generateDemoName('seeker', FROZEN_TS)
      expect(a).not.toBe(b)
    })
  })

  describe('generateDemoEmail', () => {
    it('returns a ampertalent-demo.com address for seeker', () => {
      const email = generateDemoEmail('seeker', FROZEN_TS)
      expect(email).toMatch(/^demo-seeker-\d+(-[a-z0-9]{4})?@ampertalent-demo\.com$/)
      // Sanity: domain is correct
      expect(email.endsWith(`@${DEMO_EMAIL_DOMAIN}`)).toBe(true)
    })

    it('returns a ampertalent-demo.com address for employer', () => {
      const email = generateDemoEmail('employer', FROZEN_TS)
      expect(email).toMatch(/^demo-employer-\d+(-[a-z0-9]{4})?@ampertalent-demo\.com$/)
    })

    it('returns a ampertalent-demo.com address for admin', () => {
      const email = generateDemoEmail('admin', FROZEN_TS)
      expect(email).toMatch(/^demo-admin-\d+(-[a-z0-9]{4})?@ampertalent-demo\.com$/)
    })

    it('returns a ampertalent-demo.com address for super_admin', () => {
      const email = generateDemoEmail('super_admin', FROZEN_TS)
      expect(email).toMatch(/^demo-super_admin-\d+(-[a-z0-9]{4})?@ampertalent-demo\.com$/)
    })
  })

  describe('generateDemoPassword', () => {
    it('returns a string of at least 10 characters', () => {
      const password = generateDemoPassword()
      expect(password.length).toBeGreaterThanOrEqual(10)
    })

    it('contains at least one digit', () => {
      const password = generateDemoPassword()
      expect(password).toMatch(/\d/)
    })

    it('contains at least one symbol', () => {
      const password = generateDemoPassword()
      expect(password).toMatch(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/)
    })

    it('produces different passwords across calls (entropy)', () => {
      const a = generateDemoPassword()
      const b = generateDemoPassword()
      expect(a).not.toBe(b)
    })

    it('accepts an explicit length', () => {
      const password = generateDemoPassword(20)
      expect(password.length).toBe(20)
    })
  })

  describe('isValidDemoName', () => {
    it('returns true for `demo-seeker-123`', () => {
      expect(isValidDemoName('demo-seeker-123')).toBe(true)
    })

    it('returns true for `demo-seeker-123-abcd` (with random suffix)', () => {
      expect(isValidDemoName('demo-seeker-123-abcd')).toBe(true)
    })

    it('returns true for `demo-super_admin-1719938112443`', () => {
      expect(isValidDemoName('demo-super_admin-1719938112443')).toBe(true)
    })

    it('returns false for `John Doe`', () => {
      expect(isValidDemoName('John Doe')).toBe(false)
    })

    it('returns false for `demo-seeker` (no timestamp)', () => {
      expect(isValidDemoName('demo-seeker')).toBe(false)
    })

    it('returns false for `demo-evil-123` (invalid role)', () => {
      expect(isValidDemoName('demo-evil-123')).toBe(false)
    })
  })
})
