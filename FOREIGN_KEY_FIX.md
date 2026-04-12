# CRITICAL DATABASE FIX: Foreign Key Constraint Error

## The Problem

After the user completes Stripe payment and the profile/subscription creation flow starts, you were getting:

```
🚨 DATABASE ERROR: Foreign key constraint violated:
`subscriptions_external_payment_id_fkey (index)`
```

This meant the subscription creation was failing because of a database constraint violation.

---

## Root Cause

The `Subscription` table in Prisma has a foreign key relationship:

```typescript
// In schema.prisma:
model Subscription {
  ...
  externalPaymentId     String?              @map("external_payment_id")
  ...
  externalPayment       ExternalPayment?     @relation(fields: [externalPaymentId], references: [id])
}
```

When you try to create a subscription with `externalPaymentId`, the database **requires** an `ExternalPayment` record with that ID to exist first.

**What was happening**:

```
Old code tried:
  CREATE Subscription {
    externalPaymentId: 'stripe-session-id'  // ← But no ExternalPayment record with this ID!
  }

Result: Foreign key constraint violated ❌
```

---

## The Solution

**Create the ExternalPayment record FIRST, then link the subscription to it:**

```typescript
// Step 1: Create ExternalPayment record
const externalPayment = await db.externalPayment.create({
  data: {
    userId: userProfile.id,
    amount: new Decimal('49.99'),
    planId: 'gold',
    status: 'completed',
    webhookProcessedAt: new Date()
  }
})

// Step 2: Create Subscription and link it
const subscription = await db.subscription.create({
  data: {
    seekerId: jobSeeker.userId,
    plan: 'gold_bimonthly',
    status: 'active',
    externalPaymentId: externalPayment.id,  // ← Now this ID exists!
    ...other fields...
  }
})
```

**Why this works**:

- `ExternalPayment` record is created → Gets an ID
- `Subscription` is created → References that ID
- Foreign key constraint is satisfied ✅

---

## What Changed

### File Modified

`/app/api/seeker/subscription/process-payment/route.ts`

### Changes Made

1. **Added Import**:

```typescript
import { Decimal } from "@prisma/client/runtime/library";
```

2. **Before Subscription Creation, Create ExternalPayment**:

```typescript
// CRITICAL FIX: Create ExternalPayment record FIRST
const amountInDollars = ((session.amount_total || 0) / 100).toFixed(2);
const externalPayment = await db.externalPayment.create({
	data: {
		userId: userProfile.id,
		amount: new Decimal(amountInDollars),
		planId: planId,
		status: "completed",
		webhookProcessedAt: new Date(),
	},
});

console.log("✅ PROCESS-PAYMENT: External payment created:", {
	id: externalPayment.id,
	amount: externalPayment.amount,
	planId: externalPayment.planId,
});
```

3. **Link Subscription to ExternalPayment**:

```typescript
// Changed from:
// externalPaymentId: session.id

// To:
externalPaymentId: externalPayment.id; // ← Reference the created ExternalPayment
```

---

## Database Changes

Now when a payment is processed, the following records are created in the proper order:

```
1. ExternalPayment (NEW)
   ├─ id: 'cmn...'
   ├─ userId: 'cmn...' (UserProfile)
   ├─ amount: 49.99
   ├─ planId: 'gold'
   └─ status: 'completed'

2. UserProfile (already created earlier)
3. JobSeeker (already created earlier)

4. Subscription (NOW CAN BE CREATED)
   ├─ seekerId: (JobSeeker.userId)
   ├─ plan: 'gold_bimonthly'
   ├─ status: 'active'
   └─ externalPaymentId: 'cmn...' (links to ExternalPayment)
```

All foreign key constraints are satisfied! ✅

---

## Testing

Now when you test the flow:

```
1. Complete onboarding
2. Select package → "Flex Gold"
3. Go to checkout
4. Pay with Stripe test card: 4242 4242 4242 4242
5. After payment...

Expected logs (NEW):
✅ PROCESS-PAYMENT: Creating external payment record
✅ PROCESS-PAYMENT: External payment created: { id: 'cmn...', amount: 49.99, ... }
✅ PROCESS-PAYMENT: Subscription created: { ... }
🎉 ONBOARDING: Redirected to dashboard

6. Verify in database:
  - ExternalPayment: 1 record created
  - Subscription: 1 record created, linked to ExternalPayment
```

---

## Why This Matters

The `ExternalPayment` table is the **payment tracking table** that records all payments (Stripe, PayPal, Authorize.net, etc.).

By creating a record here, you:

1. **Track the payment** for auditing/reports
2. **Satisfy foreign key constraints** for linked tables
3. **Maintain data integrity** in the database
4. **Have a record** of all transactions across payment processors

This is how the system is designed - each payment must be recorded in `ExternalPayment` first, then referenced by subscriptions, refunds, etc.

---

## Status

✅ **Fixed and Committed**

The payment flow should now complete successfully:

- Profile created ✅
- Subscription created ✅
- ExternalPayment recorded ✅
- User redirected to dashboard ✅

Test it now with your Stripe test credentials!
