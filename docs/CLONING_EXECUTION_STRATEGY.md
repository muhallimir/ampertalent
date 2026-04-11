# 🚀 Cloning Execution Strategy — Ampertalent

> **Complete playbook for cloning HireMyMom → Ampertalent with strategic batching, phase-by-phase commits, and systematic third-party integration replacements.**

---

## 📋 EXECUTIVE SUMMARY

**Approach:** Phase-by-phase cloning with **strategic batching** and **git commits after each major phase**

**Duration:** 14 phases + continuous integration testing  
**Deployment:** After Phase 1 (minimum viable revenue-generating platform) → Subsequent phases add features  
**Third-party Integrations:** 8 systematic replacements with env var mapping  
**Commit Strategy:** One commit per phase (clean git history, rollback capability)

---

## 🔄 CLONING METHOD: PHASE-BY-PHASE WITH COMMITS

### Why This Approach?

1. ✅ **Incremental Testing** — Each phase is testable independently
2. ✅ **Version Control** — Clear git history showing progression
3. ✅ **Risk Mitigation** — Can rollback individual phases if needed
4. ✅ **Deployment Readiness** — Deploy after Phase 1, add features continuously
5. ✅ **Portfolio Appeal** — Git history shows systematic, professional implementation
6. ✅ **Prevents Merge Conflicts** — Smaller, focused commits reduce conflicts

### Alternative Approaches (NOT chosen)

❌ **Single mega-commit approach**

- Pro: Faster one-time execution
- Con: Massive git diff, hard to review, impossible to rollback individual features, less portfolio appeal
- **Why not:** Production code should show disciplined, incremental development

❌ **File-by-file approach**

- Pro: Maximum granularity
- Con: 200+ commits feels chaotic, harder to correlate related changes
- **Why not:** Too granular for coherent feature delivery

✅ **Phase-by-phase approach (CHOSEN)**

- Pro: Balanced, logical grouping, git history tells project story, each phase is independently deployable
- Con: Slightly longer execution time, but manageable (~30-45 min per phase)

---

## 🎯 THIRD-PARTY INTEGRATION REPLACEMENTS (8 Total)

### Mapping Strategy

| #   | Component            | Original                                   | Ampertalent             | Replacement Type | Env Vars         | Code Changes       |
| --- | -------------------- | ------------------------------------------ | ----------------------- | ---------------- | ---------------- | ------------------ |
| 1   | **Auth**             | Clerk v6                                   | Clerk v6                | ✅ IDENTICAL     | No change        | No change          |
| 2   | **Database**         | Supabase                                   | Supabase                | ✅ IDENTICAL     | No change        | No change          |
| 3   | **Payment**          | Authorize.net + PayPal                     | Stripe (test mode)      | ⚠️ REPLACE       | 6 vars           | 8 files            |
| 4   | **File Storage**     | AWS S3                                     | Supabase Storage        | ⚠️ REPLACE       | 1 var            | 1 file             |
| 5   | **Email**            | Resend                                     | Resend                  | ✅ IDENTICAL     | No change        | No change          |
| 6   | **Error Monitoring** | Bugsnag                                    | Sentry                  | ⚠️ REPLACE       | 1 var            | 1 file             |
| 7   | **Cache**            | Upstash Redis                              | Upstash Redis           | ✅ IDENTICAL     | No change        | No change          |
| 8   | **CRM**              | GoHighLevel (Phase 1) → HubSpot (Phase 10) | HubSpot (Phase 10 only) | ⚠️ REPLACE       | 1 var (Phase 10) | 3 files (Phase 10) |

**Legend:**

- ✅ **IDENTICAL** = Copy code as-is, no changes needed (4 services)
- ⚠️ **REPLACE** = Copy structure, swap API keys/libraries (4 services)

---

## 🏗️ DETAILED EXECUTION PLAN

### PHASE 1: Foundation & Project Setup

**Objective:** Create deployable, revenue-ready base

**Files to Clone:**

```
hire_my_mom_saas/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── provider.tsx
├── components/
│   ├── logo.tsx
│   ├── footer.tsx
│   ├── hero.tsx
│   ├── features.tsx
│   └── pricing.tsx
├── lib/
│   ├── auth.ts
│   ├── utils.ts
│   ├── error-handler.ts
│   └── file-validation.ts
├── prisma/
│   └── schema.prisma (all 42+ models)
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── middleware.ts
└── .env.example
```

**Integration Changes:**

- ✅ Clerk: Copy as-is
- ✅ Supabase: Copy as-is
- ✅ Resend: Copy as-is
- ✅ Upstash Redis: Copy as-is
- ✅ Sentry: Copy as-is (no changes yet, Phase 1 focus is theme)

**What to Adjust:**

```typescript
// env.ts — Map env vars
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY → from .env ✓
CLERK_SECRET_KEY → from .env ✓
DATABASE_URL → from .env ✓
NEXT_PUBLIC_SUPABASE_URL → from .env ✓
UPSTASH_REDIS_REST_URL → from .env ✓
// S3 vars removed, Supabase Storage used instead
```

**Theme Changes:**

- Logo: Replace HireMyMom logo with Ampertalent logo (branding folder)
- Brand name: Search/replace "HireMyMom" → "Ampertalent" (UI, emails)
- Tagline: Replace "Connect With Flexible Talent" → "Where Flexible Talent Meets Opportunity"
- Domain: Replace hiremymom.com → ampertalent-demo.vercel.app (in emails, links)
- Color palette: Keep modern theme, distinct from original (Tailwind CSS vars)

**TDD Tests to Clone:**

```
__tests__/unit/
├── config.test.ts (env vars)
├── utils.test.ts (utilities)
└── auth.test.ts (Clerk integration)
```

**Git Commit:**

```bash
git commit -m "Phase 1: Foundation setup (Next.js, Clerk, Supabase, theme, Prisma schema)"
```

---

### PHASE 2: Authentication & User Onboarding

**Files to Clone:**

```
app/auth/
├── sign-in/page.tsx
├── sign-up/page.tsx
├── verify-email/page.tsx
└── layout.tsx

app/onboarding/
├── page.tsx
├── role-selection/page.tsx
├── profile-setup/page.tsx
└── [step]/page.tsx

components/auth/
├── sign-in-form.tsx
├── sign-up-form.tsx
├── role-selector.tsx
└── profile-setup-form.tsx

lib/
├── auth-utils.ts
├── profile-service.ts
└── onboarding-service.ts
```

**Integration Changes:**

- ✅ Clerk middleware: Copy as-is
- ✅ Clerk webhooks: Copy as-is
- Database operations: No changes (same schema)

**What to Adjust:**

```typescript
// Styling: Clerk components to match Ampertalent branding
<SignIn appearance={AMPERTALENT_THEME} />
<SignUp appearance={AMPERTALENT_THEME} />

// Emails: Replace HireMyMom template vars
BRAND_NAME = "Ampertalent"
BRAND_TAGLINE = "Where Flexible Talent Meets Opportunity"
SUPPORT_EMAIL = "support@ampertalent-demo.vercel.app"
```

**Git Commit:**

```bash
git commit -m "Phase 2: Auth & onboarding (Clerk integration, role selection, profile setup)"
```

---

### PHASE 3: Seeker Portal

**Files to Clone:**

```
app/seeker/
├── dashboard/page.tsx
├── jobs/page.tsx
├── applications/page.tsx
├── saved-jobs/page.tsx
├── resume-management/page.tsx
├── subscriptions/page.tsx
└── messages/page.tsx

components/seeker/
├── job-card.tsx
├── application-form.tsx
├── resume-uploader.tsx
├── saved-jobs-list.tsx
└── subscription-selector.tsx

lib/
├── job-service.ts
├── application-service.ts
├── resume-service.ts
└── subscription-service.ts
```

**Integration Changes:**

- ✅ Database queries: No changes
- ✅ Real-time SSE: Copy as-is
- File storage: Change S3 → Supabase Storage (Phase 4)

**What to Adjust:**

```typescript
// File uploads: Temporary placeholder (Phase 4 replaces S3 with Supabase)
// Will update in Phase 4
const uploadResume = async (file: File) => {
	// Placeholder: await supabaseStorageService.upload(file)
};
```

**Git Commit:**

```bash
git commit -m "Phase 3: Seeker portal (job search, applications, resume mgmt)"
```

---

### PHASE 4: File Storage Migration (S3 → Supabase Storage)

**Files to Replace:**

```
lib/
├── s3.ts → storage.ts
└── storage-service.ts (new)
```

**Integration Changes:**

- ⚠️ Replace AWS S3 with Supabase Storage

**Code Transformation:**

```typescript
// OLD (S3)
import { S3Client } from "@aws-sdk/client-s3"
const s3 = new S3Client({ region: "us-east-1" })
const url = await s3.generatePresignedUrl(...)

// NEW (Supabase Storage)
import { createClient } from "@supabase/supabase-js"
const supabase = createClient(URL, KEY)
const { data, error } = await supabase.storage.from('resumes').upload(...)
```

**Files Affected:**

- `lib/storage.ts` (new implementation)
- `app/seeker/resume-management/page.tsx` (update imports)
- `app/employer/job-posting/page.tsx` (update imports)
- `components/file-uploader.tsx` (update hooks)

**Git Commit:**

```bash
git commit -m "Phase 4: File storage migration (AWS S3 → Supabase Storage)"
```

---

### PHASE 5: Admin Portal

**Files to Clone:**

```
app/admin/
├── dashboard/page.tsx
├── user-management/page.tsx
├── job-vetting/page.tsx
├── analytics/page.tsx
└── billing-management/page.tsx

lib/
├── admin-service.ts
└── analytics-service.ts
```

**Integration Changes:**

- ✅ Admin operations: No changes

**Git Commit:**

```bash
git commit -m "Phase 5: Admin portal (user mgmt, job vetting, analytics)"
```

---

### PHASE 6: Payment System (Authorize.net + PayPal → Stripe)

**Files to Replace:**

```
lib/
├── authorize-net.ts → stripe.ts
├── paypal.ts → removed (consolidated to Stripe)
└── payment-service.ts (updated)

app/api/webhooks/
├── authorize-net/route.ts → removed
├── paypal/route.ts → removed
└── stripe/route.ts (new)
```

**Integration Changes:**

- ⚠️ Replace Authorize.net (CIM + ARB) with Stripe
- ⚠️ Replace PayPal Billing Agreements with Stripe Subscriptions

**Code Transformation:**

```typescript
// OLD (Authorize.net)
import AuthorizeNet from "authorizenet";
const transaction = await AuthorizeNet.createSubscription({
	customerProfileId,
	amount,
	trialDays: 7,
});

// NEW (Stripe)
import Stripe from "stripe";
const stripe = new Stripe(STRIPE_SECRET_KEY);
const subscription = await stripe.subscriptions.create({
	customer: stripeCustomerId,
	items: [{ price: stripePriceId }],
	trial_period_days: 7,
});
```

**Env Vars (6 changes):**

```bash
# REMOVE:
AUTHORIZE_NET_LOGIN_ID
AUTHORIZE_NET_TRANSACTION_KEY
PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET

# ADD:
STRIPE_SECRET_KEY (already in .env)
STRIPE_WEBHOOK_SECRET (to be set after first deploy)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (already in .env)
```

**Files Affected:**

- `lib/stripe.ts` (new)
- `app/api/webhooks/stripe/route.ts` (new)
- `components/payments/payment-form.tsx`
- `components/payments/subscription-selector.tsx`
- `app/seeker/subscriptions/page.tsx`
- `app/employer/packages/page.tsx`
- Database: No schema changes (payment methods still work)

**Git Commit:**

```bash
git commit -m "Phase 6: Payment system (Authorize.net + PayPal → Stripe)"
```

---

### PHASE 7: Employer Portal

**Files to Clone:**

```
app/employer/
├── dashboard/page.tsx
├── job-management/page.tsx
├── packages/page.tsx
├── team-management/page.tsx
└── analytics/page.tsx

lib/
├── employer-service.ts
└── team-service.ts
```

**Integration Changes:**

- ✅ No third-party changes

**Git Commit:**

```bash
git commit -m "Phase 7: Employer portal (job mgmt, packages, team mgmt)"
```

---

### PHASE 8: Messaging & Real-time Notifications

**Files to Clone:**

```
app/messages/
├── page.tsx
├── [threadId]/page.tsx
└── layout.tsx

components/messaging/
├── message-thread.tsx
├── message-input.tsx
└── real-time-notification.tsx

lib/
├── messaging-service.ts
├── notification-service.ts
└── sse-service.ts (copy as-is)
```

**Integration Changes:**

- ✅ SSE: Copy as-is (no third-party dependency)

**Git Commit:**

```bash
git commit -m "Phase 8: Messaging & real-time notifications (SSE)"
```

---

### PHASE 9: Analytics, Reporting & Advanced Features

**Files to Clone:**

```
app/analytics/
├── page.tsx
├── reports/page.tsx
└── exports/page.tsx

lib/
├── reports-service.ts
├── pdf-service.ts (jsPDF — copy as-is)
└── export-service.ts

components/
├── charts/
├── reports/
└── analytics-dashboard.tsx
```

**Integration Changes:**

- ✅ jsPDF: Copy as-is
- ✅ Recharts: Copy as-is
- Database: No changes

**Git Commit:**

```bash
git commit -m "Phase 9: Analytics, reporting & exports (PDF generation)"
```

---

### PHASE 10: CRM, Cron Jobs & Integrations (HubSpot — POST-DEPLOYMENT)

**Files to Clone:**

```
lib/
├── hubspot.ts (new, replaces gohighlevel.ts)
├── crm-service.ts (updated)
└── hubspot-sync-service.ts (new)

app/api/cron/
├── daily-tasks/route.ts
├── hourly-tasks/route.ts
└── hubspot-sync/route.ts

app/admin/crm-sync/
├── page.tsx
└── [section]/page.tsx
```

**Integration Changes:**

- ⚠️ Replace GoHighLevel with HubSpot (Phase 10 only, post-deployment)

**Code Transformation:**

```typescript
// OLD (GoHighLevel)
import GhlClient from "gohighlevel";
const ghl = new GhlClient({ apiKey: GHL_API_KEY });
await ghl.contacts.create({ email, name });

// NEW (HubSpot)
import { Client } from "@hubspot/api-client";
const hubspot = new Client({ accessToken: HUBSPOT_ACCESS_TOKEN });
await hubspot.crm.contacts.basicApi.create({ properties });
```

**Env Vars (1 change):**

```bash
# REMOVE (no longer needed):
# GHL_API_KEY (was in Phase 1, now removed)

# ADD (Phase 10 only):
HUBSPOT_ACCESS_TOKEN (to be set when integrating Phase 10)
```

**Files Affected:**

- `lib/hubspot.ts` (new)
- `lib/crm-service.ts` (updated)
- `app/admin/crm-sync/page.tsx`
- `app/api/cron/hubspot-sync/route.ts`

**Git Commit:**

```bash
git commit -m "Phase 10: CRM integration (HubSpot as GoHighLevel alternative, post-deployment)"
```

---

### PHASE 11: Testing & Deployment Preparation

**Files to Clone:**

```
__tests__/
├── unit/
├── integration/
├── e2e/
└── ui/

jest.config.js
playwright.config.ts
DEPLOYMENT_GUIDE.md
```

**Integration Changes:**

- ✅ Test framework: Copy as-is (no third-party changes)
- Update test mocks for Stripe (instead of Authorize.net)
- Update test mocks for Supabase Storage (instead of S3)
- Update test mocks for Sentry (instead of Bugsnag)
- Update test mocks for HubSpot (instead of GoHighLevel)

**Git Commit:**

```bash
git commit -m "Phase 11: Testing setup & deployment prep (Jest, Playwright, test fixtures)"
```

---

### PHASE 12: Error Monitoring (Bugsnag → Sentry)

**Files to Replace:**

```
lib/
├── bugsnag.ts → sentry.ts
└── error-reporter.ts (updated)

app/
└── sentry.server.config.ts (new)
```

**Integration Changes:**

- ⚠️ Replace Bugsnag with Sentry

**Code Transformation:**

```typescript
// OLD (Bugsnag)
import Bugsnag from "@bugsnag/js";
Bugsnag.notify(error, { severity: "error" });

// NEW (Sentry)
import * as Sentry from "@sentry/nextjs";
Sentry.captureException(error, { level: "error" });
```

**Env Vars (1 change):**

```bash
# REMOVE:
BUGSNAG_API_KEY

# ADD (already in .env):
SENTRY_DSN
```

**Files Affected:**

- `lib/sentry.ts` (new)
- `app/sentry.server.config.ts` (new)
- `middleware.ts` (Sentry wrapper)
- `app/error.tsx` (Sentry error boundary)

**Git Commit:**

```bash
git commit -m "Phase 12: Error monitoring (Bugsnag → Sentry)"
```

---

### PHASE 13: Deployment & First Live Release

**Tasks:**

```
1. [ ] Deploy to Vercel staging
2. [ ] Run full test suite
3. [ ] Configure Stripe webhooks (capture STRIPE_WEBHOOK_SECRET)
4. [ ] Load test data (seed script)
5. [ ] Deploy to Vercel production
6. [ ] Verify all services connected
7. [ ] Monitor Sentry for errors (first 24h)
8. [ ] Document deployment steps
```

**Git Commit:**

```bash
git commit -m "Phase 13: First live deployment (Vercel, Stripe webhooks, monitoring)"
```

---

### PHASE 14: Post-Deployment Polish & Optimization

**Tasks:**

```
1. [ ] Performance optimization (image optimization, lazy loading)
2. [ ] SEO setup (meta tags, sitemap, robots.txt)
3. [ ] Security audit (CORS, CSP, rate limiting)
4. [ ] Analytics integration (if desired)
5. [ ] Documentation (README, API docs)
6. [ ] Concierge feature expansion
7. [ ] Email template polishing
8. [ ] Mobile responsiveness audit
```

**Git Commit:**

```bash
git commit -m "Phase 14: Post-deployment polish & optimization"
```

---

## ⚡ EXECUTION TIMELINE

### Single-Session Approach (Recommended)

```
Session Duration: 6-8 hours continuous

08:00 - 09:00 = Phase 1 (Foundation) + commit
09:00 - 09:45 = Phase 2 (Auth) + commit
09:45 - 10:30 = Phase 3 (Seeker Portal) + commit
10:30 - 11:00 = Phase 4 (File Storage S3→Supabase) + commit
           BREAK (15 min)
11:15 - 12:00 = Phase 5 (Admin Portal) + commit
12:00 - 13:00 = Phase 6 (Payment System Auth.net+PayPal→Stripe) + commit
           LUNCH (30 min)
13:30 - 14:15 = Phase 7 (Employer Portal) + commit
14:15 - 15:00 = Phase 8 (Messaging & Real-time) + commit
15:00 - 15:45 = Phase 9 (Analytics & Reporting) + commit
           BREAK (15 min)
16:00 - 17:00 = Phase 10 (HubSpot CRM, Cron) + commit
17:00 - 17:45 = Phase 11 (Testing & Deployment Prep) + commit
17:45 - 18:15 = Phase 12 (Error Monitoring Bugsnag→Sentry) + commit
18:15 - 19:00 = Phase 13 (Deploy to Vercel) + commit
19:00 - 19:30 = Phase 14 (Polish) + commit

Total: ~11 hours with breaks
```

### Batched Approach (Alternative)

**Day 1:** Phases 1-3 (Foundation, Auth, Seeker Portal)
**Day 2:** Phases 4-7 (Storage, Admin, Payment System, Employer)
**Day 3:** Phases 8-10 (Messaging, Analytics, CRM)
**Day 4:** Phases 11-14 (Testing, Error Monitoring, Deploy, Polish)

---

## 🔧 SYSTEMATIC THIRD-PARTY REPLACEMENT PROCESS

### Step-by-Step for Each Replacement

**Example: Payment System (Authorize.net + PayPal → Stripe)**

```bash
# 1. Identify all files using the old service
grep -r "authorize-net" lib/ app/ --include="*.ts" --include="*.tsx"
grep -r "paypal" lib/ app/ --include="*.ts" --include="*.tsx"

# 2. Create new service file (Stripe)
cp lib/authorize-net.ts lib/stripe.ts
# Edit lib/stripe.ts:
#   - Replace imports (AuthorizeNet → Stripe)
#   - Replace API calls (CIM/ARB → Stripe Subscriptions)
#   - Update error handling
#   - Update type definitions

# 3. Update dependent files
# For each file importing old service:
#   - Replace import path
#   - Replace function calls
#   - Test updated logic

# 4. Update environment variables
# In .env, .env.example, deployment config:
#   - Remove old API keys
#   - Add new API keys

# 5. Update tests
# For each test file mocking old service:
#   - Replace mock implementation
#   - Update test cases
#   - Run tests: npm test

# 6. Clean up
# Remove old files:
rm lib/authorize-net.ts lib/paypal.ts
rm app/api/webhooks/authorize-net/route.ts
rm app/api/webhooks/paypal/route.ts

# 7. Commit
git add -A
git commit -m "Phase 6: Payment system (Authorize.net + PayPal → Stripe)"
```

---

## 🎯 TESTING STRATEGY BETWEEN PHASES

### After Each Phase Commit:

```bash
# 1. Run unit tests
npm test -- __tests__/unit/[phase-related-tests]

# 2. Run integration tests
npm test -- __tests__/integration/[phase-related-tests]

# 3. Check for console errors
npm run build  # Catches TypeScript/linting issues

# 4. Verify env vars
npm run verify-env

# 5. Quick smoke test
npm run dev  # Start dev server, verify app loads
```

### Before Deployment (Phase 13):

```bash
# 1. Full test suite
npm test -- --coverage

# 2. Build check
npm run build

# 3. Lighthouse audit
npm run lighthouse

# 4. Load testing (optional)
npm run load-test

# 5. End-to-end tests
npm run test:e2e
```

---

## 📊 GIT COMMIT HISTORY (Expected Output)

```
git log --oneline

14 Phase 14: Post-deployment polish & optimization
13 Phase 13: First live deployment (Vercel, Stripe webhooks, monitoring)
12 Phase 12: Error monitoring (Bugsnag → Sentry)
11 Phase 11: Testing setup & deployment prep (Jest, Playwright)
10 Phase 10: CRM integration (HubSpot as GoHighLevel alternative, post-deployment)
9  Phase 9: Analytics, reporting & exports (PDF generation)
8  Phase 8: Messaging & real-time notifications (SSE)
7  Phase 7: Employer portal (job mgmt, packages, team mgmt)
6  Phase 6: Payment system (Authorize.net + PayPal → Stripe)
5  Phase 5: Admin portal (user mgmt, job vetting, analytics)
4  Phase 4: File storage migration (AWS S3 → Supabase Storage)
3  Phase 3: Seeker portal (job search, applications, resume mgmt)
2  Phase 2: Auth & onboarding (Clerk integration, role selection)
1  Phase 1: Foundation setup (Next.js, Clerk, Supabase, Prisma)
0  initial commit
```

---

## ✅ ADVANTAGES OF THIS APPROACH

| Aspect            | Benefit                                                   |
| ----------------- | --------------------------------------------------------- |
| **Testing**       | Test each phase independently before moving to next       |
| **Rollback**      | Can revert individual phases without affecting others     |
| **Git History**   | Professional, readable commit history for portfolio       |
| **Collaboration** | Easy to review and comment on individual phases (if team) |
| **Documentation** | Each commit message serves as development journal         |
| **Deployment**    | Can deploy after Phase 1, add features incrementally      |
| **Debugging**     | Easier to identify which phase introduced a bug           |
| **Refactoring**   | Can optimize within a phase without affecting others      |

---

## ⚠️ POTENTIAL CHALLENGES & SOLUTIONS

| Challenge                         | Solution                                                              |
| --------------------------------- | --------------------------------------------------------------------- |
| Database migration issues         | Keep Prisma schema stable across phases, use soft deletes for safety  |
| Env var conflicts                 | Maintain .env.example, validate all required vars before each phase   |
| Third-party API rate limits       | Use test mode/sandbox, implement exponential backoff in retry logic   |
| Breaking changes between phases   | Write integration tests before implementing dependent phase           |
| Stripe webhook signature mismatch | Capture webhook secret after first deploy, update env before Phase 13 |
| HubSpot Phase 10 dependency       | Mark Phase 10 as optional post-deployment, Phase 1-9 work standalone  |

---

## 🚀 START CLONING: NEXT STEPS

1. **Review this strategy** — Make sure approach aligns with your vision
2. **Set up Ampertalent repo** — Create new Next.js project in `/portfolio-clone-plans/ampertalent` folder
3. **Begin Phase 1** — Copy foundation files, set up theme, configure env vars
4. **Commit Phase 1** — `git commit -m "Phase 1: Foundation..."`
5. **Test Phase 1** — Run test suite, start dev server
6. **Proceed to Phase 2** — Continue batching and committing
7. **Monitor progress** — Track time per phase, adjust if needed

---

## 📝 SUMMARY TABLE

| Phase     | Duration      | Key Files | Third-party Changes          | Commit Message            |
| --------- | ------------- | --------- | ---------------------------- | ------------------------- |
| 1         | 60 min        | 15        | 0 (setup only)               | Foundation setup          |
| 2         | 45 min        | 8         | 0 (Clerk as-is)              | Auth & onboarding         |
| 3         | 45 min        | 10        | 0 (DB same)                  | Seeker portal             |
| 4         | 30 min        | 3         | 1 (S3→Supabase)              | File storage migration    |
| 5         | 45 min        | 6         | 0 (same)                     | Admin portal              |
| 6         | 60 min        | 8         | 2 (Auth.net+PayPal→Stripe)   | Payment system            |
| 7         | 45 min        | 6         | 0 (same)                     | Employer portal           |
| 8         | 45 min        | 8         | 0 (SSE same)                 | Messaging & real-time     |
| 9         | 45 min        | 8         | 0 (jsPDF same)               | Analytics & reporting     |
| 10        | 60 min        | 6         | 1 (GHL→HubSpot, post-deploy) | CRM & cron                |
| 11        | 45 min        | 8         | 1 (test mocks)               | Testing & deployment prep |
| 12        | 30 min        | 3         | 1 (Bugsnag→Sentry)           | Error monitoring          |
| 13        | 45 min        | 5         | 0 (deploy only)              | First live deployment     |
| 14        | 30 min        | 4         | 0 (polish only)              | Post-deployment polish    |
| **TOTAL** | **~11 hours** | **120+**  | **8 replacements**           | **Clean history**         |

---

## 🎯 SUCCESS CRITERIA

✅ All phases completed and committed  
✅ Zero breaking changes between phases  
✅ All third-party integrations replaced successfully  
✅ Full test suite passing (>80% coverage)  
✅ Deployed to Vercel and live  
✅ Git history shows systematic progression  
✅ Portfolio-ready code quality  
✅ All env vars managed via .env (credentials safe)

---

**Ready to start Phase 1? Let's clone! 🚀**
