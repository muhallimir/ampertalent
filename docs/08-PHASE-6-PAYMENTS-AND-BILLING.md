# 💳 Phase 6 — Payments & Billing

> Stripe (test mode) payment integration, subscription lifecycle, recurring billing, invoices, and all payment flows.

---

## 6.1 Stripe Integration (Test Mode)

### Tasks

- [ ] Create `lib/stripe.ts` — Stripe server-side service (replaces `lib/authorize-net.ts`)
  - `createCustomer(email, name, metadata?)` → Stripe Customer ID (`cus_...`)
  - `createSetupIntent(customerId)` → SetupIntent for securely saving payment methods
  - `attachPaymentMethod(customerId, paymentMethodId)` → attach card to customer
  - `createPaymentIntent(customerId, amount, currency, metadata)` → one-time charge
  - `createSubscription(customerId, priceId, trialDays?, paymentMethodId?)` → recurring billing
  - `updateSubscription(subscriptionId, newPriceId)` → plan upgrade/downgrade
  - `cancelSubscription(subscriptionId, atPeriodEnd?)` → cancel immediately or at period end
  - `getSubscription(subscriptionId)` → subscription details + status
  - `listPaymentMethods(customerId, type?)` → saved cards
  - `detachPaymentMethod(paymentMethodId)` → remove saved card
  - `createRefund(paymentIntentId, amount?)` → full or partial refund
  - `getPaymentIntent(paymentIntentId)` → transaction details
  - `listCharges(customerId, limit?)` → billing history
  - `createInvoice(customerId, lineItems)` → Stripe Invoice
- [ ] Store Stripe IDs in existing database schema:
  - `Subscription.subscriptionId` → Stripe Subscription ID (`sub_...`)
  - `Subscription.paymentProfileId` → Stripe Customer ID (`cus_...`)
  - `PaymentMethod.authnetPaymentProfileId` → Stripe PaymentMethod ID (`pm_...`)
- [ ] Add realistic Stripe test card numbers to Demo Mode UI:
  - `4242 4242 4242 4242` — Success
  - `4000 0000 0000 3220` — 3D Secure required
  - `4000 0000 0000 0002` — Card declined

### TDD Tests

```
__tests__/unit/stripe.test.ts
- should create Stripe customer
- should create setup intent for card saving
- should create payment intent for charge
- should create subscription with trial period
- should cancel subscription at period end
- should list payment methods for customer
- should process refund
- should retrieve payment intent details
- should list charges (billing history)
- should handle Stripe API errors gracefully
```

---

## 6.2 Stripe Webhook Handler

### Tasks

- [ ] Create `app/api/webhooks/stripe/route.ts` — Stripe webhook endpoint
  - Verify webhook signature with `STRIPE_WEBHOOK_SECRET`
  - Handle events:
    - `payment_intent.succeeded` → update payment records
    - `payment_intent.payment_failed` → handle failure, notify user
    - `customer.subscription.created` → activate subscription
    - `customer.subscription.updated` → handle plan changes
    - `customer.subscription.deleted` → cancel subscription
    - `invoice.paid` → record successful renewal
    - `invoice.payment_failed` → handle renewal failure
    - `charge.refunded` → record refund
  - Log all webhook events

### TDD Tests

```
__tests__/unit/stripe-webhook.test.ts
- should verify valid webhook signature
- should reject invalid webhook signature
- should handle payment_intent.succeeded
- should handle subscription lifecycle events
- should handle invoice.payment_failed
```

---

## 6.3 Stripe Products & Prices Setup

### Tasks

- [ ] Create Stripe Products + Prices in test mode dashboard (or via API on first run):
  - **Seeker Plans**: Trial ($34.99/mo), Gold ($49.99/2mo), VIP ($79.99/3mo), Annual ($249.99/yr)
  - **Employer Packages**: Standard ($97), Featured ($127), Email Blast ($249), Gold Plus ($97/mo recurring)
  - **Concierge**: Lite ($795), Level I ($1,695), Level II ($2,695), Level III ($3,695), Rush ($500)
- [ ] Create `lib/stripe-prices.ts` — mapping of plan/package → Stripe Price IDs
- [ ] Create demo mode banner component showing "Test Mode — use card 4242 4242 4242 4242"

### TDD Tests

```
__tests__/unit/stripe-prices.test.ts
- should map seeker plan to correct Stripe Price ID
- should map employer package to correct Stripe Price ID
```

---

## 6.4 Seeker Subscription Purchase Flow

### Tasks

- [ ] Create `app/api/seeker/subscription/purchase/route.ts` — process subscription purchase
  - Accept plan selection + payment method (Stripe PaymentMethod ID)
  - Create Stripe Subscription (with trial if applicable)
  - Create/charge via Stripe Payment Intent
  - Create Subscription record
  - Update JobSeeker membership fields
  - Grant resume credits
  - Send admin order notification email
  - Send customer payment confirmation email
  - Create in-app notification
- [ ] Create `app/api/seeker/subscription/checkout/route.ts` — create Stripe checkout session
- [ ] Create `lib/checkout-session-management.ts` — session tracking

### TDD Tests

```
__tests__/integration/payments/seeker-subscription.test.ts
- should create trial subscription ($0 charge, 3-day trial)
- should create gold subscription ($49.99)
- should create VIP subscription ($79.99)
- should create annual subscription ($249.99)
- should grant correct resume credits per plan
- should set membership expiration date
- should create Subscription record
- should handle payment failure gracefully
- should send admin notification email
- should send customer confirmation email
```

---

## 6.5 Employer Package Purchase Flow

### Tasks

- [ ] Create `app/api/employer/billing/purchase/route.ts` — purchase employer package
  - Accept package selection + add-ons + payment method
  - Calculate total (base + add-ons)
  - Create Stripe Payment Intent for total amount
  - Create EmployerPackage record
  - Create PurchasedAddOn records for add-ons
  - Create Invoice record
  - Send notifications
- [ ] Create `app/api/employer/billing/process-first-payment/route.ts` — first payment for recurring
- [ ] Create `lib/employer-package-provisioning.ts` — package provisioning logic
- [ ] Create `lib/addons-config.ts` — add-on configuration

### TDD Tests

```
__tests__/integration/payments/employer-package.test.ts
- should purchase standard package ($97, 1 listing, 30 days)
- should purchase featured package ($127, 1 listing + 1 featured)
- should purchase email blast ($249, 1 listing, 7 days)
- should purchase Gold Plus recurring ($97, 1 listing, 180 days, 6 monthly cycles)
- should purchase concierge Level I ($1,695)
- should purchase concierge with add-ons
- should create EmployerPackage with correct listings
- should create Invoice record
- should handle add-on pricing correctly
```

---

## 6.6 Payment Method Management

### Tasks

- [ ] Create `components/payments/PaymentMethodForm.tsx` — Stripe Elements CardElement form
  - Stripe CardElement for secure card entry
  - Billing name + billing address fields
  - Uses SetupIntent to save card securely
  - Shows "Test Mode" helper with test card numbers
- [ ] Create `app/api/payments/save-method/route.ts` — create SetupIntent + attach PaymentMethod
- [ ] Create `app/api/payments/process-payment/route.ts` — create PaymentIntent for charges
- [ ] Create `app/api/payments/create-checkout/route.ts` — create Stripe Checkout Session
- [ ] Create `lib/stripe-client.ts` — client-side Stripe utilities (loadStripe, Elements wrapper)

### TDD Tests

```
__tests__/integration/payments/payment-methods.test.ts
- should save card via Stripe SetupIntent
- should set first method as default
- should delete payment method (detach from Stripe)
- should list saved payment methods
- should update default payment method
```

---

## 6.7 Recurring Billing

### Architecture Note: Stripe vs Cron Handling

**⚠️ CRITICAL DISTINCTION for ampertalent:**

1. **Seeker Subscriptions (Stripe-Managed)** ✅ AUTOMATIC
   - Stripe handles ALL recurring billing automatically
   - Stripe Subscriptions API manages renewals
   - Webhook `invoice.paid` confirms each renewal
   - NO cron job needed - Stripe charges customer automatically
   - DB sync: Listen to Stripe webhooks to update Subscription records

2. **Employer Gold Plus Recurring (Cron-Driven)** ⏰ MANUAL CRON
   - Stripe only handles ONE-TIME Payment Intents
   - Cron job must charge manually on `nextBillingDate`
   - Use saved Stripe PaymentMethod to charge
   - Update billing cycle after successful charge
   - Advance `nextBillingDate` for next cycle

### Tasks

- [ ] Create `lib/jobs/sync-stripe-subscriptions.ts` — sync Stripe subscription state to DB
  - Listen to Stripe webhook events
  - Sync `invoice.paid` → update Subscription.currentPeriodEnd
  - Grant new resume credits on renewal
  - Handle trial → paid transition
  - Send notifications to user
  - **Note:** Actual charging is done by Stripe, not by this job

- [ ] Create `lib/jobs/recurring-employer-billing.ts` — cron job for employer Gold Plus
  - Find EmployerPackages with `nextBillingDate <= now()`
  - Validate saved payment method exists
  - Create Stripe Payment Intent with saved PaymentMethod
  - Charge employer Gold Plus recurring fees
  - Advance `nextBillingDate` to next cycle
  - Decrement `remainingBillingCycles`
  - On final cycle complete: set status to "expired"
  - Handle payment failure: create retry schedule or notify admin
  - Send notifications

- [ ] Create `lib/jobs/membership-reminders.ts` — renewal reminder emails (cron)
  - 24h window before Stripe subscription renewal
  - Query Subscriptions with `currentPeriodEnd - 24h ≤ now()`
  - Skip trial/suspended accounts
  - Send via Resend
  - Log notification sent timestamp

### TDD Tests

```
__tests__/unit/sync-stripe-subscriptions.test.ts
- should handle invoice.paid webhook event
- should update Subscription.currentPeriodEnd from Stripe
- should grant new resume credits on renewal
- should detect trial → paid transition
- should send notification email on renewal
- should skip already-synced renewals (idempotent)

__tests__/unit/recurring-employer-billing.test.ts
- should find packages with nextBillingDate due
- should validate saved payment method exists
- should create Stripe Payment Intent with saved method
- should advance nextBillingDate for next cycle
- should decrement remainingBillingCycles
- should set status to "expired" after final cycle
- should handle payment failure and create retry
- should handle missing payment method (notify admin)
- should send notification email on charge success

__tests__/unit/membership-reminders.test.ts
- should find subscriptions renewing in 24h window
- should send reminder email before renewal
- should skip trial subscriptions
- should skip suspended seekers
- should not duplicate reminders (check log)
```

---

## 6.8 Invoice Generation

### Tasks

- [ ] Create `lib/invoice-pdf.ts` — PDF invoice generation with jsPDF
  - Ampertalent branding
  - Invoice number formatting (INV-XXXXXXXX)
  - Line items table
  - Billing address
  - Payment summary
- [ ] Create `app/api/billing-requests/route.ts` — invoice download endpoint

### TDD Tests

```
__tests__/unit/invoice-pdf.test.ts
- should generate PDF buffer
- should include correct invoice number
- should include line items
- should include billing address
- should format currency correctly
```

---

## 6.9 Email Templates

### Tasks

- [ ] Create `lib/email-templates.ts` — all email templates
  - Welcome seeker/employer
  - Payment confirmation (with billing info, payment method)
  - Subscription reminder
  - Admin order notification
  - Job approved/rejected
  - Application status update
  - Team invitation
  - Interview scheduled/completed
  - Service purchase confirmation
  - Exclusive plan offered/activated
- [ ] Create `lib/admin-order-utils.ts` — order number generation

### TDD Tests

```
__tests__/unit/email-templates.test.ts
- should generate welcome seeker email
- should generate payment confirmation with line items
- should generate subscription reminder
- should generate admin order notification
- should include Ampertalent branding in all templates
```

---

## 6.10 Premium Service Purchases

### Tasks

- [ ] Create `app/api/seeker/services/purchase/route.ts` — service purchase
- [ ] Create `app/api/resume-critique/payment/route.ts` — resume critique payment
- [ ] Create `lib/additional-services.ts` — service catalog config

### TDD Tests

```
__tests__/integration/payments/services.test.ts
- should purchase Career Jumpstart ($99)
- should purchase Interview Success Training ($100)
- should purchase Resume Critique (standard/rush pricing)
- should create AdditionalServicePurchase record
```

---

## Deliverables Checklist

- [ ] Stripe integration (test mode) — full payment lifecycle
- [ ] Stripe webhook handler for all payment events
- [ ] Stripe Products/Prices for all plans and packages
- [ ] Demo mode banner with test card numbers
- [ ] Seeker subscription purchase (4 plans via Stripe Subscriptions)
- [ ] Employer package purchase (6+ types with add-ons via Stripe Payment Intents)
- [ ] Payment method management (Stripe Elements CardElement + SetupIntent)
- [ ] Recurring billing (Stripe-managed subscriptions + cron-driven employer billing)
- [ ] Membership renewal reminders
- [ ] Invoice PDF generation
- [ ] All email templates with Ampertalent branding
- [ ] Premium service purchases
- [ ] Transaction history (via Stripe Charges API)
- [ ] All Phase 6 tests passing
