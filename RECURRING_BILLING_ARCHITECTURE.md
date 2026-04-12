# Recurring Billing Architecture for Ampertalent Clone

> **CRITICAL ARCHITECTURAL DECISION**: How to handle recurring billing in the free-tier clone

## Problem Statement

The original `hire_my_mom_saas` uses Authorize.net for recurring billing which requires a server-side cron job to manually charge customers every billing cycle. When cloning to `ampertalent` with **Stripe Test Mode** (free forever), we have a better option.

## Solution: Hybrid Approach

### 1. **Seeker Subscriptions (Stripe-Managed)** ✅ AUTOMATIC

**Why Stripe?** Stripe Subscriptions API handles all recurring billing automatically

**Implementation:**
- Use Stripe Subscriptions with `priceId` for each plan
- Stripe automatically charges customer every renewal cycle
- Zero cron job needed - Stripe handles payment collection
- 3 webhook events handle everything:
  - `invoice.payment_succeeded` → renewal charged successfully
  - `invoice.payment_failed` → payment declined, notify user
  - `customer.subscription.deleted` → subscription canceled

**Database Sync:**
- `lib/jobs/sync-stripe-subscriptions.ts` (webhook handler, NOT cron)
- Listens to Stripe webhooks
- Updates `Subscription` record with new `currentPeriodEnd`
- Grants new resume credits on successful renewal
- Changes `isOnTrial` flag when trial period ends
- No actual charging happens in this code - Stripe already charged

**Code Location:**
```
app/api/webhooks/stripe/route.ts          ← Webhook endpoint
lib/jobs/sync-stripe-subscriptions.ts     ← Event handlers
app/api/seeker/subscription/purchase/route.ts  ← Purchase endpoint
```

### 2. **Employer Gold Plus Recurring (Cron-Driven)** ⏰ MANUAL CRON

**Why Cron?** Employer packages are flat-fee multi-cycle purchases, not Stripe Subscriptions

**Implementation:**
- Store `nextBillingDate` in `EmployerPackage`
- Cron job runs daily to find packages due for billing
- Charge using saved Stripe PaymentMethod ID
- Manually advance `nextBillingDate` to next cycle
- Track `remainingBillingCycles`

**Database Updates:**
- `nextBillingDate` → when next charge is due
- `remainingBillingCycles` → how many more cycles left
- `lastBilledAt` → timestamp of last charge
- Status changes to "expired" after final cycle

**Code Location:**
```
lib/jobs/recurring-billing.ts             ← Main cron logic (already exists)
app/api/employer/billing/purchase/route.ts  ← Purchase endpoint
```

**Cron Trigger:**
```bash
# In vercel.json or your cron service
POST /api/cron/recurring-jobs?secret=CRON_SECRET
```

## Comparison Table

| Aspect | Seeker (Stripe) | Employer (Cron) |
|--------|-----------------|-----------------|
| **Recurring Model** | Stripe Subscriptions API | Manual Payment Intents |
| **Auto-Charge** | Yes (Stripe does it) | No (cron must charge) |
| **Cron Job Needed** | ❌ No | ✅ Yes |
| **Webhook Events** | `invoice.paid`, `invoice.payment_failed` | N/A (cron creates intents) |
| **Failure Handling** | Stripe manages (past_due, retries) | Cron must implement retry logic |
| **Billing Cycles** | Automatic (every renewal) | Manual (flat-fee per cycle) |
| **DB Sync** | Webhook → sync state | Cron → charge + update |

## Key Files

### Stripe-Managed (Seeker)
- `lib/stripe.ts` - Stripe client methods
- `lib/stripe-products-config.ts` - Plan definitions
- `app/api/webhooks/stripe/route.ts` - Webhook handler
- `lib/jobs/sync-stripe-subscriptions.ts` - DB sync handlers
- `app/api/seeker/subscription/purchase/route.ts` - Purchase flow

### Cron-Managed (Employer)
- `lib/jobs/recurring-billing.ts` - Cron job logic
- `app/api/cron/recurring-jobs` - Cron endpoint
- `app/api/employer/billing/purchase/route.ts` - Purchase flow

## Test Cards

```
✅ Success:  4242 4242 4242 4242
❌ Decline: 4000 0000 0000 0002
🔐 3D Secure: 4000 0025 0000 3155
```

Use any future expiration date and any 3-digit CVC.

## Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

CLERK_WEBHOOK_SECRET=whsec_...

CRON_SECRET=your_cron_secret_here
```

## Implementation Checklist

### Seeker Subscriptions (Stripe-Managed)
- [x] Stripe integration setup
- [x] Stripe webhook handler
- [x] Products/prices configuration
- [x] Payment method form
- [x] Purchase endpoint
- [x] Subscription sync job (webhook handler)
- [ ] Membership reminder emails (24h before renewal)
- [ ] Renewal failure notifications

### Employer Gold Plus (Cron-Driven)  
- [x] Purchase endpoint
- [ ] Cron job implementation
- [ ] Retry logic for failed charges
- [ ] Cycle advancement logic
- [ ] Notification emails

## Why This Matters

**For Free-Tier Sustainability:**
- Stripe Subscriptions = Zero overhead (Stripe manages everything)
- Employer Cron = Minimal overhead (one daily call)
- No expensive payment gateway integration
- No manual payment reconciliation
- Full API support in test mode

**For Clone Accuracy:**
- Reproduces hire_my_mom_saas payment flow
- But uses better tech (Stripe vs Authorize.net)
- Maintains same UX and features
- Clearer separation of concerns

## Future Migration Path

If migrating to production:
1. Switch `pk_test_*` keys to `pk_live_*`
2. No code changes needed for Seeker subscriptions (Stripe handles it)
3. No code changes needed for Employer cron job (same logic applies)
4. Update email templates to production domain
5. Set up real Resend email sending
6. Enable Slack/PagerDuty alerts for cron failures
