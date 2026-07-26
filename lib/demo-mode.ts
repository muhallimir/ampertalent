/**
 * Demo Mode — localStorage + role metadata
 *
 * Centralises everything the browser needs to know about the current demo
 * account:
 *  - reading / writing the demo account marker in `localStorage`
 *  - expiring the marker after 24h
 *  - role → display name, dashboard path, after-onboarding route
 *
 * This module is the browser-side companion to `app/api/demo/*`. It's safe
 * to import in client components because it never touches Clerk directly —
 * it only reads from `window.localStorage`.
 *
 * Pure-ish: every function is deterministic given the same inputs (apart from
 * `Date.now()` for TTL), so it can be unit-tested without a browser.
 */

import { DEMO_NAME_REGEX } from './demo-credentials'

export const DEMO_STORAGE_KEY = 'ampertalent_demo'
export const DEMO_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * localStorage keys used by the demo flow (besides the main `ampertalent_demo`
 * marker above). Kept in one place so the dialog / onboarding page / banner
 * stay in sync.
 */
export const DEMO_ROLE_KEY = 'ampertalent_demo_role'
export const DEMO_STRIPE_TEST_KEY = 'ampertalent_demo_stripe_test'
export const DEMO_ADMIN_TOKEN_KEY = 'ampertalent_demo_token'

export type DemoRole = 'seeker' | 'employer' | 'admin' | 'super_admin'

export interface DemoAccountInfo {
  name: string
  email: string
  password: string
  role: DemoRole
  createdAt: string
  expiresAt: string
}

export const DEMO_ROLES: readonly DemoRole[] = ['seeker', 'employer', 'admin', 'super_admin'] as const

/**
 * Type-guard. Accepts exactly the four demo roles; rejects `team_member`,
 * `user`, `''`, etc.
 */
export function isDemoRole(value: unknown): value is DemoRole {
  return typeof value === 'string' && (DEMO_ROLES as readonly string[]).includes(value)
}

const DEMO_DISPLAY_NAMES: Record<DemoRole, string> = {
  seeker: 'Job Seeker',
  employer: 'Employer',
  admin: 'Admin',
  super_admin: 'Super Admin',
}

export function getDemoDisplayName(role: DemoRole): string {
  return DEMO_DISPLAY_NAMES[role]
}

const DEMO_DASHBOARD_PATHS: Record<DemoRole, string> = {
  seeker: '/seeker/dashboard',
  employer: '/employer/dashboard',
  admin: '/admin/dashboard',
  super_admin: '/admin/dashboard',
}

export function getDemoDashboardPath(role: DemoRole): string {
  return DEMO_DASHBOARD_PATHS[role]
}

/**
 * Where the demo flow should send the visitor *after* they've signed in to the
 * freshly-created Clerk user. Seeker/employer go through the full onboarding
 * (NO skip); admin/super_admin go straight to the admin dashboard because
 * there is no admin onboarding form.
 */
export function getDemoRouteAfterOnboarding(role: DemoRole): string {
  if (role === 'seeker' || role === 'employer') return '/onboarding'
  return '/admin/dashboard'
}

const DEMO_ROLE_COLOR_CLASSES: Record<DemoRole, string> = {
  seeker: 'bg-teal-50 text-teal-700 border-teal-200',
  employer: 'bg-blue-50 text-blue-700 border-blue-200',
  admin: 'bg-violet-50 text-violet-700 border-violet-200',
  super_admin: 'bg-rose-50 text-rose-700 border-rose-200',
}

export function getDemoRoleColorClasses(role: DemoRole): string {
  return DEMO_ROLE_COLOR_CLASSES[role]
}

/* -------------------------------------------------------------------------- */
/* localStorage helpers                                                       */
/* -------------------------------------------------------------------------- */

function hasLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readDemoAccount(): DemoAccountInfo | null {
  if (!hasLocalStorage()) return null
  const raw = window.localStorage.getItem(DEMO_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as DemoAccountInfo
    if (!parsed.role || !isDemoRole(parsed.role)) return null
    if (!parsed.name || !DEMO_NAME_REGEX.test(parsed.name)) return null
    return parsed
  } catch {
    // Corrupt marker — drop it and treat as no demo
    window.localStorage.removeItem(DEMO_STORAGE_KEY)
    return null
  }
}

export function writeDemoAccount(info: DemoAccountInfo): void {
  if (!hasLocalStorage()) return
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(info))
}

export function clearDemoAccount(): void {
  if (!hasLocalStorage()) return
  window.localStorage.removeItem(DEMO_STORAGE_KEY)
}

/* -------------------------------------------------------------------------- */
/* Expiry                                                                     */
/* -------------------------------------------------------------------------- */

export function isDemoExpired(info: DemoAccountInfo): boolean {
  const expiresAt = new Date(info.expiresAt).getTime()
  if (Number.isNaN(expiresAt)) return true
  return Date.now() > expiresAt
}

/**
 * Convenience: returns true if a valid, non-expired marker is present. As a
 * side-effect, an expired marker is auto-cleared so callers don't have to
 * worry about stale state.
 */
export function isDemoActive(): boolean {
  const info = readDemoAccount()
  if (!info) return false
  if (isDemoExpired(info)) {
    clearDemoAccount()
    return false
  }
  return true
}

/* -------------------------------------------------------------------------- */
/* Demo Stripe sandbox toggle                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Set by the demo credentials dialog when the visitor ticks "Try Stripe
 * test mode" before clicking "Enter dashboard". Read by the onboarding
 * page to decide whether to bypass the checkout (default) or route the
 * user through a real Stripe test-mode checkout session so they can
 * experience the actual payment UI.
 */
export function setDemoStripeTestMode(enabled: boolean): void {
  if (!hasLocalStorage()) return
  if (enabled) {
    window.localStorage.setItem(DEMO_STRIPE_TEST_KEY, '1')
  } else {
    window.localStorage.removeItem(DEMO_STRIPE_TEST_KEY)
  }
}

export function isDemoStripeTestMode(): boolean {
  if (!hasLocalStorage()) return false
  return window.localStorage.getItem(DEMO_STRIPE_TEST_KEY) === '1'
}
