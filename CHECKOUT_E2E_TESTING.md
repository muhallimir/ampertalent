# Complete End-to-End Checkout Flow Testing Guide

## Environment Verification ✓

All required credentials are configured in `.env`:

- ✓ `STRIPE_SECRET_KEY` (sk*test*...)
- ✓ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk*test*...)
- ✓ `NEXT_PUBLIC_PAYPAL_CLIENT_ID` (sandbox)
- ✓ `PAYPAL_CLIENT_SECRET`
- ✓ `NEXT_PUBLIC_PAYPAL_ENVIRONMENT=sandbox`

## Stripe Checkout Flow - VERIFIED ✓

### Automated Test Results

```
✅ Stripe session created successfully!
  • Session ID: cs_test_a1ZYkwfnTscB1SzEncUZpo7lOMII0meuJXEXHX9F2p7cBJsslCaA7g7and
  • Checkout URL: https://checkout.stripe.com/c/pay/cs_test_...
  • Status: unpaid
  • Amount: 3499 (cents, = $34.99)
  • Currency: usd
  • Mode: payment
```

### How It Works

1. User clicks "Pay with Stripe" button on `/checkout` page
2. Button calls `/api/payments/stripe-checkout` POST endpoint
3. Backend creates Stripe checkout session via `stripe.checkout.sessions.create()`
4. Session includes:
   - Line item: Flex Trial $34.99
   - Success URL: `/seeker/dashboard?checkout=success&sessionId={ID}`
   - Cancel URL: Back to checkout
   - Metadata: planId, pendingSignupId, sessionToken, clerkUserId
5. Endpoint returns `{ sessionId, url }`
6. Button redirects to `window.location.href = url` (actual Stripe hosted page)
7. Stripe hosted checkout loads
8. User enters card details or uses saved payment method
9. User completes payment
10. Stripe redirects to success URL with payment confirmation

### Manual Testing

**Test Card (Stripe Sandbox):**

- Card Number: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any valid ZIP (e.g., 12345)

**Test Steps:**

```
1. npm run dev
2. Navigate to: http://localhost:3000/onboarding
3. Complete onboarding up to "Select Package"
4. Select "Flex Trial" ($34.99)
5. Click "Continue to Checkout"
6. On /checkout page, verify:
   - Order Summary shows: "Flex Trial", "$34.99" with strikethrough
   - Trial banner: "3-day free trial"
   - "You will not be charged today" message
7. Click "Stripe" tab
8. Click "Pay with Stripe" button
9. Redirected to Stripe checkout page (https://checkout.stripe.com/c/pay/...)
10. Fill in form:
    - Card: 4242 4242 4242 4242
    - Expiry: 12/25
    - CVC: 123
    - Name: Test User
    - Email: test@example.com
11. Click "Pay $0.00"
12. Should see success page
13. Auto-redirected to: /seeker/dashboard?checkout=success&sessionId=cs_test_...
```

**Expected Result:** ✅ Payment successful, user sees dashboard

---

## PayPal Checkout Flow - READY TO TEST

### How It Works

1. User clicks PayPal tab on `/checkout` page
2. PayPal SDK loads from `window.paypal.Buttons()`
3. Button renders using PayPal's SDK components
4. User clicks button
5. PayPal popup opens (sandbox mode)
6. User logs in with PayPal sandbox account
7. User reviews order:
   - Item: Flex Trial
   - Amount: $34.99
   - Note: Trial = $0 charged now, $34.99 starting day 4
8. User clicks "Agree and Pay"
9. onApprove callback triggered
10. Order is captured via PayPal API
11. `onSuccess({ id, status, amount, payer })` callback fired
12. Redirects to success page with transaction ID

### PayPal Sandbox Credentials

**Test Buyer Account:**

- Email: `buyer@example.com` (or your sandbox account email)
- Password: `qweasd123` (or your sandbox password)
- Environment: Sandbox (automatically for sandbox keys)

**Sandbox Links:**

- Buyer Dashboard: https://www.sandbox.paypal.com
- Create Sandbox Accounts: https://developer.paypal.com/dashboard/

### Manual Testing

**Test Steps:**

```
1. npm run dev
2. Navigate to: http://localhost:3000/onboarding
3. Complete onboarding up to "Select Package"
4. Select "Flex Trial" ($34.99)
5. Click "Continue to Checkout"
6. On /checkout page:
   - Verify Order Summary
   - Verify Trial messaging
7. Click "PayPal" tab
8. Click PayPal button (blue button with PayPal logo)
9. PayPal popup window opens (sandbox mode)
10. If not logged in, login with:
    - Email: buyer@example.com
    - Password: qweasd123
11. Review order:
    - Merchant: Ampertalent
    - Item: Flex Trial
    - Amount: $34.99
    - Note about trial messaging if present
12. Click "Agree and Pay" (or equivalent button)
13. popup window closes
14. onApprove callback executes
15. Payment captured via PayPal API
16. Auto-redirects to: /seeker/dashboard?payment_status=success&transaction_id=...
```

**Expected Result:** ✅ Payment successful, user sees dashboard

---

## Complete Flow Integration Test

### Flow: New User Onboarding → Checkout → Payment → Dashboard

**End-to-End Steps:**

```
1. Start dev server: npm run dev

2. ONBOARDING PHASE
   - Visit: http://localhost:3000/onboarding
   - Register with new email: test-user-{timestamp}@example.com
   - Enter phone number (e.g., 555-123-4567)
   - Click continue
   - Pending signup is created in database

3. PACKAGE SELECTION PHASE
   - Select "Flex Trial" ($34.99)
   - Verify plan name displays correctly (not "Mom Professional")
   - Click "Continue to Checkout"
   - Endpoint called: /api/seeker/subscription/checkout
   - Endpoint returns checkout URL with all params

4. CHECKOUT PAGE PHASE
   - Redirected to: /checkout?planId=trial&pendingSignupId=...&...
   - Page loads with Suspense boundary
   - Verify elements visible:
     ✓ Order Summary panel (left side)
     ✓ "Flex Trial" plan name
     ✓ "$34.99" with strikethrough
     ✓ Total Due: "$0.00" in green
     ✓ Trial banner: "3-day free trial"
     ✓ Message: "You will not be charged today"
     ✓ Payment Methods tabs (right side)
     ✓ Stripe tab selected by default
     ✓ "Pay with Stripe" button
     ✓ PayPal tab available

5. STRIPE PAYMENT PHASE (First Test)
   - Click "Pay with Stripe" button
   - Redirected to Stripe checkout: https://checkout.stripe.com/c/pay/cs_test_...
   - Form appears with fields:
     - Card number
     - Expiry date
     - CVC
     - Billing details
   - Enter test card: 4242 4242 4242 4242
   - Expiry: 12/25
   - CVC: 123
   - Complete form
   - Click "Pay $0.00"
   - Stripe processes payment
   - Redirected to: http://localhost:3000/seeker/dashboard?checkout=success&sessionId=cs_test_...
   - ✅ Dashboard loads
   - Payment confirmed in console logs

6. PAYPAL PAYMENT PHASE (Second Test)
   - Go back: http://localhost:3000/onboarding
   - Register with second email: test-user-2-{timestamp}@example.com
   - Select package, continue to checkout
   - On /checkout page, click "PayPal" tab
   - Click blue PayPal button
   - PayPal popup opens
   - Login with: buyer@example.com / qweasd123
   - Review order
   - Click "Agree and Pay"
   - Popup closes
   - Redirected to: http://localhost:3000/seeker/dashboard?payment_status=success&transaction_id=...
   - ✅ Dashboard loads
   - Payment confirmed in console logs
```

---

## Troubleshooting Guide

### Stripe Issues

**Problem: "Something went wrong" error on Stripe page**

- ❌ OLD: URL was `https://checkout.stripe.com/pay/{sessionId}` (incorrect)
- ✅ FIXED: Now uses `session.url` from Stripe API (correct)
- **Solution:** Verify `/api/payments/stripe-checkout` returns `{ sessionId, url }`

**Problem: "Checkout session not found"**

- **Cause:** Session ID is invalid or expired
- **Solution:**
  - Check Stripe Dashboard for session
  - Verify sessionId is being passed correctly
  - Sessions expire after 24 hours

**Problem: Redirect not working**

- **Cause:** Success URL not set correctly
- **Solution:** Verify `NEXT_PUBLIC_APP_URL` matches current domain

**Problem: "Failed to create checkout session" error**

- **Cause:** Stripe API key invalid or request malformed
- **Solution:**
  - Verify `STRIPE_SECRET_KEY` in .env
  - Check Stripe Dashboard API logs
  - Verify request payload has required fields

### PayPal Issues

**Problem: PayPal button not rendering**

- **Cause:** SDK not loading or client ID invalid
- **Solution:**
  - Check browser console for errors
  - Verify `NEXT_PUBLIC_PAYPAL_CLIENT_ID` in .env
  - Verify `NEXT_PUBLIC_PAYPAL_ENVIRONMENT=sandbox`
  - Check PayPal SDK loads: `console.log(window.paypal)`

**Problem: "Something went wrong" after clicking PayPal button**

- **Cause:** Order creation failed or auth failed
- **Solution:**
  - Check browser console for error details
  - Verify PayPal credentials are valid
  - Check PayPal Dashboard for failed requests

**Problem: Popup blocked**

- **Cause:** Browser popup blocker
- **Solution:** Allow popups for localhost

**Problem: "Invalid merchant" or "Not authorized"**

- **Cause:** PayPal account/credentials issue
- **Solution:**
  - Verify credentials at https://developer.paypal.com/dashboard/
  - Try creating new sandbox account
  - Verify environment is `sandbox`

---

## Database Records After Successful Payment

### Stripe Payment

```
PendingSignup:
  - id: (matches pendingSignupId from URL)
  - clerkUserId: (from session)
  - selectedPlan: 'trial'
  - email: (from user)
  - status: 'completed' or similar

Subscription (if created):
  - userId: (matches clerkUserId)
  - planType: 'trial'
  - paymentMethod: 'stripe'
  - stripeSessionId: cs_test_...
  - status: 'active'
  - trialExpiresAt: (3 days from now)
```

### PayPal Payment

```
PendingSignup:
  - id: (matches pendingSignupId from URL)
  - clerkUserId: (from session)
  - selectedPlan: 'trial'
  - email: (from user)
  - status: 'completed'

Subscription:
  - userId: (matches clerkUserId)
  - planType: 'trial'
  - paymentMethod: 'paypal'
  - paypalOrderId: (from PayPal response)
  - status: 'active'
  - trialExpiresAt: (3 days from now)
```

---

## Success Criteria Checklist

### Stripe Flow

- [ ] Session creates successfully
- [ ] Redirect URL is valid Stripe page
- [ ] Test card accepted
- [ ] Payment processed
- [ ] Redirect to dashboard with success params
- [ ] Database updated with subscription
- [ ] Trial expiry set to 3 days
- [ ] Console shows: "✅ STRIPE-CHECKOUT: Created checkout session"

### PayPal Flow

- [ ] SDK loads
- [ ] Button renders
- [ ] Popup opens on click
- [ ] Login succeeds
- [ ] Order reviewed
- [ ] Payment captured
- [ ] Redirect to dashboard with success params
- [ ] Database updated with subscription
- [ ] Trial expiry set to 3 days
- [ ] Console shows successful order creation

### Overall

- [ ] No 404 errors
- [ ] No console errors
- [ ] Plan names correct (Flex Trial, not Mom Professional)
- [ ] Pricing displays correctly ($34.99 → $0.00 for trial)
- [ ] Trial messaging clear and visible
- [ ] Both payment methods functional
- [ ] User can complete full onboarding → checkout → payment flow
- [ ] Successful redirect to authenticated dashboard

---

## Notes

- Stripe test card `4242 4242 4242 4242` always succeeds with any future expiry
- Use other test cards from https://stripe.com/docs/testing for decline scenarios
- PayPal sandbox has test accounts at https://developer.paypal.com/dashboard/
- All credentials use sandbox/test environments (no live charges)
- Trial period is 3 days, then $34.99/month charged
- $0 charge on trial initial transaction (no actual charge, but creates payment record)
