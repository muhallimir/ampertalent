# AmperTalent — Agent Instructions

> Operating manual for AI coding assistants (Claude, Copilot, etc.) and
> human developers working in this repo.

## Stack
- **Next.js 16** (App Router) + **Turbopack**. Default port **3000**.
- **Clerk** for auth (test instance: `stable-roughy-64.clerk.accounts.dev`).
- **Supabase Postgres** via **Prisma 5**. Two env vars: `DATABASE_URL` (pooler, port 6543) for runtime, `DIRECT_URL` (port 5432) for migrations.
- **Stripe** + **PayPal** (sandbox mode) for payments.
- **Resend** for transactional email.
- **Tailwind CSS** + shadcn/ui components.

## Developer commands

```bash
npm run dev              # Next.js dev on port 3000 with Turbopack
npm run build            # prisma migrate deploy + next build
npm run lint             # next lint
npm test                 # jest (250 unit + 78 demo tests pass)
```

## Environment variables

Pull from the live deployment with `vercel env pull .env.local` (already linked
to `amirsalis-projects/ampertalent`).

**Never commit real keys.** `.env.local` is gitignored. Use placeholders like
`<TEST-ONLY-NOT-REAL>` in test fixtures.

## Secret scanning

The repo is wired with **gitleaks** (`.gitleaks.toml`) so secrets are caught
BEFORE they reach the remote.

| Layer | Where | What it does |
| --- | --- | --- |
| Local pre-commit | `.git/hooks/pre-commit` → `scripts/pre-commit` | Runs `gitleaks protect --staged` if gitleaks is installed; otherwise a built-in fallback scan. Blocks the commit on detection. |
| CI | `.github/workflows/gitleaks.yml` | Runs on every push + PR. Fails the check if a secret is found, so it never reaches `main`. |

### Install gitleaks (recommended)

```bash
brew install gitleaks            # macOS
# or: https://github.com/gitleaks/gitleaks#installation
```

If gitleaks isn't installed, the pre-commit hook still works — it falls
back to a built-in scan that catches API keys (`sk_`, `pk_`, `AKIA`, `ghp_`,
`re_`), JWTs, and hardcoded passwords.

### What's allowed (so we don't false-positive on demo-mode values)

The `ampertalent-demo.com` email domain, `demo-{role}-{ts}` account
names, and the `<TEST-ONLY-NOT-REAL>` placeholder are all allowlisted in
`.gitleaks.toml`. These are generated at runtime, not real secrets.

### Rotation checklist (after a leak)

If a real key is committed and pushed, the following need to happen
ASAP — git history rewrites don't remove the secret from GitHub's
cache or from anyone who already pulled.

1. **Rotate the key** in the issuing dashboard (Clerk / Stripe / etc.).
2. **Update `.env.local`** with the new value (`vercel env pull`).
3. **Amend the commit** (or revert + re-commit on a clean branch).
4. **Force-push** with `git push --force-with-lease`.
5. **Confirm** with the team that the old key is no longer used.

## Architecture essentials

- **API routes** live in `app/api/<path>/route.ts` (App Router). Each
  handler that touches user data calls `getCurrentUser(req)` or `auth()`
  from `@clerk/nextjs/server`.
- **Middleware** (`middleware.ts`, soon to be `proxy.ts`) gates
  `/admin/*`, `/seeker/*`, `/employer/*`, `/onboarding`. Demo accounts
  follow a special path — see `lib/demo-mode.ts`.
- **DB access** goes through `lib/db.ts` — a Prisma singleton cached on
  `globalThis.__prisma` (survives HMR).
- **Demo mode** (`lib/demo-credentials.ts`, `lib/demo-mode.ts`,
  `lib/demo-seeding.ts`, `app/api/demo/*`, `components/demo/*`) lets a
  visitor spawn a fully-provisioned account in one click. See
  `.plans/demo-mode.md` for the design (gitignored).

## Roles & RBAC

Five roles: **seeker**, **employer**, **admin**, **team_member**, **super_admin**.
JWT carries the role on the Clerk user. The `UserProfile.role` column in
the DB is the source of truth for app-level gating. See
`docs/07-PHASE-5-ADMIN-PORTAL.md` for the full matrix.

## Testing notes

- All test data uses the prefix `demo-{role}-{ts}-` for users and jobs.
  This makes cleanup a single `db.userProfile.deleteMany({ where: { name:
  { startsWith: 'demo-' } } })`.
- Demo data can be wiped in one shot via `POST /api/demo/cleanup-test`
  (dev only, returns 403 in production).
- Test files are allowed to use `<TEST-ONLY-NOT-REAL>` as a password
  placeholder (gitleaks allowlisted).

## Gotchas

- **Port 3000** (not 3005). Hardcoded in `package.json` scripts.
- **`middleware` file convention is deprecated** — Next.js 16 wants
  `proxy.ts`. We're still on `middleware.ts` until the migration
  lands; the file emits a deprecation warning in the dev log.
- **`DEBUG_MODE=true`** adds a flood of logs. Only enable for debugging.
- **Demo email verification** — demo accounts use Clerk's
  `emailAddresses.updateEmailAddress(id, { verified: true })` after
  `createUser` so they can sign in without email confirmation. If
  that fails, the visitor gets bounced to the manual sign-in path.
- **Sign-in tokens** — the demo flow uses Clerk's one-time
  `signInTokens.createSignInToken` to bypass the normal
  email-verification step. Consumed client-side via
  `signIn.create({ strategy: 'ticket' })`.
- **Public Clerk publishable keys** (the `pk_test_` / `pk_live_` half)
  are safe to commit. The secret half (`sk_test_` / `sk_live_`) must
  never leave `.env.local`.
- **npm install** reshuffles `package-lock.json` hashes. The pre-commit
  hook + gitleaks allowlist keep this from triggering false positives.

## Demo-mode quick reference

| Role | Onboarding | Payment | Sample data |
| --- | --- | --- | --- |
| `super_admin` / `admin` | Skipped (no admin onboarding form) | n/a | none |
| `seeker` | Full flow (basic info → details → goals → package) | Demo subscription activated via `/api/demo/activate-subscription` (skips Stripe/PayPal) | 3 sample applications to demo jobs |
| `employer` | Full flow (basic info → details → complete) | Posts jobs normally; pays on `/employer/billing` per the normal flow | 3 sample job posts |

The `ampertalent_demo` localStorage marker tells the app to bypass
Stripe/PayPal and seed the data. It auto-expires after 24 hours and is
cleared on form submit.
