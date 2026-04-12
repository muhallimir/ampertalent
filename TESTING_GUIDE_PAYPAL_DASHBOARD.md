# Quick Testing Guide: PayPal & Dashboard Fixes

## Prerequisites

- App running locally: `npm run dev`
- User signed in with Clerk
- Test Stripe card: `4242 4242 4242 4242`
- Test PayPal account available

---

## Test 1: Stripe Payment Flow ⚡

### Steps

1. Go to `http://localhost:3000/onboarding`
2. Complete the onboarding form:
   - Select **Seeker** role
   - Enter name, location
   - Fill additional details
   - Add professional summary
3. Select **"Flex Gold"** package ($49.99)
4. Click **"Proceed to Checkout"**
5. In checkout page, click **"Stripe"** tab
6. Click **"Pay with Card"** button
7. Enter test card: `4242 4242 4242 4242` (any exp date/CVC)
8. Click **"Pay"**

### Expected Results

✅ Loading overlay appears with message:

- "Completing Your Onboarding"
- "We're setting up your profile and activating your subscription..."

✅ Redirects to `/seeker/dashboard?welcome=true`

✅ Dashboard displays:

- Applications count
- Recommended jobs
- Saved jobs count
- Recent activities
- No error message

✅ Database shows:

- User profile created
- Job seeker record created
- External payment record with $49.99
- Subscription record with plan "gold_bimonthly"

---

## Test 2: PayPal Payment Flow 🅿️

### Steps

1. Go to `http://localhost:3000/onboarding` (or sign in as new user)
2. Complete the onboarding form:
   - Select **Seeker** role
   - Enter name, location
   - Fill additional details
   - Add professional summary
3. Select **"Flex VIP"** package ($79.99)
4. Click **"Proceed to Checkout"**
5. In checkout page, click **"PayPal"** tab
6. Click **"PayPal Approve Payment"** button
7. Complete PayPal authentication (use test account or sandbox)
8. Click **"Approve"** on PayPal

### Expected Results

✅ Redirects back to `/onboarding` with payment params

✅ Loading overlay appears immediately

✅ Redirects to `/seeker/dashboard?welcome=true`

✅ Dashboard displays all data correctly:

- Applications count
- Recommended jobs
- Saved jobs count
- Recent activities

✅ Database shows:

- User profile created
- Job seeker record created
- External payment record with $79.99
- Subscription record with plan "vip_quarterly"

---

## Test 3: Dashboard Data Loading ✅

### Steps

1. Complete either Stripe or PayPal payment (from Tests 1 or 2)
2. Wait for redirect to dashboard
3. Verify all data sections load:
   - Application stats
   - Job recommendations
   - Saved jobs
   - Recent activities
   - Membership status

### Expected Results

✅ No "Failed to load dashboard data" error

✅ Dashboard shows relevant stats

✅ Page loads within 2-3 seconds

✅ Recommended jobs list displays jobs with:

- Title
- Company name
- Pay range
- Skills required

---

## Test 4: Error Scenarios 🔧

### Test 4a: Invalid Stripe Card

1. Go through Stripe payment flow
2. Use invalid card: `4000 0000 0000 0002`
3. Expected: Payment fails, error message shown

### Test 4b: PayPal Cancellation

1. Go through PayPal payment flow
2. Click **Cancel** on PayPal page
3. Expected: Return to checkout page, error message shown

### Test 4c: Dashboard Without Payment

1. Sign in as existing seeker (without going through payment)
2. Navigate to `/seeker/dashboard`
3. Expected: Dashboard loads with stats, no payment/onboarding overlay

---

## Server Logs to Monitor

### Stripe Success Handler

```
🔄 STRIPE-SUCCESS: Received request: {
  fullUrl: 'http://localhost:3000/api/payments/stripe-success?...',
  sessionId: 'cs_test_...',
  pendingSignupId: 'cmn...'
}

⏳ STRIPE-SUCCESS: Profile not found, redirecting to onboarding for completion
```

### PayPal Success Handler

```
🔄 PAYPAL-SUCCESS: Received request: {
  fullUrl: 'http://localhost:3000/api/payments/paypal-success?...',
  transactionId: 'BA-123456789',
  pendingSignupId: 'cmn...'
}

⏳ PAYPAL-SUCCESS: Profile not found, redirecting to onboarding for completion
```

### Onboarding Payment Processing

```
💳 ONBOARDING: Payment success detected {
  paymentMethod: 'stripe' or 'paypal',
  paymentId: 'cs_test_...' or 'BA-123456789',
  pendingSignupId: 'cmn...'
}

💾 ONBOARDING: Completing onboarding profile...
✅ ONBOARDING: Onboarding profile completed successfully

💳 ONBOARDING: Processing payment to create subscription...
✅ PROCESS-PAYMENT: Subscription created successfully: {
  subscriptionId: 'cmn...',
  plan: 'gold_bimonthly',
  seekerId: 'cmn...'
}

🎉 ONBOARDING: Payment complete, redirecting to dashboard
```

### Dashboard Stats Loading

```
Loading seeker dashboard stats...

✓ Compiled successfully
✓ Finished collecting data
```

---

## Debugging Tips

### Issue: Payment success handler not redirecting

1. Check logs for `STRIPE-SUCCESS` or `PAYPAL-SUCCESS`
2. Verify `pendingSignupId` is being passed
3. Check if pending signup exists in database:
   ```sql
   SELECT * FROM pending_signups WHERE id = 'cmn...';
   ```

### Issue: Dashboard shows error

1. Check `/api/seeker/dashboard/stats` response in network tab
2. Verify user has jobSeeker profile:
   ```sql
   SELECT * FROM job_seekers WHERE user_id = 'cmn...';
   ```
3. Check server logs for query failures

### Issue: Loading overlay doesn't disappear

1. Check if onboarding complete API returns successfully
2. Check if payment processing returns successfully
3. Verify router.push() is being called
4. Check browser console for JavaScript errors

---

## Success Indicators ✅

### After Stripe Payment

- [ ] Loading overlay appears
- [ ] Dashboard loads without errors
- [ ] Welcome message displays
- [ ] All dashboard sections populated
- [ ] Can navigate to other seeker pages

### After PayPal Payment

- [ ] Redirects to onboarding first
- [ ] Loading overlay appears
- [ ] Dashboard loads without errors
- [ ] Welcome message displays
- [ ] All dashboard sections populated
- [ ] Can navigate to other seeker pages

### Database Integrity

- [ ] UserProfile created
- [ ] JobSeeker created
- [ ] ExternalPayment created with correct amount
- [ ] Subscription created with correct plan
- [ ] Subscription.externalPaymentId references ExternalPayment.id

---

## Rollback Instructions

If issues occur:

```bash
# Revert last commits
git log --oneline -5

# Revert specific commits if needed
git revert <commit-hash>

# Or reset to previous state
git reset --hard <previous-commit-hash>
```

---

## Contact & Support

For issues or questions:

1. Check the detailed documentation in `PAYPAL_AND_DASHBOARD_FIX.md`
2. Review server logs for specific error messages
3. Verify all environment variables are set correctly
4. Check database connectivity
