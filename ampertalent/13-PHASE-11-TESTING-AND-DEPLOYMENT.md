# 🚀 Phase 11 — Testing & Deployment

> Comprehensive testing, CI/CD, error monitoring setup, and production deployment.

---

## 11.1 Testing Infrastructure

### Tasks

- [ ] Configure Jest with `jest.config.js`
  - ts-jest for TypeScript
  - Module path aliases (@/ mapping)
  - Test environment setup/teardown
  - Coverage thresholds
- [ ] Create `__tests__/globalTeardown.ts` — cleanup after all tests
- [ ] Set up test utilities:
  - Database test helpers (create test user, cleanup)
  - Mock factories (user, job, application, subscription)
  - API test helpers (authenticated requests)

### Test Configuration

```javascript
// jest.config.js
module.exports = {
	preset: "ts-jest",
	testEnvironment: "node",
	moduleNameMapper: {
		"^@/(.*)$": "<rootDir>/$1",
	},
	setupFilesAfterSetup: ["<rootDir>/__tests__/setup.ts"],
	globalTeardown: "<rootDir>/__tests__/globalTeardown.ts",
	coverageThreshold: {
		global: {
			branches: 70,
			functions: 75,
			lines: 80,
			statements: 80,
		},
	},
};
```

---

## 11.2 Unit Tests Summary

| Module                  | Test File                                           | Tests     |
| ----------------------- | --------------------------------------------------- | --------- |
| Config                  | `__tests__/unit/config.test.ts`                     | 3         |
| Database                | `__tests__/unit/db.test.ts`                         | 2         |
| Utils                   | `__tests__/unit/utils.test.ts`                      | 8         |
| File Validation         | `__tests__/unit/file-validation.test.ts`            | 5         |
| Storage                 | `__tests__/unit/storage.test.ts`                    | 6         |
| Stripe Integration      | `__tests__/unit/stripe.test.ts`                     | 10        |
| Stripe Webhook          | `__tests__/unit/stripe-webhook.test.ts`             | 5         |
| HubSpot CRM             | `__tests__/unit/hubspot.test.ts`                    | 5         |
| Stripe Prices           | `__tests__/unit/stripe-prices.test.ts`              | 2         |
| Profile Completion      | `__tests__/unit/profile-completion.test.ts`         | 3         |
| Subscription Plans      | `__tests__/unit/subscription-plans.test.ts`         | 3         |
| Employer Packages       | `__tests__/unit/employer-packages.test.ts`          | 2         |
| Additional Services     | `__tests__/unit/additional-services.test.ts`        | 2         |
| Advanced Search         | `__tests__/unit/advanced-search.test.ts`            | 10        |
| Resume Upload           | `__tests__/unit/resume-upload.test.ts`              | 5         |
| Resume Credits          | `__tests__/unit/resume-credits.test.ts`             | 3         |
| Resume Critique         | `__tests__/unit/resume-critique.test.ts`            | 4         |
| Concierge Service       | `__tests__/unit/concierge-service.test.ts`          | 2         |
| Notification Service    | `__tests__/unit/notification-service.test.ts`       | 5         |
| Notification Handlers   | `__tests__/unit/notification-handlers.test.ts`      | 6         |
| Customer Payment Emails | `__tests__/unit/customer-payment-emails.test.ts`    | 32        |
| Email Templates         | `__tests__/unit/email-templates.test.ts`            | 5         |
| Invoice PDF             | `__tests__/unit/invoice-pdf.test.ts`                | 5         |
| Analytics               | `__tests__/unit/analytics.test.ts`                  | 7         |
| Reporting               | `__tests__/unit/reporting.test.ts`                  | 6         |
| Recurring Billing       | `__tests__/unit/recurring-billing.test.ts`          | 9         |
| Employer Recurring      | `__tests__/unit/employer-recurring-billing.test.ts` | 5         |
| Webhook Service         | `__tests__/unit/external-webhook-service.test.ts`   | 6         |
| Admin Impersonation     | `__tests__/unit/admin-impersonation.test.ts`        | 5         |
| Middleware              | `__tests__/unit/middleware.test.ts`                 | 11        |
| User Invitations        | `__tests__/unit/user-invitations.test.ts`           | 4         |
| Team Invitations        | `__tests__/unit/team-invitations.test.ts`           | 4         |
| Auth                    | `__tests__/unit/auth.test.ts`                       | 4         |
| **TOTAL**               |                                                     | **~200+** |

---

## 11.3 Integration Tests Summary

| Module                | Test File                                                    | Tests     |
| --------------------- | ------------------------------------------------------------ | --------- |
| Database Connection   | `__tests__/integration/database.test.ts`                     | 3         |
| Onboarding            | `__tests__/integration/onboarding.test.ts`                   | 4         |
| Clerk Webhooks        | `__tests__/integration/webhooks/clerk-webhook.test.ts`       | 5         |
| User Invitation Flow  | `__tests__/integration/user-invitation-flow.test.ts`         | 3         |
| Team Flow             | `__tests__/integration/team-flow.test.ts`                    | 3         |
| Seeker Applications   | `__tests__/integration/seeker/applications.test.ts`          | 5         |
| Seeker Saved Jobs     | `__tests__/integration/seeker/saved-jobs.test.ts`            | 4         |
| Seeker Resume         | `__tests__/integration/seeker/resume.test.ts`                | 4         |
| Seeker Subscription   | `__tests__/integration/seeker/subscription.test.ts`          | 4         |
| Seeker Profile        | `__tests__/integration/seeker/profile.test.ts`               | 4         |
| Seeker Cover Letters  | `__tests__/integration/seeker/cover-letters.test.ts`         | 4         |
| Seeker Billing        | `__tests__/integration/seeker/billing.test.ts`               | 3         |
| Seeker Services       | `__tests__/integration/seeker/services.test.ts`              | 2         |
| Employer Jobs         | `__tests__/integration/employer/jobs.test.ts`                | 8         |
| Employer Applications | `__tests__/integration/employer/applications.test.ts`        | 6         |
| Employer Talent       | `__tests__/integration/employer/talent.test.ts`              | 5         |
| Employer Packages     | `__tests__/integration/employer/packages.test.ts`            | 7         |
| Employer Featured     | `__tests__/integration/employer/featured-jobs.test.ts`       | 3         |
| Employer Team         | `__tests__/integration/employer/team.test.ts`                | 4         |
| Employer Profile      | `__tests__/integration/employer/profile.test.ts`             | 3         |
| Employer Concierge    | `__tests__/integration/employer/concierge.test.ts`           | 3         |
| Admin Job Vetting     | `__tests__/integration/admin/job-vetting.test.ts`            | 6         |
| Admin User Mgmt       | `__tests__/integration/admin/user-management.test.ts`        | 9         |
| Admin Subscriptions   | `__tests__/integration/admin/subscriptions.test.ts`          | 4         |
| Admin Billing         | `__tests__/integration/admin/billing.test.ts`                | 3         |
| Admin Concierge       | `__tests__/integration/admin/concierge-management.test.ts`   | 5         |
| Admin Services        | `__tests__/integration/admin/services.test.ts`               | 5         |
| Admin Exclusive       | `__tests__/integration/admin/exclusive-offers.test.ts`       | 4         |
| Admin CRM Sync        | `__tests__/integration/admin/crm-sync.test.ts`               | 7         |
| Admin Logs            | `__tests__/integration/admin/logs.test.ts`                   | 3         |
| Admin Action Logs     | `__tests__/integration/admin/action-logs.test.ts`            | 6         |
| Admin Sales           | `__tests__/integration/admin/sales.test.ts`                  | 4         |
| Payments Seeker       | `__tests__/integration/payments/seeker-subscription.test.ts` | 10        |
| Payments Employer     | `__tests__/integration/payments/employer-package.test.ts`    | 9         |
| Payments Methods      | `__tests__/integration/payments/payment-methods.test.ts`     | 5         |
| Payments Services     | `__tests__/integration/payments/services.test.ts`            | 4         |
| Messaging             | `__tests__/integration/messaging/messages.test.ts`           | 8         |
| Templates             | `__tests__/integration/messaging/templates.test.ts`          | 4         |
| Drafts                | `__tests__/integration/messaging/drafts.test.ts`             | 3         |
| Notifications         | `__tests__/integration/notifications/realtime.test.ts`       | 4         |
| Concierge             | `__tests__/integration/concierge/employer-concierge.test.ts` | 7         |
| Seeker Chat           | `__tests__/integration/concierge/seeker-chat.test.ts`        | 5         |
| Service Fulfillment   | `__tests__/integration/services/fulfillment.test.ts`         | 6         |
| Resume Critique       | `__tests__/integration/services/resume-critique.test.ts`     | 5         |
| Featured Jobs         | `__tests__/integration/services/featured-jobs.test.ts`       | 4         |
| Email Blasts          | `__tests__/integration/services/email-blasts.test.ts`        | 4         |
| CRM Sync              | `__tests__/integration/crm/sync.test.ts`                     | 5         |
| Cron Daily            | `__tests__/integration/cron/daily-tasks.test.ts`             | 7         |
| Cron Hourly           | `__tests__/integration/cron/hourly-tasks.test.ts`            | 2         |
| Stripe Webhooks       | `__tests__/integration/webhooks/stripe-webhook.test.ts`      | 5         |
| Pending Signups       | `__tests__/integration/pending/signups.test.ts`              | 4         |
| API Health            | `__tests__/integration/api/health.test.ts`                   | 3         |
| **TOTAL**             |                                                              | **~250+** |

---

## 11.4 UI Tests Summary

| Module             | Test File                                                | Tests    |
| ------------------ | -------------------------------------------------------- | -------- |
| Layout             | `__tests__/ui/layout.test.tsx`                           | 2        |
| Hero               | `__tests__/ui/hero.test.tsx`                             | 2        |
| Seeker Dashboard   | `__tests__/ui/seeker/dashboard.test.tsx`                 | 4        |
| Job Search         | `__tests__/ui/seeker/job-search.test.tsx`                | 4        |
| Application Form   | `__tests__/ui/seeker/application-form.test.tsx`          | 3        |
| Employer Dashboard | `__tests__/ui/employer/dashboard.test.tsx`               | 4        |
| Job Form           | `__tests__/ui/employer/job-form.test.tsx`                | 4        |
| Interview Pipeline | `__tests__/ui/employer/interview-pipeline.test.tsx`      | 2        |
| Talent Grid        | `__tests__/ui/employer/talent.test.tsx`                  | 2        |
| Admin Dashboard    | `__tests__/ui/admin/dashboard.test.tsx`                  | 4        |
| Analytics          | `__tests__/ui/admin/analytics.test.tsx`                  | 4        |
| Messaging Inbox    | `__tests__/ui/messaging/inbox.test.tsx`                  | 3        |
| Messaging Thread   | `__tests__/ui/messaging/thread.test.tsx`                 | 3        |
| Notifications      | `__tests__/ui/notifications/notification-panel.test.tsx` | 4        |
| **TOTAL**          |                                                          | **~45+** |

**Grand Total: ~500+ tests**

---

## 11.5 Sentry Error Monitoring Setup

### Tasks

- [ ] Install `@sentry/nextjs`
- [ ] Run `npx @sentry/wizard@latest -i nextjs`
- [ ] Configure `sentry.client.config.ts` + `sentry.server.config.ts`
- [ ] Create `components/sentry-error-boundary.tsx` — React error boundary
- [ ] Replace Bugsnag references with Sentry
- [ ] Set up source maps upload in build

### Files to Modify

```
layout.tsx — BugsnagErrorBoundary → SentryErrorBoundary
lib/bugsnag.ts → lib/sentry.ts
components/bugsnag-error-boundary.tsx → components/sentry-error-boundary.tsx
```

---

## 11.6 Deployment Configuration

### Tasks

- [ ] Create `vercel.json` — cron jobs + function config + headers
- [ ] Configure Vercel environment variables (all service keys)
- [ ] Set up Vercel preview deployments
- [ ] Configure custom domain (optional)
- [ ] Set up Vercel Analytics (built-in, free)

### vercel.json

```json
{
	"crons": [
		{ "path": "/api/cron/daily-tasks", "schedule": "0 */2 * * *" },
		{ "path": "/api/cron/hourly-tasks", "schedule": "0 * * * *" }
	],
	"functions": {
		"app/api/cron/daily-tasks/route.ts": { "maxDuration": 10 },
		"app/api/cron/hourly-tasks/route.ts": { "maxDuration": 10 }
	}
}
```

### Environment Variables for Vercel

```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Supabase
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# HubSpot CRM
HUBSPOT_ACCESS_TOKEN=pat-...

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=team@Ampertalent-demo.vercel.app

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Sentry
SENTRY_DSN=https://...
NEXT_PUBLIC_SENTRY_DSN=https://...

# App
NEXT_PUBLIC_APP_URL=https://Ampertalent-demo.vercel.app
ENABLE_CUSTOMER_PAYMENT_EMAILS=true
CRON_SECRET=...
```

---

## 11.7 Seed Data

### Tasks

- [ ] Create `prisma/seed.ts` — comprehensive seed script
  - 3 admin users (1 super_admin, 2 admin)
  - 10 seeker users (various plans, skills, resume states)
  - 5 employer users (with packages, jobs)
  - 20 jobs (across categories, statuses)
  - 30 applications (various statuses, interview stages)
  - 5 concierge requests
  - 10 message threads
  - 50 notifications
  - 3 team members
  - Sample resumes and cover letter templates
  - Stripe test payment records
  - Additional services with purchases
  - HubSpot CRM sync settings

### TDD Tests

```
__tests__/integration/seed.test.ts
- should seed database without errors
- should create correct number of records per model
- should maintain referential integrity
```

---

## 11.8 Documentation

### Tasks

- [ ] Create `README.md` — comprehensive project documentation
  - Project overview
  - Architecture diagram
  - Tech stack
  - Setup instructions (5 minutes to run locally)
  - Environment variables guide
  - Available scripts
  - Feature walkthrough
  - Demo credentials
  - Deployment guide
- [ ] Create `DEPLOYMENT_GUIDE.md` — step-by-step deployment
- [ ] Add inline code comments for complex logic

---

## 11.9 Final Quality Checks

### Tasks

- [ ] Run full test suite (`npm test`)
- [ ] Check test coverage (`npm run test:coverage`)
- [ ] Run lint (`npm run lint`)
- [ ] Run TypeScript compiler check (`npx tsc --noEmit`)
- [ ] Build check (`npm run build`)
- [ ] Lighthouse performance audit
- [ ] Manual walkthrough of all user flows:
  - [ ] Seeker: sign-up → onboard → subscribe → search → apply → messages → profile
  - [ ] Employer: sign-up → onboard → post job → manage applications → team → talent search
  - [ ] Admin: sign-in → vet jobs → manage users → analytics → CRM → impersonate
  - [ ] Super Admin: CRM sync settings
  - [ ] Team Member: accept invite → access employer dashboard

---

## Deliverables Checklist

- [ ] Jest configured with 500+ tests passing
- [ ] Unit tests for all services and utilities
- [ ] Integration tests for all API routes
- [ ] UI tests for key components
- [ ] Sentry error monitoring configured
- [ ] Vercel deployment working
- [ ] Cron jobs running (2 jobs)
- [ ] Seed data script
- [ ] README with setup instructions
- [ ] All user flows verified end-to-end
- [ ] Clean build with zero errors
