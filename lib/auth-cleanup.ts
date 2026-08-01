/**
 * Client-side auth cleanup — single source of truth for "wipe everything our
 * app wrote to the browser".
 *
 * Called by:
 *   - `handleUserLogout` (lib/auth-utils.ts) — normal sign-out, clears EVERYTHING
 *   - `stopImpersonation` (lib/admin-impersonation.ts) — clears ONLY impersonation
 *     so the admin stays signed in but the impersonation banner / overlay is gone
 *
 * Why this matters:
 *   - Demo-mode localStorage markers (`ampertalent_demo*`) would bleed into the
 *     next sign-in if not cleared, breaking the demo banner logic.
 *   - Impersonation sessionStorage (`admin_impersonation_session*`) would
 *     resurface the banner / role override for the next admin who signs in on
 *     the same browser — a serious cross-session contamination bug.
 *   - PayPal / onboarding / exclusive-plan markers would cause the wrong
 *     checkout flow to start on the next sign-in.
 *
 * Implemented as a hard prefix allowlist so we don't accidentally nuke
 * third-party keys (the Clerk session cookies are managed by `signOut`,
 * which we call AFTER this helper).
 */

/** All localStorage keys owned by this app. */
export const APP_LOCALSTORAGE_KEYS: readonly string[] = [
  // Demo mode (lib/demo-mode.ts)
  'ampertalent_demo',
  'ampertalent_demo_role',
  'ampertalent_demo_stripe_test',
  'ampertalent_demo_token',
  // Onboarding (lib/auth-utils.ts, app/onboarding/page.tsx)
  'onboardingCompleted',
  'userRole',
  'onboardingData',
  'hmm_post_onboarding_service',
  // PayPal pending state (components/payments/PayPalButton.tsx)
  'paypal_pendingSignupId',
  // Misc dashboard cache
  'dashboardLastLoad',
]

/** All sessionStorage keys owned by this app. */
export const APP_SESSIONSTORAGE_KEYS: readonly string[] = [
  // PayPal pending state (components/payments/PayPalButton.tsx)
  'paypal_pendingSignupId',
  'paypal_pending_plan',
  'paypal_token',
  'paypal_addOnIds',
  'paypal_customAmount',
  'paypal_sessionToken',
  // Exclusive plan (components/employer/ExclusivePlanModal.tsx)
  'exclusive_plan_pending_activation',
]

/** Prefixes that imply impersonation-only state. */
export const APP_SESSIONSTORAGE_PREFIXES: readonly string[] = [
  'admin_impersonation_session',
]

/** All client-side cookies owned by this app (set via document.cookie). */
export const APP_COOKIES: readonly string[] = [
  // Marketing preselect (lib/marketing-preselect.ts)
  'hmm_preselect',
]

/**
 * Wipe every app-owned localStorage key. Browsers iterate in insertion order
 * so we walk backwards while removing to keep the index valid.
 */
export function clearAppLocalStorage(): void {
  if (typeof window === 'undefined') return
  for (let i = window.localStorage.length - 1; i >= 0; i--) {
    const key = window.localStorage.key(i)
    if (key && APP_LOCALSTORAGE_KEYS.includes(key)) {
      window.localStorage.removeItem(key)
    }
  }
}

/**
 * Wipe every app-owned sessionStorage key. Same backwards-walk as localStorage.
 */
export function clearAppSessionStorage(): void {
  if (typeof window === 'undefined') return
  for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
    const key = window.sessionStorage.key(i)
    if (!key) continue
    if (APP_SESSIONSTORAGE_KEYS.includes(key)) {
      window.sessionStorage.removeItem(key)
      continue
    }
    if (APP_SESSIONSTORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      window.sessionStorage.removeItem(key)
    }
  }
}

/**
 * Expire every app-owned cookie by setting max-age to 0 across all common path
 * scopes. Cookie deletion requires the same path/domain that set the cookie, so
 * we target path=/ and the bare domain. The Clerk session cookies are handled
 * by Clerk's `signOut()` call — do not touch them here.
 */
export function clearAppCookies(): void {
  if (typeof window === 'undefined') return
  const hostParts = window.location.hostname.split('.')
  const bareDomain = hostParts.length > 1 ? `.${hostParts.slice(-2).join('.')}` : window.location.hostname
  for (const name of APP_COOKIES) {
    const encName = encodeURIComponent(name)
    // path=/
    document.cookie = `${encName}=; path=/; max-age=0; SameSite=Lax`
    // path=/ with Secure (some cookies are set with Secure on https)
    if (window.location.protocol === 'https:') {
      document.cookie = `${encName}=; path=/; max-age=0; SameSite=Lax; Secure`
    }
    // root domain
    document.cookie = `${encName}=; path=/; domain=${bareDomain}; max-age=0; SameSite=Lax`
  }
}

/**
 * Wipe every byte of app-owned client state. Call BEFORE Clerk's signOut —
 * signOut will then clear Clerk's own cookies and reload.
 */
export function clearAllClientState(): void {
  clearAppLocalStorage()
  clearAppSessionStorage()
  clearAppCookies()
}

/**
 * Wipe only impersonation sessionStorage. Used when the admin stops an
 * impersonation session but is staying signed in.
 */
export function clearImpersonationState(): void {
  if (typeof window === 'undefined') return
  for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
    const key = window.sessionStorage.key(i)
    if (key && APP_SESSIONSTORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      window.sessionStorage.removeItem(key)
    }
  }
}
