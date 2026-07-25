/**
 * Demo Credentials — Naming & Generation
 *
 * Single source of truth for the canonical `demo-{role}-{timestamp}` naming
 * convention used by every demo account AmperTalent creates (and every test
 * that asserts on those accounts). The dashboard can filter demo accounts by
 * `name startsWith 'demo-'` and tests can assert on the same prefix.
 *
 * Pure module — no DB, no Clerk, no Next.js. Tested in
 * `__tests__/unit/demo-credentials.test.ts`.
 */

export const DEMO_EMAIL_DOMAIN = 'ampertalent-demo.com'

export type DemoRoleForCreds = 'seeker' | 'employer' | 'admin' | 'super_admin'

/**
 * The regex every demo name must match.
 *
 * Format: `demo-{role}-{unix-ms}[-{rand}]` where role is one of the four
 * supported roles. The optional trailing 4-char suffix prevents collisions
 * when two demo accounts are created in the same millisecond.
 */
export const DEMO_NAME_REGEX = /^demo-(seeker|employer|admin|super_admin)-\d+(-[a-z0-9]{4})?$/

/**
 * Build a canonical demo account name like `demo-seeker-1719938112443`.
 *
 * To avoid collisions between two calls inside the same millisecond (which
 * happens when visitors hit "Try as Seeker" twice in a row), we append a
 * short random suffix.
 */
export function generateDemoName(role: DemoRoleForCreds, timestamp: number = Date.now()): string {
  const suffix = Math.random().toString(36).slice(2, 6)
  return `demo-${role}-${timestamp}-${suffix}`
}

/**
 * Build a canonical demo email like `demo-seeker-1719938112443@ampertalent-demo.com`.
 *
 * The local part is the same as the canonical name so a quick
 * `db.userProfile.findFirst({ where: { email: { contains: 'demo-' } } })`
 * finds every demo account.
 */
export function generateDemoEmail(role: DemoRoleForCreds, timestamp: number = Date.now()): string {
  return `${generateDemoName(role, timestamp)}@${DEMO_EMAIL_DOMAIN}`
}

const DEMO_PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
const DEMO_PASSWORD_SYMBOLS = '!@#$%^&*'

/**
 * Build a demo password. Length is at least 10 by default. Always contains at
 * least one digit and one symbol, so the password is "strong enough" for any
 * registration form validation that might apply.
 */
export function generateDemoPassword(length: number = 14): string {
  const ensureMin = Math.max(10, length)
  const chars: string[] = []
  // Always include a digit
  chars.push('7')
  // Always include a symbol
  chars.push('@')
  // Fill the rest
  for (let i = chars.length; i < ensureMin; i++) {
    const useSymbol = i % 5 === 0
    const alphabet = useSymbol ? DEMO_PASSWORD_SYMBOLS : DEMO_PASSWORD_ALPHABET
    chars.push(alphabet[Math.floor(Math.random() * alphabet.length)])
  }
  // Shuffle (Fisher–Yates) so the digit/symbol aren't always at the front
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

/**
 * Strict check: returns `true` only for canonical `demo-{role}-{ts}` names.
 * Used by the dashboard filter and the test cleanup helper.
 */
export function isValidDemoName(name: string): boolean {
  return DEMO_NAME_REGEX.test(name)
}
