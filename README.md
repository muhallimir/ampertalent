# AmperTalent

A remote job board SaaS platform connecting flexible talent with employers.

---

## Tech Stack

- **Framework:** Next.js (App Router) + TypeScript
- **Database:** PostgreSQL via Supabase + Prisma ORM
- **Auth:** Clerk
- **Payments:** Stripe + PayPal
- **Email:** Resend
- **File Storage:** Supabase Storage
- **Cache:** Upstash Redis
- **Error Monitoring:** Sentry
- **Hosting:** Vercel

---

## Features

### Seeker Portal
- Profile & multi-resume management
- Job search, filtering, saved jobs, applications
- Subscription tiers (Trial / Gold / VIP / Annual)
- Premium services marketplace
- Messaging with employers
- Interview tracking

### Employer Portal
- Company profile & job postings
- Team management with invite system
- Job packages (Standard / Featured / Email Blast / Gold Plus / Concierge)
- Talent discovery & application management
- Billing and payment method management

### Admin Portal
- User & job moderation
- Analytics dashboard
- Invoice & billing management
- CRM sync (GoHighLevel)

### Payment System
- Stripe card payments (with saved payment method after first purchase)
- PayPal billing agreements
- Admin email notification on every payment
- Customer confirmation email on every payment
- Subscription lifecycle (trial, renewal, cancellation)
- Employer package lifecycle

### Other
- Real-time notifications (SSE)
- Concierge services & chat
- Cron-based recurring billing
- PDF invoices

---

## Setup

```bash
npm install
cp .env.example .env
# Fill in env vars (Clerk, Supabase, Stripe, PayPal, Resend, etc.)
npx prisma migrate dev
npm run dev
```

### Key env vars

```
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
ENABLE_CUSTOMER_PAYMENT_EMAILS=true
```

---

## Scripts

```bash
npm run dev        # Development server
npm run build      # Production build
npm run start      # Production server
npm test           # Run tests
npm run db:push    # Push schema
npm run db:studio  # Prisma Studio
```

---

## Project Structure

```
app/
  api/           # API routes & webhooks
  seeker/        # Seeker portal pages
  employer/      # Employer portal pages
  admin/         # Admin dashboard
  onboarding/    # Onboarding flow
  checkout/      # Payment checkout
components/      # React components
lib/             # Services & utilities
prisma/          # Database schema
__tests__/       # Unit, integration, e2e tests
```

---

## Deployment

Hosted on Vercel. Database on Supabase PostgreSQL.

```bash
vercel --prod
```
