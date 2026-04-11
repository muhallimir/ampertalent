# 🏗️ Phase 1 — Foundation & Project Setup

> Set up the project scaffolding, configure all free-tier services, and establish the development environment.

---

## 1.1 Project Initialization

### Tasks

- [x] Create Next.js 16 project with TypeScript & App Router
- [x] Configure Tailwind CSS 3.4 + shadcn/ui + Radix UI primitives
- [x] Set up ESLint + Prettier
- [x] Initialize Git repository
- [x] Create `.env.example` with all required environment variables

### TDD Tests

```
__tests__/unit/config.test.ts
- should load environment variables correctly
- should throw on missing required env vars
```

---

## 1.2 External Service Setup (All Free Tier, No Credit Card)

### Clerk (Auth)

- [x] Sign up at clerk.com (free, no CC)
- [x] Create application → get `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`
- [x] Configure sign-in/sign-up URLs
- [ ] Set up webhook endpoint for user events

### Supabase (DB + Storage)

- [x] Sign up at supabase.com (free, no CC)
- [x] Create project → get `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [x] Create storage buckets: `resumes`, `profile-pictures`, `company-logos`, `attachments`

Note DB Creds:
projectname: Ampertalent
pw: Sg0oVm4xjex0Dkgt

### Resend (Email)

- [x] Sign up at resend.com (free, no CC)
- [x] Get `RESEND_API_KEY`
- [ ] Verify sending domain (or use onboarding@resend.dev for testing)

### Upstash Redis (Cache)

- [x] Sign up at upstash.com (free, no CC)
- [x] Create Redis database → get `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`

### Sentry (Error Monitoring)

- [x] Sign up at sentry.io (free, no CC)
- [x] Create Next.js project → get `SENTRY_DSN`
- [ ] Install `@sentry/nextjs`

### Stripe (Payments — Test Mode)

- [x] Sign up at stripe.com (free, no CC)
- [x] Get test keys: `STRIPE_SECRET_KEY` (`sk_test_...`) + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_...`)
- [ ] Get webhook signing secret: `STRIPE_WEBHOOK_SECRET` (`whsec_...`)
- [ ] Create Products + Prices in Stripe Dashboard (test mode)

Note: STRIPE webhook to be captured and put to env once initial setup is done and stripe cli is installed

### Vercel (Hosting)

- [x] Sign up at vercel.com (free, no CC)
- [ ] Connect GitHub repository
- [ ] Configure environment variables

---

## 1.3 Prisma & Database Setup

### Tasks

- [x] Copy and adapt `prisma/schema.prisma` (all 42+ models, 20+ enums)
- [x] Run `prisma generate` + `prisma db push`
- [ ] Create seed script with demo data
- [x] Set up `lib/db.ts` — Prisma client singleton

### TDD Tests

```
__tests__/unit/db.test.ts
- should export a Prisma client instance
- should be a singleton in development

__tests__/integration/database.test.ts
- should connect to database
- should create a user profile
- should enforce unique constraints
```

---

## 1.4 File Storage Adapter (Supabase Storage)

### Tasks

- [ ] Create `lib/storage.ts` — Supabase Storage service (replaces S3)
- [ ] Implement same interface as original `lib/s3.ts`:
  - `generatePresignedUploadUrl()`
  - `generatePresignedDownloadUrl()`
  - `uploadFile()`
  - `deleteFile()`
  - `getFileMetadata()`
  - `listFiles()`
  - `copyFile()`
- [ ] Configure storage buckets with RLS policies

### TDD Tests

```
__tests__/unit/storage.test.ts
- should generate presigned upload URL
- should generate presigned download URL
- should upload file buffer
- should delete file by key
- should return file metadata
- should list files with prefix
```

---

## 1.5 Stripe Payment Integration (Test Mode)

### Tasks

- [ ] Sign up at stripe.com (free, no CC)
- [ ] Get `STRIPE_SECRET_KEY` (test key: `sk_test_...`) + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_...`)
- [ ] Install `stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`
- [ ] Create `lib/stripe.ts` — Stripe server-side client (singleton)
  - `createCustomer(email, name)` → Stripe Customer ID
  - `createSetupIntent(customerId)` → for saving payment methods
  - `createPaymentIntent(customerId, amount, metadata)` → one-time charge
  - `createSubscription(customerId, priceId, trialDays?)` → recurring billing
  - `cancelSubscription(subscriptionId)`
  - `getSubscription(subscriptionId)`
  - `createRefund(paymentIntentId, amount?)`
  - `listPaymentMethods(customerId)` → saved cards
  - `detachPaymentMethod(paymentMethodId)` → remove card
  - `createInvoice(customerId, items)` → invoice generation
- [ ] Create `lib/stripe-client.ts` — client-side Stripe utilities
  - `getStripe()` → loadStripe singleton
  - Stripe Elements wrapper
- [ ] Create `lib/stripe-webhook.ts` — webhook signature verification + event handling
- [ ] Create Stripe Products/Prices in test mode:
  - 4 seeker subscription prices (Trial/Gold/VIP/Annual)
  - Employer package prices (Standard/Featured/Email Blast/Gold Plus)
  - Concierge package prices (Lite/Level I/II/III/Rush)
- [ ] Create `components/payments/StripeElementsWrapper.tsx` — Stripe Elements provider
- [ ] Create `components/payments/PaymentMethodForm.tsx` — CardElement-based form
- [ ] Add Demo Mode banner: "Test Mode — use card 4242 4242 4242 4242"

### TDD Tests

```
__tests__/unit/stripe.test.ts
- should create Stripe customer
- should create setup intent for saving card
- should create payment intent for one-time charge
- should create subscription with trial
- should cancel subscription
- should list payment methods
- should process refund
- should verify webhook signature

__tests__/unit/stripe-client.test.ts
- should return Stripe.js instance
- should handle card element submission
```

---

## 1.6 Core Utilities

### Tasks

- [ ] Set up `lib/utils.ts` — utility functions (cn, formatters, etc.)
- [ ] Set up `lib/auth.ts` — auth utility functions
- [ ] Set up `lib/auth-utils.ts` — middleware auth helpers
- [ ] Set up `lib/error-handler.ts` — error handling utilities
- [ ] Set up `lib/file-validation.ts` — file upload validation
- [ ] Set up `lib/job-constants.ts` — job category/type constants

### TDD Tests

```
__tests__/unit/utils.test.ts
- should merge classnames correctly
- should format currency
- should format dates
- should truncate text

__tests__/unit/file-validation.test.ts
- should validate allowed file types
- should reject oversized files
- should validate file extensions
```

---

## 1.6 Ampertalent Branding & Color System

### Logo & Brand Assets

**Logo File:** `public/logo/ampertalent.png`
- Dimensions: 1408 x 768 px
- Already present in repository
- Used in header, hero section, navigation

**Key Brand Colors (extracted from logo):**

| Color | Hex | RGB | Usage |
|-------|-----|-----|-------|
| **Primary Blue** | `#0066FF` | (0, 102, 255) | CTA buttons, links, brand primary |
| **Teal** | `#00BB88` | (0, 187, 136) | Success, secondary accents |
| **Cyan** | `#00D9FF` | (0, 217, 255) | Highlights, lightning bolt |
| **Dark Navy** | `#1A2D47` | (26, 45, 71) | Text, headings |

### Tasks

- [x] Create `docs/AMPERTALENT-BRAND-GUIDELINES.md` — comprehensive brand guide (ALREADY CREATED)
- [x] Update `tailwind.config.ts` with Ampertalent color palette
- [x] Add CSS variables to `app/globals.css`
- [x] Copy logo to `public/logo/ampertalent.png` (already in repo root, move if needed)
- [ ] Create favicon from logo (multiple sizes: 16x16, 32x32, 64x64, 192x192)
- [ ] Update `next.config.mjs` favicon references
- [x] Replace all "HireMyMom" text with "Ampertalent"
- [x] Update tagline: "Connect With Flexible Talent" → "Where Flexible Talent Meets Opportunity"
- [x] Verify button colors:
  - Primary buttons: `#0066FF` (Electric Blue)
  - Secondary buttons: `#00BB88` (Teal)
  - Success messages: `#00BB88` (Teal)
  - Error messages: Use appropriate red (e.g., `#FF4444`)
- [x] Verify text contrast meets WCAG AA standards
- [ ] Test dark mode color switching

### Branding Verification

Before moving forward, verify:

```bash
# Check Tailwind config has all Ampertalent colors
grep -n "amper-blue\|amper-teal\|amper-cyan" tailwind.config.ts

# Check CSS variables are defined
grep -n "color-primary\|color-secondary" app/globals.css

# Verify logo is accessible
ls -l public/logo/ampertalent.png
```

### Reference Files

- **Brand Guidelines:** `docs/AMPERTALENT-BRAND-GUIDELINES.md` (comprehensive, created today)
- **Logo:** `public/logo/ampertalent.png` (1.2MB, 1408x768px)
- **Color Quick Reference:**
  - `#0066FF` — Primary blue (buttons, links)
  - `#00BB88` — Secondary teal (success, accents)
  - `#00D9FF` — Cyan (highlights)
  - `#1A2D47` — Dark navy (text, headings)

---

## 1.7 UI Foundation

### Tasks

- [x] Set up `components/ui/` — all shadcn/ui components (button, input, dialog, select, etc.)
- [x] Create `app/globals.css` — global styles + CSS variables
- [x] Create `app/layout.tsx` — root layout with providers
- [ ] Create `app/provider.tsx` — theme provider
- [ ] Create `components/providers/` — context providers (UserProfile, Message, SavedJobs, RealTimeNotification)
- [x] Create `components/logo.tsx` — Ampertalent logo component
- [x] Create `components/footer.tsx` — site footer
- [x] Create `components/landing-page-header.tsx` — public header
- [x] Create `components/hero.tsx` — landing page hero section
- [x] Create `components/features.tsx` — features showcase
- [x] Create `components/pricing.tsx` — pricing display
- [x] Create `app/page.tsx` — landing/root page with role-based redirect

### TDD Tests

```
__tests__/ui/layout.test.tsx
- should render root layout with all providers
- should render footer with correct branding

__tests__/ui/hero.test.tsx
- should render hero section
- should contain CTA buttons
```

---

## Deliverables Checklist

- [ ] Next.js project initialized with all dependencies
- [ ] All free-tier services configured with API keys
- [ ] Prisma schema deployed to Supabase
- [ ] File storage adapter working with Supabase Storage
- [ ] Stripe payment integration (test mode) with all customer/subscription/charge methods
- [ ] Stripe Elements UI components (CardElement, PaymentMethodForm)
- [ ] HubSpot CRM integration with contact CRUD and sync service
- [ ] Core utilities and error handling
- [ ] UI foundation with all shadcn/ui components
- [ ] Root layout with providers
- [ ] Landing page (hero + features + pricing)
- [ ] All Phase 1 tests passing
