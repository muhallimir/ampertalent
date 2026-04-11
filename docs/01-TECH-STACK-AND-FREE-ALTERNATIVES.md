# 🛠️ Ampertalent — Tech Stack & Free Alternatives

> Every service below is **genuinely free** — no credit card required, no trial period that expires.

---

## 📋 Original → Free Alternative Mapping

### Core Framework & Language

| Component           | Original                | Ampertalent (Free)          | Free Tier Details                       |
| ------------------- | ----------------------- | --------------------------- | --------------------------------------- |
| **Framework**       | Next.js 16 (App Router) | **Next.js 16 (App Router)** | ✅ Open source, MIT license — identical |
| **Language**        | TypeScript              | **TypeScript**              | ✅ Open source — identical              |
| **Runtime**         | Node.js                 | **Node.js**                 | ✅ Open source — identical              |
| **Package Manager** | npm                     | **npm**                     | ✅ Free — identical                     |

### UI & Styling

| Component              | Original                                 | Ampertalent (Free)                           | Free Tier Details          |
| ---------------------- | ---------------------------------------- | -------------------------------------------- | -------------------------- |
| **React**              | React 19                                 | **React 19**                                 | ✅ Open source — identical |
| **CSS Framework**      | Tailwind CSS 3.4                         | **Tailwind CSS 3.4**                         | ✅ Open source — identical |
| **Component Library**  | shadcn/ui + Radix UI                     | **shadcn/ui + Radix UI**                     | ✅ Open source — identical |
| **Icons**              | Lucide React + Radix Icons               | **Lucide React + Radix Icons**               | ✅ Open source — identical |
| **Charts**             | Recharts                                 | **Recharts**                                 | ✅ Open source — identical |
| **Theme**              | next-themes                              | **next-themes**                              | ✅ Open source — identical |
| **Markdown Editor**    | @uiw/react-md-editor                     | **@uiw/react-md-editor**                     | ✅ Open source — identical |
| **Virtual Scroll**     | react-virtuoso                           | **react-virtuoso**                           | ✅ Open source — identical |
| **Forms**              | React Hook Form + Zod                    | **React Hook Form + Zod**                    | ✅ Open source — identical |
| **PDF Generation**     | jsPDF + jspdf-autotable                  | **jsPDF + jspdf-autotable**                  | ✅ Open source — identical |
| **Markdown Rendering** | react-markdown + rehype-raw + remark-gfm | **react-markdown + rehype-raw + remark-gfm** | ✅ Open source — identical |

### Authentication

| Component         | Original                   | Ampertalent (Free)    | Free Tier Details                                                                                                                                                                                       |
| ----------------- | -------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth Provider** | Clerk (`@clerk/nextjs` v6) | **Clerk (Free Plan)** | ✅ **10,000 MAU free, no credit card required**. Includes: SSO, email/password, social login, user management, webhooks, custom domains, org management. [clerk.com/pricing](https://clerk.com/pricing) |

> **Why Clerk Free works:** The original uses Clerk, and the free plan includes everything needed — same SDK, same features, same middleware patterns. Zero code changes required. 10K MAU is more than enough for a portfolio demo.

### Database

| Component         | Original              | Ampertalent (Free)        | Free Tier Details                                                                                                                                                                                |
| ----------------- | --------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Database**      | PostgreSQL (Supabase) | **Supabase (Free Plan)**  | ✅ **500 MB storage, 2 projects, no credit card**. Unlimited API requests, 50K MAU auth (if using Supabase Auth), Realtime, Edge Functions. [supabase.com/pricing](https://supabase.com/pricing) |
| **ORM**           | Prisma 6.8            | **Prisma 6.8**            | ✅ Open source — identical                                                                                                                                                                       |
| **Direct Client** | @supabase/supabase-js | **@supabase/supabase-js** | ✅ Open source — used for admin operations via service role key                                                                                                                                  |

> **Alternative DB options (also free, no card):**
>
> - **Neon PostgreSQL** — 0.5 GiB storage, 190 compute hours/month, no CC required
> - **ElephantSQL** — 20 MB free (too small)
> - **Railway** — $5 credit (requires CC eventually)
>
> **Recommendation:** Stick with **Supabase Free** — identical to original, 500 MB is plenty for portfolio demo.

### Payment Processing

| Component             | Original                  | Ampertalent (Free)     | Free Tier Details                                                                                                                                                                           |
| --------------------- | ------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Primary Payment**   | Authorize.net (CIM + ARB) | **Stripe (Test Mode)** | ✅ **Free account, no CC required**. Full API access in test mode with test card numbers. Customers, subscriptions, charges, refunds, webhooks — all work. [stripe.com](https://stripe.com) |
| **Secondary Payment** | PayPal Billing Agreements | **Stripe (Test Mode)** | ✅ Stripe replaces both Authorize.net AND PayPal — single integration handles all payment flows                                                                                             |

> **💡 Why Stripe Test Mode instead of Mock Payments:**
>
> - **Stripe account creation is free** — no CC, no business verification needed
> - **Test mode is fully functional forever** — not a trial, it's a permanent sandbox
> - **Real SDK, real API, real webhooks** — uses `@stripe/stripe-js` + `stripe` Node SDK
> - **Test card numbers** — `4242 4242 4242 4242` for success, `4000 0000 0000 0002` for decline, etc.
> - **Portfolio value** — demonstrates REAL Stripe integration, not a mock. Hiring managers can see actual payment processor code
> - **Features available in test mode**: Customers, Payment Intents, Subscriptions (recurring billing), Invoices, Refunds, Webhooks, Payment Methods, Checkout Sessions
>
> **Key differences from original Authorize.net implementation:**
>
> | Authorize.net (Original) | Stripe (Ampertalent)                  |
> | ------------------------ | ------------------------------------- |
> | CIM Customer Profiles    | Stripe Customers                      |
> | CIM Payment Profiles     | Stripe Payment Methods (SetupIntents) |
> | ARB Subscriptions        | Stripe Subscriptions                  |
> | Direct Charges           | Stripe Payment Intents                |
> | Transaction Details      | Stripe Charges / Payment Intents      |
> | Refunds                  | Stripe Refunds                        |
> | Webhooks (custom)        | Stripe Webhooks (built-in)            |
>
> **No mock service needed** — Stripe test mode IS the development/demo environment.

### File Storage

| Component          | Original                | Ampertalent (Free)   | Free Tier Details                                                                                                                   |
| ------------------ | ----------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Object Storage** | AWS S3 (presigned URLs) | **Supabase Storage** | ✅ **1 GB free storage, no CC**. S3-compatible API, presigned URLs, public/private buckets. Already included in Supabase free tier. |

> **Why Supabase Storage instead of AWS S3:**
>
> - AWS Free Tier requires a credit card
> - Supabase Storage is S3-compatible, supports presigned URLs
> - Already using Supabase for DB — one less account to manage
> - 1 GB is plenty for portfolio demo resumes/images
>
> **Code changes:** Replace `@aws-sdk/client-s3` calls with Supabase Storage API in `lib/s3.ts`. The interface stays the same (upload, download, presigned URLs, delete).
>
> **Alternative (also no CC):**
>
> - **Uploadthing** — 2 GB free, no CC, built for Next.js
> - **Cloudflare R2** — 10 GB free... but requires CC for account setup

### Email

| Component               | Original | Ampertalent (Free)     | Free Tier Details                                                                                                                                          |
| ----------------------- | -------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Transactional Email** | Resend   | **Resend (Free Plan)** | ✅ **100 emails/day, 3,000/month, no CC required**. Custom domain verification, API, React Email support. [resend.com/pricing](https://resend.com/pricing) |

> **Why Resend Free works:** The original uses Resend, and the free plan provides 100 emails/day — more than enough for portfolio demos. Same SDK, same API. Zero code changes.
>
> **Alternative (also no CC):**
>
> - **Mailgun** — requires CC
> - **SendGrid** — 100/day free, no CC
> - **Mailtrap** — 1,000/month free, email testing sandbox, no CC
> - **Brevo (formerly Sendinblue)** — 300/day free, no CC

### Caching

| Component       | Original             | Ampertalent (Free)            | Free Tier Details                                                                                                                 |
| --------------- | -------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Redis Cache** | Upstash Redis (REST) | **Upstash Redis (Free Plan)** | ✅ **10,000 commands/day, 256 MB, no CC required**. REST API, Edge-compatible. [upstash.com/pricing](https://upstash.com/pricing) |

> **Why Upstash Free works:** Original uses Upstash Redis, free tier has 10K commands/day. Same SDK (`@upstash/redis`). Zero code changes.
>
> **Note:** BullMQ/ioredis was removed from the original (see `lib/queue.ts` — now empty stub). Only REST Redis is used for caching.

### Error Monitoring

| Component          | Original | Ampertalent (Free)     | Free Tier Details                                                                                                                                   |
| ------------------ | -------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Error Tracking** | Bugsnag  | **Sentry (Free Plan)** | ✅ **5K errors/month, 1 user, no CC**. Supports Next.js, React, source maps, performance monitoring. [sentry.io/pricing](https://sentry.io/pricing) |

> **Why switch from Bugsnag to Sentry:**
>
> - Bugsnag free plan requires CC for account setup
> - Sentry free plan is truly free — no CC required
> - Both provide: error tracking, React integration, source maps, performance
> - SDK swap: `@bugsnag/js` → `@sentry/nextjs` (well-documented migration)
>
> **Alternative (also no CC):**
>
> - **LogRocket** — 1K sessions/month free, no CC
> - **Console.log** — DIY logging (loses error grouping/alerting)

### CRM Integration

| Component | Original        | Ampertalent (Free)                  | Free Tier Details                                                                                                                                                                                      |
| --------- | --------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **CRM**   | GoHighLevel API | **⏳ HubSpot CRM (Free, Phase 10)** | ✅ **100% free CRM, no CC required** (Post-first deployment). Unlimited users, contacts, deals, tasks, API access. REST API + webhooks. [hubspot.com/pricing/crm](https://www.hubspot.com/pricing/crm) |

> **💡 Why HubSpot Free CRM (Post-Deployment):**
>
> - **Integration Strategy**: HubSpot is an alternative to the original GoHighLevel, integrated AFTER first deployment
> - **HubSpot CRM is genuinely free forever** — not a trial, not freemium-gated for core CRM
> - **No credit card required** to sign up or use the API
> - **Full REST API access** on the free plan — contacts, companies, deals, tasks, notes, custom properties
> - **Up to 1,000,000 contacts** on the free plan
> - **API rate limits**: 100 requests/10 seconds (more than enough for portfolio demo)
> - **Real CRM integration** in your portfolio — hiring managers see actual third-party API code, not a mock
> - **OAuth2 or Private App tokens** for auth — use Private App token (simplest, no OAuth flow needed)
> - **When to integrate**: Phase 10 (after revenue is flowing through Stripe payments in Phase 6)
>
> **Mapping GoHighLevel → HubSpot:**
>
> | GoHighLevel (Original)     | HubSpot (Ampertalent)                  |
> | -------------------------- | -------------------------------------- |
> | `createContact()`          | `POST /crm/v3/objects/contacts`        |
> | `updateContact()`          | `PATCH /crm/v3/objects/contacts/:id`   |
> | `getContact()`             | `GET /crm/v3/objects/contacts/:id`     |
> | `searchContacts()`         | `POST /crm/v3/objects/contacts/search` |
> | `addTag()` / `removeTag()` | Custom properties or lists             |
> | `getCustomFields()`        | `GET /crm/v3/properties/contacts`      |
> | Custom field mapping       | HubSpot custom properties              |
> | Campaigns                  | HubSpot lists + workflows (free)       |
>
> **No mock service needed** — HubSpot Free CRM IS the real CRM with real API.

### Real-time

| Component                   | Original                 | Ampertalent (Free)           | Free Tier Details                                                         |
| --------------------------- | ------------------------ | ---------------------------- | ------------------------------------------------------------------------- |
| **Real-time Notifications** | SSE (Server-Sent Events) | **SSE (Server-Sent Events)** | ✅ Built into Next.js API routes — no external service needed. Zero cost. |

> SSE is a native browser API running on Next.js API routes. No change needed.

### Hosting & Deployment

| Component     | Original    | Ampertalent (Free)      | Free Tier Details                                                                                                                                                                                    |
| ------------- | ----------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hosting**   | Vercel      | **Vercel (Hobby Plan)** | ✅ **Free for personal projects, no CC**. Includes: serverless functions, edge functions, cron jobs, preview deployments, custom domain, analytics. [vercel.com/pricing](https://vercel.com/pricing) |
| **Cron Jobs** | Vercel Cron | **Vercel Cron (Hobby)** | ✅ **2 cron jobs free** on Hobby plan (original uses 2: daily + hourly)                                                                                                                              |

> **Vercel Hobby limitations:**
>
> - 100 GB bandwidth/month
> - 10s serverless function timeout (vs 300s on Pro) — need to optimize long-running cron jobs
> - 2 cron jobs (exactly what we need: daily-tasks + hourly-tasks)
> - 6000 build minutes/month
>
> **For the cron job timeout limitation:** Split the daily-tasks into smaller batches that complete within 10s. For a portfolio demo with limited data, this is a non-issue.

### Webhooks & External Integrations

| Component             | Original               | Ampertalent (Free)              | Free Tier Details                  |
| --------------------- | ---------------------- | ------------------------------- | ---------------------------------- |
| **External Webhooks** | Custom webhook service | **Same custom webhook service** | ✅ Self-built, no external service |

> **Note:** WordPress integration from the original project is **removed** in Ampertalent. It was a legacy integration for the original client's WordPress site and is not relevant to the portfolio clone.

---

## 💰 Total Cost Summary

| Service                          | Monthly Cost                 |
| -------------------------------- | ---------------------------- |
| Next.js / React / TypeScript     | $0 (open source)             |
| Tailwind CSS / shadcn/ui / Radix | $0 (open source)             |
| Clerk (Auth)                     | $0 (free plan, 10K MAU)      |
| Supabase (DB + Storage)          | $0 (free plan, 500MB + 1GB)  |
| Prisma (ORM)                     | $0 (open source)             |
| Stripe (Payments — Test Mode)    | $0 (free account, test mode) |
| HubSpot CRM                      | $0 (free plan, 1M contacts)  |
| Resend (Email)                   | $0 (free plan, 100/day)      |
| Upstash Redis (Cache)            | $0 (free plan, 10K/day)      |
| Sentry (Error Tracking)          | $0 (free plan, 5K errors)    |
| Vercel (Hosting + Cron)          | $0 (hobby plan)              |
| jsPDF / Recharts / etc.          | $0 (open source)             |
| **TOTAL**                        | **$0.00/month**              |

---

## 🔄 Code Change Summary

| Area                                     | Change Type                            | Effort    |
| ---------------------------------------- | -------------------------------------- | --------- |
| Auth (Clerk)                             | **No change** — same SDK               | None      |
| DB (Supabase + Prisma)                   | **No change** — same Prisma schema     | None      |
| Cache (Upstash Redis)                    | **No change** — same SDK               | None      |
| Email (Resend)                           | **No change** — same SDK               | None      |
| Real-time (SSE)                          | **No change** — same implementation    | None      |
| Hosting (Vercel)                         | **No change** — same deployment        | None      |
| UI (shadcn + Tailwind)                   | **No change** — same components        | None      |
| File Storage (S3 → Supabase Storage)     | **Moderate** — replace S3 SDK calls    | ~1 day    |
| Error Monitoring (Bugsnag → Sentry)      | **Minor** — swap SDK                   | ~2 hours  |
| Payments (Authorize.net/PayPal → Stripe) | **Moderate** — new Stripe integration  | ~2 days   |
| CRM (GoHighLevel → HubSpot)              | **Moderate** — new HubSpot integration | ~1.5 days |
| Branding (HireMyMom → Ampertalent)       | **Minor** — find/replace branding      | ~2 hours  |

---

## 📦 Package.json Changes

### Keep (identical)

```
next, react, react-dom, @clerk/nextjs, @clerk/themes, @prisma/client,
@supabase/supabase-js, @upstash/redis, resend, @radix-ui/*,
react-hook-form, @hookform/resolvers, zod, recharts, lucide-react,
tailwind-merge, tailwindcss-animate, class-variance-authority, clsx,
cmdk, next-themes, jspdf, jspdf-autotable, react-markdown, rehype-raw,
remark-gfm, react-virtuoso, @uiw/react-md-editor, input-otp,
html2canvas, axios
```

### Remove

```
@aws-sdk/client-s3, @aws-sdk/s3-request-presigner (replace with Supabase Storage)
@bugsnag/js, @bugsnag/plugin-react, @bugsnag/browser-performance (replace with Sentry)
bullmq, ioredis (already removed in original — dead code)
socket.io, socket.io-client (not actively used — SSE is the real-time method)
pdfkit, @types/pdfkit (jsPDF is the active PDF lib)
mysql2 (legacy MySQL migration tool — not needed)
```

### Add

```
@sentry/nextjs (error monitoring)
stripe (Stripe Node SDK — server-side)
@stripe/stripe-js (Stripe.js — client-side)
@stripe/react-stripe-js (Stripe React components — Elements, CardElement, etc.)
@hubspot/api-client (HubSpot CRM SDK)
```

---

## 🎨 Branding Changes

| Element        | Original                          | Ampertalent                                  |
| -------------- | --------------------------------- | -------------------------------------------- |
| App Name       | Hire My Mom / HireMyMom           | **Ampertalent**                              |
| Tagline        | "Remote Jobs for Working Parents" | "Where Flexible Talent Meets Opportunity"    |
| Domain         | hiremymom.com                     | Ampertalent-demo.vercel.app                  |
| Email From     | team@notifications.hiremymom.com  | team@Ampertalent-demo.vercel.app             |
| Logo           | hmm_logo.png                      | Custom Ampertalent logo                      |
| Color Scheme   | Teal/Brand colors                 | Similar but distinct palette                 |
| Metadata Title | "Hire My Mom - Remote Jobs..."    | "Ampertalent - Flexible Remote Job Platform" |

---

## ✅ No-Credit-Card Verification Checklist

- [x] **Clerk** — Sign up at clerk.com → No CC prompt → Free plan auto-applied
- [x] **Supabase** — Sign up at supabase.com → GitHub OAuth → No CC → Free tier
- [x] **Stripe** — Sign up at stripe.com → No CC → Test mode active immediately → Use test API keys
- [x] **HubSpot CRM** — Sign up at hubspot.com → No CC → Free CRM forever → Create Private App for API token
- [x] **Resend** — Sign up at resend.com → No CC → 100 emails/day free
- [x] **Upstash** — Sign up at upstash.com → No CC → 10K commands/day free
- [x] **Sentry** — Sign up at sentry.io → No CC → 5K errors/month free
- [x] **Vercel** — Sign up at vercel.com → GitHub OAuth → No CC → Hobby plan free
- [x] **GitHub** — Sign up at github.com → No CC → Free repos
