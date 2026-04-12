# Stripe Payment E2E Testing Guide - Complete Flow

## Issue Fixed

**Problem**: After successful Stripe payment, the profile was not being created because onboarding data was incomplete/empty when the payment redirect handler tried to use it.

**Root Cause**: The pending signup created during checkout had incomplete `onboardingData` (missing firstName, lastName, location), causing the profile creation endpoint to fail with "Missing required fields".

**Solution**: When Stripe redirects back after payment:
1. Verify the payment was actually made via Stripe API
2. If user profile doesn't exist yet, redirect to onboarding with payment success indicators
3. On onboarding page, fetch the pending signup data and use placeholder values (from Clerk user or defaults) if data is missing
4. Create the profile with the data (whether complete or with placeholders)
5. Create the subscription
6. Redirect to dashboard

---

## Testing Steps

### Prerequisites
- Stripe credentials configured in `.env` (already done: `sk_test_51THO9s...`, `pk_test_51THO9s...`)
- Dev server running: `npm run dev` on port 3000
- Signed in to Clerk in your app

### Manual End-to-End Test

#### Step 1: Start Onboarding
```
1. Clear browser localStorage: Open DevTools → Application → Clear All
2. Navigate to: http://localhost:3000/onboarding
3. Select role: "Seeker"
4. Click "Continue"
```

#### Step 2: Fill Onboarding Form
```
5. Fill in Basic Info:
   - First Name: "Test"
   - Last Name: "Seeker"
   - Location: "Remote"
6. Click "Continue"
```

#### Step 3: Skip Optional Steps
```
7. Click "Skip" for Experience, Skills, Goals (can skip these for testing)
8. Reach "Select Package" step
```

#### Step 4: Select Package and Proceed to Checkout
```
9. Select "Flex Gold" ($49.99)
10. Click "Continue to Checkout"
11. Verify you're redirected to /checkout page with:
    - planId=gold
    - pendingSignupId=cmn... (some ID)
    - totalPrice=49.99
```

#### Step 5: Choose Stripe as Payment Method
```
12. On /checkout page, click "Stripe" tab
13. Click "Pay with Stripe" or "Pay $49.99"
14. Redirected to Stripe hosted checkout page (https://checkout.stripe.com/...)
```

#### Step 6: Complete Stripe Payment
```
15. On Stripe checkout, fill in:
    - Card Number: 4242 4242 4242 4242
    - Expiry: 12/25
    - CVC: 123
    - Cardholder Name: Test Seeker
    - Email: your email
16. Click "Pay $49.99"
17. Wait for payment processing...
```

#### Step 7: Verify Redirect & Profile Creation
```
Expected flow:
1. Stripe processes payment
2. Browser redirects to: /api/payments/stripe-success?session_id=cs_test_...&pendingSignupId=cmn...
3. API verifies payment with Stripe
4. Since profile doesn't exist, redirects to: /onboarding?payment_status=success&sessionId=cs_test_...&pendingSignupId=cmn...
5. Onboarding page detects payment_status=success
6. Fetches pending signup data
7. Creates UserProfile with name from pending signup or Clerk user
8. Creates Subscription for the plan
9. Redirects to: /seeker/dashboard?welcome=true
10. Dashboard displays welcome message and subscription info
```

---

## Verification Checklist

### In Browser Console
After payment completes, check the console logs for:

```
✅ STRIPE-SUCCESS: Received request: {...}
⏳ STRIPE-SUCCESS: Profile not found, redirecting to onboarding for completion
💳 ONBOARDING: Payment success detected...
🔍 ONBOARDING: Fetching pending signup by ID...
✅ ONBOARDING: Pending signup saved with data...
💾 ONBOARDING: Completing onboarding profile...
✅ ONBOARDING: Onboarding profile completed successfully
💳 ONBOARDING: Processing Stripe payment to create subscription...
✅ ONBOARDING: Subscription created successfully
🎉 ONBOARDING: Payment complete, redirecting to dashboard
```

### In Database (Supabase)
Verify the following records were created:

1. **UserProfile**:
   - clerkUserId: Your Clerk user ID
   - name: "Test Seeker" (or whatever you entered)
   - role: "seeker"

2. **JobSeeker**:
   - userId: UserProfile.id
   - membershipPlan: "gold_bimonthly" (for gold package)
   - status: "active"

3. **Subscription**:
   - seekerId: JobSeeker.userId
   - plan: "gold_bimonthly"
   - status: "active"
   - stripeSessionId: Matches the Stripe session ID from payment

### On Dashboard
After redirect to dashboard:
```
✓ Page shows "Welcome!" message
✓ User info section shows correct name
✓ Current subscription shows: "Flex Gold" plan
✓ Subscription end date is 3 months from today (for gold plan)
✓ No errors in console
```

---

## PayPal Testing (Similar Flow)

The PayPal flow follows the same pattern:

```
1. Onboarding → Select Package → Checkout
2. Click "PayPal" tab
3. Click "Approve and Pay"
4. PayPal popup (or redirect in sandbox mode)
5. Approve payment
6. Redirect to /seeker/subscription/paypal-return?...
7. (Similar verification happens)
8. Redirect to dashboard
```

---

## Troubleshooting

### "Profile not found" loops
- Check browser console for error messages
- Ensure pending signup has onboardingData saved
- Check database that pendingSignup exists before payment

### "Missing required fields" error
- This is now handled with placeholder values
- Check console for: "Pending signup data incomplete, using defaults"
- Profile should still be created with "User" as default first name

### Profile created but subscription not created
- Check the `process-payment` endpoint logs
- Verify Stripe session ID is correct
- Verify plan mapping in `planIdToMembershipPlan`

### Stuck on onboarding after payment
- Check that `payment_status=success` is in the URL
- Verify `sessionId` and `pendingSignupId` params are present
- Check console logs for where the flow stops

---

## Key Changes Made

1. **New Route**: `/api/payments/stripe-success`
   - Handles Stripe payment success redirects
   - Verifies payment status
   - Orchestrates profile creation

2. **Updated Route**: `/api/payments/stripe-checkout`
   - Changed success_url to use `/api/payments/stripe-success`

3. **New Route**: `/api/onboarding/pending-signup/[id]`
   - Allows fetching pending signup by ID (instead of just "latest")
   - Used during payment flow to get the exact pending signup

4. **Updated**: `/app/onboarding/page.tsx`
   - Added logic to detect payment success in URL
   - Attempts to fetch pending signup by ID first, then falls back to latest
   - Uses placeholder values if onboarding data is incomplete
   - Creates profile and subscription in sequence

---

## Next Steps

1. **Test the flow manually** following the steps above
2. **Verify database records** are created correctly
3. **Check all console logs** for any errors
4. **Test PayPal flow** similarly
5. **Test with different plan IDs** (trial, gold, vip-platinum, annual-platinum)
6. **Test cancellation** at various payment stages to ensure proper cleanup

If you encounter any issues, check the console logs for detailed error messages and let me know what you see!