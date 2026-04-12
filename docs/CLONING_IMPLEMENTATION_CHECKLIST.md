# ✅ Cloning Implementation Checklist

> **Quick reference for executing each phase with systematic third-party replacements**

---

## 📋 PRE-CLONING SETUP

- [x] Create GitHub repository: `ampertalent` (COMPLETE — repo exists)
- [x] Initialize Next.js 16 project in clean folder (COMPLETE — scaffold created)
- [x] Set up `.env` with all credentials (COMPLETE — env vars populated with values)
- [x] Set up git repository (COMPLETE — first commit pushed)
- [ ] Create `.env.example` with all var names (if not already done)
- [ ] Verify dependencies installed: `npm install` (verify no missing packages)
- [ ] Configure ESLint + Prettier (if not already configured)
- [ ] Create git branches strategy (optional: feature/phase-X branches)

---

## 🔄 PHASE-BY-PHASE CHECKLIST

### ✅ PHASE 1: Foundation & Project Setup (60 min)

**Files:**

- [ ] Copy `app/layout.tsx` (root layout with providers)
- [ ] Copy `app/page.tsx` (landing page)
- [ ] Copy `app/globals.css` (global styles)
- [ ] Copy `app/provider.tsx` (theme provider with next-themes)
- [ ] Copy `prisma/schema.prisma` (all 42+ models)
- [ ] Copy `middleware.ts` (Clerk auth middleware)
- [ ] Copy `lib/auth.ts` (auth utilities)
- [ ] Copy `lib/utils.ts` (utility functions)
- [ ] Copy `lib/error-handler.ts`
- [ ] Copy `lib/file-validation.ts`
- [ ] Update `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`
- [ ] Move `ampertalent.png` to `public/logo/` (already in repo root)
- [ ] Create favicon from logo (multiple sizes)

**Branding Adjustments (with Ampertalent Logo Colors):**

**Color System:**
```
Primary Blue:      #0066FF (electric blue, CTAs)
Secondary Teal:    #00BB88 (success, accents)
Accent Cyan:       #00D9FF (highlights)
Dark Navy:         #1A2D47 (text, headings)
```

**Tasks:**
- [ ] Update `tailwind.config.ts` with color palette:
  - `amper-blue: #0066FF`
  - `amper-teal: #00BB88`
  - `amper-cyan: #00D9FF`
  - `amper-dark: #1A2D47`
- [ ] Add CSS variables to `app/globals.css` (primary, secondary, accent, dark)
- [ ] Copy logo file: `ampertalent.png` → `public/logo/`
- [ ] Replace all "HireMyMom" text with "Ampertalent"
- [ ] Update tagline: "Connect With Flexible Talent" → "Where Flexible Talent Meets Opportunity"
- [ ] Update domain references: hiremymom.com → ampertalent-demo.vercel.app
- [ ] Update button colors:
  - Primary buttons: use `#0066FF` (Electric Blue)
  - Secondary buttons: use `#00BB88` (Teal)
  - Success messages: use `#00BB88` (Teal)
  - Error messages: use `#FF4444` (Red)
- [ ] Verify text contrast meets WCAG AA standards
- [ ] Update navigation bar styling with logo and brand colors
- [ ] Update favicon references in `next.config.mjs`
- [ ] Test dark mode colors match logo aesthetic

**Reference:** See `docs/AMPERTALENT-BRAND-GUIDELINES.md` for complete brand guide

**Env Vars:**

- [ ] Verify CLERK keys in .env
- [ ] Verify DATABASE_URL in .env
- [ ] Verify SUPABASE keys in .env
- [ ] Verify UPSTASH_REDIS keys in .env
- [ ] Verify SENTRY_DSN in .env

**Tests:**

- [ ] Copy/adapt `__tests__/unit/config.test.ts`
- [ ] Copy/adapt `__tests__/unit/utils.test.ts`
- [ ] Run tests: `npm test`

**Verification:**

- [ ] `npm run build` passes (no TypeScript errors)
- [ ] `npm run dev` starts without errors
- [ ] Landing page loads in browser
- [ ] Theme provider works (dark/light mode toggle)

**Git:**

- [ ] `git add -A && git commit -m "Phase 1: Foundation setup (Next.js, Clerk, Supabase, Prisma)"`

---

### ✅ PHASE 2: Auth & Onboarding (45 min)

**Files:**

- [ ] Copy `app/auth/sign-in/page.tsx`
- [ ] Copy `app/auth/sign-up/page.tsx`
- [ ] Copy `app/auth/verify-email/page.tsx`
- [ ] Copy `app/onboarding/page.tsx`
- [ ] Copy `app/onboarding/role-selection/page.tsx`
- [ ] Copy `app/onboarding/profile-setup/page.tsx`
- [ ] Copy `components/auth/sign-in-form.tsx`
- [ ] Copy `components/auth/sign-up-form.tsx`
- [ ] Copy `components/auth/role-selector.tsx`
- [ ] Copy `lib/auth-utils.ts`
- [ ] Copy `lib/onboarding-service.ts`

**Clerk Theming:**

- [ ] Create `lib/clerk-theme.ts` with Ampertalent colors
- [ ] Apply theme to `<SignIn appearance={THEME} />`
- [ ] Apply theme to `<SignUp appearance={THEME} />`

**Email Templates:**

- [ ] Update Clerk email templates with Ampertalent branding
- [ ] Update sender: support@hiremymom.com → support@ampertalent-demo.vercel.app
- [ ] Update brand colors in email HTML

**Tests:**

- [ ] Copy/adapt `__tests__/unit/auth.test.ts`
- [ ] Copy/adapt `__tests__/integration/onboarding.test.ts`
- [ ] Run tests: `npm test`

**Verification:**

- [ ] Sign-up page loads
- [ ] Sign-in page loads
- [ ] Role selection works
- [ ] Profile setup form displays
- [ ] Clerk webhook configured (optional for Phase 1)

**Git:**

- [ ] `git add -A && git commit -m "Phase 2: Auth & onboarding (Clerk integration, role selection)"`

---

### ✅ PHASE 3: Seeker Portal (45 min)

**Files:**

- [ ] Copy `app/seeker/dashboard/page.tsx`
- [ ] Copy `app/seeker/jobs/page.tsx`
- [ ] Copy `app/seeker/applications/page.tsx`
- [ ] Copy `app/seeker/saved-jobs/page.tsx`
- [ ] Copy `app/seeker/resume-management/page.tsx`
- [ ] Copy `app/seeker/messages/page.tsx`
- [ ] Copy `components/seeker/*`
- [ ] Copy `lib/job-service.ts`
- [ ] Copy `lib/application-service.ts`
- [ ] Copy `lib/resume-service.ts`

**Adjustments:**

- [ ] File uploads: Leave placeholder (Phase 4 replaces with Supabase)
- [ ] Keep database queries as-is
- [ ] SSE integration: Copy as-is (no changes needed)

**Tests:**

- [ ] Copy/adapt `__tests__/integration/seeker-portal.test.ts`
- [ ] Run tests: `npm test`

**Verification:**

- [ ] Seeker dashboard loads
- [ ] Job listing displays
- [ ] Application form renders
- [ ] Saved jobs feature works
- [ ] Resume list shows (placeholder for uploads)

**Git:**

- [ ] `git add -A && git commit -m "Phase 3: Seeker portal (job search, applications, resume mgmt)"`

---

### ✅ PHASE 4: File Storage Migration (S3 → Supabase) (30 min)

**⚠️ INTEGRATION REPLACEMENT #1**

**Files to Create:**

- [ ] Create `lib/storage.ts` (new Supabase Storage service)
- [ ] Create `lib/storage-client.ts` (client-side utilities)

**Code Transformation:**

```typescript
// OLD (S3)
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// NEW (Supabase Storage)
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
	NEXT_PUBLIC_SUPABASE_URL,
	NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
```

**Files to Update:**

- [ ] Update `app/seeker/resume-management/page.tsx` (import statements)
- [ ] Update `app/employer/job-posting/page.tsx` (import statements)
- [ ] Update `components/file-uploader.tsx` (hooks and API calls)
- [ ] Update all resume/file-related components

**Supabase Setup:**

- [ ] Create buckets in Supabase dashboard:
  - [ ] `resumes`
  - [ ] `profile-pictures`
  - [ ] `company-logos`
  - [ ] `attachments`
- [ ] Configure RLS policies (public read, authenticated write)

**Env Vars:**

- [ ] Remove: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`
- [ ] Keep: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Tests:**

- [ ] Copy/adapt `__tests__/unit/storage.test.ts` (S3 → Supabase mocks)
- [ ] Update mock implementation for Supabase
- [ ] Run tests: `npm test`

**Cleanup:**

- [ ] Delete old files: `lib/s3.ts`, `lib/s3-client.ts`
- [ ] Remove S3 imports from all files

**Verification:**

- [ ] File upload works
- [ ] File download works
- [ ] Presigned URLs generated correctly
- [ ] Files appear in Supabase Storage dashboard

**Git:**

- [ ] `git add -A && git commit -m "Phase 4: File storage migration (AWS S3 → Supabase Storage)"`

---

### ✅ PHASE 5: Admin Portal (45 min)

**Files:**

- [ ] Copy `app/admin/dashboard/page.tsx`
- [ ] Copy `app/admin/user-management/page.tsx`
- [ ] Copy `app/admin/job-vetting/page.tsx`
- [ ] Copy `app/admin/analytics/page.tsx`
- [ ] Copy `app/admin/billing-management/page.tsx`
- [ ] Copy `lib/admin-service.ts`
- [ ] Copy `lib/analytics-service.ts`

**Adjustments:**

- [ ] None (no third-party changes in this phase)
- [ ] Keep database queries as-is
- [ ] Keep Sentry error reporting as-is (will update in Phase 12)

**Tests:**

- [ ] Copy/adapt `__tests__/integration/admin-portal.test.ts`
- [ ] Run tests: `npm test`

**Verification:**

- [ ] Admin dashboard loads (super_admin role only)
- [ ] User management page displays
- [ ] Job vetting interface works
- [ ] Analytics dashboard shows data
- [ ] Billing management accessible

**Git:**

- [ ] `git add -A && git commit -m "Phase 5: Admin portal (user mgmt, job vetting, analytics)"`

---

### ✅ PHASE 6: Payment System (Authorize.net + PayPal → Stripe) (60 min)

**⚠️ INTEGRATION REPLACEMENTS #2 & #3**

**Files to Create:**

- [ ] Create `lib/stripe.ts` (Stripe server-side client)
- [ ] Create `lib/stripe-client.ts` (client-side utilities)
- [ ] Create `lib/stripe-webhook.ts` (webhook handler)
- [ ] Create `app/api/webhooks/stripe/route.ts` (webhook endpoint)

**Code Transformation:**

```typescript
// OLD (Authorize.net)
import AuthorizeNet from "authorizenet"
const transaction = await AuthorizeNet.createSubscription(...)

// NEW (Stripe)
import Stripe from "stripe"
const stripe = new Stripe(STRIPE_SECRET_KEY)
const subscription = await stripe.subscriptions.create(...)
```

**Files to Update:**

- [ ] Update `components/payments/payment-form.tsx`
- [ ] Update `components/payments/subscription-selector.tsx`
- [ ] Update `app/seeker/subscriptions/page.tsx`
- [ ] Update `app/employer/packages/page.tsx`
- [ ] Update `lib/subscription-service.ts`

**Stripe Setup:**

- [ ] Create test Products in Stripe Dashboard:
  - [ ] 4 seeker subscriptions (Trial/Gold/VIP/Annual)
  - [ ] 4 employer packages (Standard/Featured/Email Blast/Gold Plus)
  - [ ] 3 concierge packages (Lite/Level I/II/III)
- [ ] Get price IDs from Stripe Dashboard
- [ ] Add price IDs to `.env.example`

**Env Vars:**

- [ ] Remove: `AUTHORIZE_NET_LOGIN_ID`, `AUTHORIZE_NET_TRANSACTION_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`
- [ ] Add: `STRIPE_SECRET_KEY` (from .env, already present)
- [ ] Add: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (from .env, already present)
- [ ] NOTE: `STRIPE_WEBHOOK_SECRET` will be captured after first deploy (Phase 13)

**Tests:**

- [ ] Copy/adapt `__tests__/unit/stripe.test.ts` (replace Authorize.net mocks)
- [ ] Update mock implementation for Stripe
- [ ] Run tests: `npm test`

**Cleanup:**

- [ ] Delete old files: `lib/authorize-net.ts`, `lib/paypal.ts`
- [ ] Delete old webhook: `app/api/webhooks/authorize-net/route.ts`, `app/api/webhooks/paypal/route.ts`
- [ ] Remove old imports from all files

**Verification:**

- [ ] Stripe Elements render on payment form
- [ ] Payment form submits successfully
- [ ] Test charge created in Stripe Dashboard
- [ ] Subscription created in Stripe Dashboard
- [ ] Demo banner shows "Test Mode — use card 4242 4242 4242 4242"

**⚠️ IMPORTANT: Webhook Secret**

- [ ] `STRIPE_WEBHOOK_SECRET` will be empty for now
- [ ] This will be captured after first Vercel deployment (Phase 13)
- [ ] Until then, webhook testing will be manual via Stripe CLI

**Git:**

- [ ] `git add -A && git commit -m "Phase 6: Payment system (Authorize.net + PayPal → Stripe)"`

---

### ✅ PHASE 7: Employer Portal (45 min)

**Files:**

- [ ] Copy `app/employer/dashboard/page.tsx`
- [ ] Copy `app/employer/job-management/page.tsx`
- [ ] Copy `app/employer/packages/page.tsx`
- [ ] Copy `app/employer/team-management/page.tsx`
- [ ] Copy `app/employer/analytics/page.tsx`
- [ ] Copy `lib/employer-service.ts`
- [ ] Copy `lib/team-service.ts`

**Adjustments:**

- [ ] None (no third-party changes)
- [ ] Payment integration already done in Phase 6
- [ ] Database queries stay the same

**Tests:**

- [ ] Copy/adapt `__tests__/integration/employer-portal.test.ts`
- [ ] Run tests: `npm test`

**Verification:**

- [ ] Employer dashboard loads
- [ ] Job posting interface works
- [ ] Package selection displays Stripe pricing
- [ ] Team management page accessible
- [ ] Analytics show employer data

**Git:**

- [ ] `git add -A && git commit -m "Phase 7: Employer portal (job mgmt, packages, team mgmt)"`

---

### ✅ PHASE 8: Messaging & Real-time Notifications (45 min)

**Files:**

- [ ] Copy `app/messages/page.tsx`
- [ ] Copy `app/messages/[threadId]/page.tsx`
- [ ] Copy `components/messaging/message-thread.tsx`
- [ ] Copy `components/messaging/message-input.tsx`
- [ ] Copy `components/messaging/real-time-notification.tsx`
- [ ] Copy `lib/messaging-service.ts`
- [ ] Copy `lib/notification-service.ts`
- [ ] Copy `lib/sse-service.ts`

**Adjustments:**

- [ ] None (SSE is native to Next.js, no third-party changes)
- [ ] Keep database queries as-is
- [ ] Real-time features use built-in SSE

**Tests:**

- [ ] Copy/adapt `__tests__/integration/messaging.test.ts`
- [ ] Run tests: `npm test`

**Verification:**

- [ ] Message thread displays
- [ ] New messages appear in real-time
- [ ] Notification badge updates
- [ ] SSE connection established in DevTools

**Git:**

- [ ] `git add -A && git commit -m "Phase 8: Messaging & real-time notifications (SSE)"`

---

### ✅ PHASE 9: Analytics, Reporting & Advanced Features (45 min)

**Files:**

- [ ] Copy `app/analytics/page.tsx`
- [ ] Copy `app/analytics/reports/page.tsx`
- [ ] Copy `app/analytics/exports/page.tsx`
- [ ] Copy `lib/reports-service.ts`
- [ ] Copy `lib/pdf-service.ts` (jsPDF — no changes)
- [ ] Copy `lib/export-service.ts`
- [ ] Copy `components/charts/*`
- [ ] Copy `components/reports/*`

**Adjustments:**

- [ ] None (jsPDF and Recharts are identical)
- [ ] Keep PDF generation as-is
- [ ] Keep charting as-is

**Tests:**

- [ ] Copy/adapt `__tests__/unit/pdf-service.test.ts`
- [ ] Copy/adapt `__tests__/integration/analytics.test.ts`
- [ ] Run tests: `npm test`

**Verification:**

- [ ] Analytics dashboard loads
- [ ] Charts render with data
- [ ] PDF export generates correctly
- [ ] Report download works

**Git:**

- [ ] `git add -A && git commit -m "Phase 9: Analytics, reporting & exports (PDF generation)"`

---

### ✅ PHASE 10: CRM, Cron Jobs & Integrations (60 min)

**⚠️ INTEGRATION REPLACEMENT #4 (Post-Deployment)**

**Files to Create:**

- [ ] Create `lib/hubspot.ts` (HubSpot CRM service)
- [ ] Create `lib/crm-service.ts` (factory wrapper)
- [ ] Create `lib/hubspot-sync-service.ts` (sync orchestration)
- [ ] Create `app/api/cron/daily-tasks/route.ts`
- [ ] Create `app/api/cron/hourly-tasks/route.ts`
- [ ] Create `app/api/cron/hubspot-sync/route.ts`
- [ ] Create `app/admin/crm-sync/page.tsx`
- [ ] Create `vercel.json` (cron config)

**Code Structure (similar to original GoHighLevel):**

```typescript
// Create HubSpot contact
const hubspot = new HubSpotClient({ accessToken: HUBSPOT_ACCESS_TOKEN });
const contact = await hubspot.crm.contacts.basicApi.create({
	properties: [
		{ name: "email", value: email },
		{ name: "firstname", value: firstName },
	],
});

// Update contact with app fields
await hubspot.crm.contacts.basicApi.update(contactId, {
	properties: [{ name: "custom_property_1", value: "value" }],
});
```

**⚠️ IMPORTANT: Phase 10 is POST-DEPLOYMENT ONLY**

- [ ] This phase is optional until after first deployment
- [ ] Skip if doing minimal Phase 1 deployment first
- [ ] Come back to Phase 10 after Phase 13 (deployment)
- [ ] Mark in documentation as "Phase 10 (post-deployment)"

**Env Vars (leave empty for now):**

- [ ] `HUBSPOT_ACCESS_TOKEN` (will be set when integrating Phase 10)
- [ ] Remove old: `GHL_API_KEY` (was in Phase 1 setup, now removed)

**Cron Configuration:**

- [ ] Update `vercel.json`:

```json
{
	"crons": [
		{ "path": "/api/cron/daily-tasks", "schedule": "0 */2 * * *" },
		{ "path": "/api/cron/hourly-tasks", "schedule": "0 * * * *" }
	]
}
```

**Tests:**

- [ ] Create `__tests__/unit/hubspot.test.ts` (mocked HubSpot API)
- [ ] Create `__tests__/integration/crm-sync.test.ts`
- [ ] Run tests: `npm test`
- [ ] **NOTE:** These tests use mocks since HUBSPOT_ACCESS_TOKEN will be empty

**Verification (after deployment with real token):**

- [ ] HubSpot connection test succeeds
- [ ] Contacts sync to HubSpot
- [ ] Cron jobs execute on schedule
- [ ] CRM sync admin interface works

**Git:**

- [ ] `git add -A && git commit -m "Phase 10: CRM integration (HubSpot as GoHighLevel alternative, post-deployment)"`

---

### ✅ PHASE 11: Testing & Deployment Preparation (45 min)

**Files:**

- [ ] Copy/create entire `__tests__/` directory
- [ ] Copy `jest.config.js`
- [ ] Copy `playwright.config.ts`
- [ ] Create `__tests__/fixtures/` (test data)
- [ ] Create `__tests__/mocks/` (service mocks)

**Test Mocks to Update:**

- [ ] Update mock for Stripe (instead of Authorize.net)
- [ ] Update mock for Supabase Storage (instead of S3)
- [ ] Update mock for Sentry (instead of Bugsnag) — will be official in Phase 12
- [ ] Update mock for HubSpot (instead of GoHighLevel)

**Test Configuration:**

- [ ] `jest.config.js`: Database = test PostgreSQL (or in-memory)
- [ ] `playwright.config.ts`: Baseurl = localhost:3000
- [ ] `__tests__/globalSetup.ts`: Seed test data
- [ ] `__tests__/globalTeardown.ts`: Cleanup after tests

**Env for Testing:**

- [ ] Create `.env.test` with test API keys
- [ ] Ensure sensitive keys are mocked, not used in tests

**Documentation:**

- [ ] Create `DEPLOYMENT_GUIDE.md` (if not already present)
- [ ] Document all env vars and their purposes
- [ ] Document cron job configuration

**Tests:**

- [ ] Run full test suite: `npm test`
- [ ] Verify coverage: `npm test -- --coverage`
- [ ] Run type check: `npm run type-check`
- [ ] Run build: `npm run build`

**Verification:**

- [ ] All tests pass (>80% coverage)
- [ ] TypeScript builds without errors
- [ ] Linting passes
- [ ] No console warnings

**Git:**

- [ ] `git add -A && git commit -m "Phase 11: Testing setup & deployment prep (Jest, Playwright)"`

---

### ✅ PHASE 12: Error Monitoring (Bugsnag → Sentry) (30 min)

**⚠️ INTEGRATION REPLACEMENT #5**

**Files to Create:**

- [ ] Create `lib/sentry.ts` (Sentry configuration)
- [ ] Create `app/sentry.server.config.ts`
- [ ] Create `app/sentry.client.config.ts`

**Code Transformation:**

```typescript
// OLD (Bugsnag)
import Bugsnag from "@bugsnag/js";
Bugsnag.notify(error, { severity: "error" });

// NEW (Sentry)
import * as Sentry from "@sentry/nextjs";
Sentry.captureException(error, { level: "error" });
```

**Files to Update:**

- [ ] Update `middleware.ts` (Sentry wrapper)
- [ ] Update `app/error.tsx` (Sentry error boundary)
- [ ] Update `app/global-error.tsx`
- [ ] Remove all Bugsnag imports

**Sentry Setup:**

- [ ] Create Sentry account at sentry.io
- [ ] Create Next.js project
- [ ] Get `SENTRY_DSN` (already in .env)
- [ ] Configure source maps (optional, for production)

**Env Vars:**

- [ ] Remove: `BUGSNAG_API_KEY`
- [ ] Keep: `SENTRY_DSN` (already in .env)

**Tests:**

- [ ] Copy/adapt `__tests__/unit/error-handler.test.ts`
- [ ] Mock Sentry client
- [ ] Run tests: `npm test`

**Cleanup:**

- [ ] Delete old files: `lib/bugsnag.ts`
- [ ] Remove all Bugsnag imports from codebase

**Verification:**

- [ ] Errors captured in Sentry dashboard
- [ ] Error breadcrumbs recorded
- [ ] User context tracked

**Git:**

- [ ] `git add -A && git commit -m "Phase 12: Error monitoring (Bugsnag → Sentry)"`

---

### ✅ PHASE 13: Deployment & First Live Release (45 min)

**Pre-Deployment Checklist:**

- [ ] Run full test suite: `npm test`
- [ ] Build check: `npm run build`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] Linting passes: `npm run lint`
- [ ] All env vars in `.env`: `npm run verify-env`

**Vercel Deployment:**

- [ ] Connect GitHub repo to Vercel
- [ ] Set environment variables in Vercel dashboard:
  - [ ] Copy all from `.env` file
  - [ ] `STRIPE_WEBHOOK_SECRET` = (leave empty, will capture below)
  - [ ] Other keys from planning folder
- [ ] Deploy to staging: `vercel --prod --prebuilt`
- [ ] Verify staging deployment
- [ ] Check Sentry dashboard for errors (should be clean)

**Stripe Webhook Setup (CRITICAL):**

1. [ ] In Stripe Dashboard, go to Webhooks
2. [ ] Create webhook endpoint: `https://ampertalent-demo.vercel.app/api/webhooks/stripe`
3. [ ] Subscribe to events:
   - [ ] `customer.subscription.updated`
   - [ ] `customer.subscription.deleted`
   - [ ] `invoice.payment_succeeded`
   - [ ] `invoice.payment_failed`
   - [ ] `charge.refunded`
4. [ ] Copy webhook signing secret: `whsec_...`
5. [ ] Add to Vercel environment: `STRIPE_WEBHOOK_SECRET = whsec_...`
6. [ ] Redeploy: `vercel --prod --prebuilt`

**First Deployment Verification:**

- [ ] App loads at ampertalent-demo.vercel.app
- [ ] Sign-up/sign-in works
- [ ] Onboarding flow completes
- [ ] Seeker dashboard loads
- [ ] Employer dashboard loads
- [ ] Admin dashboard loads (super_admin)
- [ ] Stripe webhook test: `stripe trigger payment_intent.succeeded`
  - [ ] Webhook received in `/api/webhooks/stripe`
  - [ ] Invoice created in database
  - [ ] Email sent (via Resend)
- [ ] Check Sentry for any errors (should be minimal)
- [ ] Check Vercel logs for warnings

**Data Seeding (optional):**

- [ ] Create demo users (seeker, employer, admin)
- [ ] Create sample jobs
- [ ] Create sample applications
- [ ] Add test data for analytics

**Documentation:**

- [ ] Update `README.md` with deployment instructions
- [ ] Document all environment variables
- [ ] Document how to capture webhook secret

**Git:**

- [ ] `git add -A && git commit -m "Phase 13: First live deployment (Vercel, Stripe webhooks, monitoring)"`
- [ ] Tag: `git tag -a v1.0.0-alpha -m "First live deployment"`

---

### ✅ PHASE 14: Post-Deployment Polish & Optimization (30 min)

**Performance:**

- [ ] Run Lighthouse audit: `npm run lighthouse`
- [ ] Image optimization (next/image)
- [ ] Code splitting analysis
- [ ] Bundle size reduction
- [ ] Lazy loading implementation

**SEO:**

- [ ] Update meta tags (title, description, OG tags)
- [ ] Create `sitemap.xml`
- [ ] Create `robots.txt`
- [ ] Test in Google Search Console (optional)

**Security:**

- [ ] Implement CORS headers
- [ ] Implement CSP (Content Security Policy)
- [ ] Rate limiting on sensitive endpoints
- [ ] Input validation everywhere
- [ ] XSS protection review

**Monitoring:**

- [ ] Set up Sentry error alerts
- [ ] Configure uptime monitoring (optional)
- [ ] Set up performance monitoring (optional)
- [ ] Create on-call documentation

**Documentation:**

- [ ] Create API documentation (if applicable)
- [ ] Create troubleshooting guide
- [ ] Document cron job schedules
- [ ] Document backup/restore procedures

**Final Touches:**

- [ ] Test all email templates
- [ ] Test all PDF exports
- [ ] Test all notifications
- [ ] Mobile responsiveness check
- [ ] Browser compatibility check

**Git:**

- [ ] `git add -A && git commit -m "Phase 14: Post-deployment polish & optimization"`
- [ ] Tag: `git tag -a v1.0.0 -m "Production-ready release"`

---

## 📊 EXECUTION TRACKING

| Phase | Status  | Duration | Issues | Commit Hash |
| ----- | ------- | -------- | ------ | ----------- |
| 1     | ✅ DONE | 60 min   | —      | 409200c     |
| 2     | ✅ DONE | 45 min   | —      | 24f8257     |
| 3     | ✅ DONE | 45 min   | —      | 24f8257     |
| 4     | ✅ DONE | 30 min   | —      | 24f8257     |
| 5     | 🔄 IN_PROGRESS | 45 min   | —      | —           |
| 6     | ✅ DONE | 60 min   | —      | 24f8257     |
| 7     | ✅ DONE | 45 min   | —      | 24f8257     |
| 8     | ✅ DONE | 45 min   | —      | 24f8257     |
| 9     | ✅ DONE | 45 min   | —      | 24f8257     |
| 10    | 🔄 IN_PROGRESS | 60 min   | —      | —           |
| 11    | ⏳ TODO | 45 min   | —      | —           |
| 12    | ✅ DONE | 30 min   | —      | 24f8257     |
| 13    | ⏳ TODO | 45 min   | —      | —           |
| 14    | ⏳ TODO | 30 min   | —      | —           |

**Total Estimated Time: ~11 hours**
**Completed: ~8 hours | Remaining: ~3 hours**

---

## 🚀 START PHASE 1 NOW

Ready to begin? Let's start with Phase 1!

Key files to copy from hire_my_mom_saas:

1. Prisma schema
2. Root layout + providers
3. Middleware
4. Utility functions
5. Branding assets

**Next command:** Ready when you are!
