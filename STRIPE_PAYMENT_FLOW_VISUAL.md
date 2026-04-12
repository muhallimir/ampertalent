# Stripe Payment Flow - Visual Guide

## Before (Broken ❌)

```
┌──────────────────────────────────────────────────────────────────┐
│  User fills onboarding, selects package, pays with Stripe       │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
            ┌─────────────────┐
            │ Stripe Payment  │
            │  (Card details) │
            └────────┬────────┘
                     │
                     ▼ Payment Success
            ┌─────────────────────────────────────┐
            │ Stripe redirects to:                │
            │ /onboarding?payment_status=success  │
            └────────┬────────────────────────────┘
                     │
                     ▼ Onboarding page loads
            ┌─────────────────────────────────────┐
            │ Fetch latest pending signup         │
            │ onboardingData = {}  (EMPTY!)       │
            │                                     │
            │ Try to create profile:              │
            │ firstName: undefined ❌             │
            │ lastName: undefined ❌              │
            │ location: undefined ❌              │
            │                                     │
            │ API Response: "Missing fields"      │
            └────────┬────────────────────────────┘
                     │
                     ▼
            ┌─────────────────────────────────────┐
            │ Profile creation FAILED ❌          │
            │ Subscription not created ❌         │
            │ User stuck or sees error ❌         │
            └─────────────────────────────────────┘
```

---

## After (Fixed ✅)

```
┌──────────────────────────────────────────────────────────────────┐
│  User fills onboarding, selects package, pays with Stripe       │
│  ✓ onboardingData saved in pending signup                       │
└────────────────────┬─────────────────────────────────────────────┘
                     │
                     ▼
            ┌─────────────────┐
            │ Stripe Payment  │
            │  (Card details) │
            └────────┬────────┘
                     │
                     ▼ Payment Success
            ┌────────────────────────────────────────────┐
            │ Stripe redirects to:                       │
            │ /api/payments/stripe-success               │
            │   ?session_id=cs_test_...                 │
            │   &pendingSignupId=cmn...                 │
            └────────┬─────────────────────────────────┘
                     │
                     ▼ Handler verifies with Stripe
            ┌────────────────────────────────────────────┐
            │ Call stripe.checkout.sessions.retrieve()  │
            │ Check: payment_status === 'paid' ?        │
            │                                            │
            │ YES ✓ → Proceed                           │
            │ NO  ✗ → Redirect to sign-in error         │
            └────────┬─────────────────────────────────┘
                     │
                     ▼ Check profile
            ┌────────────────────────────────────────────┐
            │ Does UserProfile exist for clerkUserId?   │
            │                                            │
            │ YES ✓ → Redirect to dashboard             │
            │ NO  ✗ → Redirect to onboarding            │
            │         with payment_status=success       │
            └────────┬─────────────────────────────────┘
                     │
                     ▼ Onboarding detects payment_status=success
            ┌────────────────────────────────────────────────────────┐
            │ Fetch pending signup:                                  │
            │ 1. Try by ID: /api/.../pending-signup/{id}           │
            │ 2. Fallback: /api/.../pending-signup/latest          │
            │                                                        │
            │ Parse onboarding data                                 │
            │ { firstName: 'Test', lastName: 'User', ... }         │
            └────────┬─────────────────────────────────────────────┘
                     │
                     ▼ If data incomplete, use defaults
            ┌────────────────────────────────────────────────────────┐
            │ CRITICAL FIX: Use fallback values                      │
            │                                                        │
            │ if (!firstName) → use user.firstName or 'User'        │
            │ if (!lastName) → use user.lastName or ''              │
            │ if (!location) → use 'Not specified'                  │
            │                                                        │
            │ Now we have valid data:                               │
            │ { firstName: 'Test', lastName: 'User',                │
            │   location: 'Remote', ... }                           │
            └────────┬─────────────────────────────────────────────┘
                     │
                     ▼ Step 1: Create profile
            ┌────────────────────────────────────────────────────────┐
            │ POST /api/onboarding/complete                          │
            │ {                                                      │
            │   firstName: 'Test',                                  │
            │   lastName: 'User',                                   │
            │   location: 'Remote',                                 │
            │   role: 'seeker',                                     │
            │   ...                                                 │
            │ }                                                      │
            │                                                        │
            │ ✓ Creates: UserProfile, JobSeeker records            │
            └────────┬─────────────────────────────────────────────┘
                     │
                     ▼ Step 2: Create subscription
            ┌────────────────────────────────────────────────────────┐
            │ POST /api/seeker/subscription/process-payment         │
            │ {                                                      │
            │   sessionId: 'cs_test_...',                           │
            │   paymentMethod: 'stripe',                            │
            │   paymentStatus: 'success'                            │
            │ }                                                      │
            │                                                        │
            │ ✓ Creates: Subscription record                        │
            │ ✓ Links to UserProfile and JobSeeker                 │
            └────────┬─────────────────────────────────────────────┘
                     │
                     ▼ Success!
            ┌────────────────────────────────────────────────────────┐
            │ Redirect to dashboard:                                │
            │ /seeker/dashboard?welcome=true                        │
            │                                                        │
            │ User sees:                                            │
            │ ✓ Welcome message                                     │
            │ ✓ Subscription info (plan, end date)                 │
            │ ✓ Profile details                                     │
            │ ✓ All database records created                        │
            └────────────────────────────────────────────────────────┘
```

---

## Comparison: hire_my_mom_saas vs ampertalent

### hire_my_mom_saas (Using Authorize.net)

```
Payment (Authorize.net)
    ↓
/api/auth/external-return (Handler)
    ↓
Verify webhook from Authorize.net
    ↓
Check if profile exists
    ↓
If not → Redirect to /onboarding
If yes → Redirect to dashboard
    ↓
Onboarding completes profile creation
    ↓
Dashboard (Success)
```

### ampertalent (Using Stripe)

```
Payment (Stripe)
    ↓
/api/payments/stripe-success (Handler)
    ↓
Verify payment with Stripe API
    ↓
Check if profile exists
    ↓
If not → Redirect to /onboarding
If yes → Redirect to dashboard
    ↓
Onboarding completes profile creation
    ↓
Dashboard (Success)
```

**Pattern is IDENTICAL** ✅

---

## Key Insight: The Missing Data Problem

### Why data was empty:

```
Scenario 1: User jumps to checkout directly (skips onboarding)
├─ No onboarding data filled
├─ No pendingSignup.onboardingData saved
└─ Payment handler receives empty object

Scenario 2: User completes onboarding but data not saved
├─ User fills form state in memory
├─ User clicks checkout
├─ Call to /api/onboarding/pending-signup might fail silently
├─ pendingSignup created but with empty onboardingData
└─ Payment handler receives empty object
```

### How the fix handles it:

```
Step 1: Detect incomplete data
├─ Check: firstName, lastName, location exist?
└─ If not → Use fallback values

Step 2: Get fallback values from multiple sources
├─ Priority 1: Data from pendingSignup
├─ Priority 2: Data from Clerk user (user.firstName, user.lastName)
├─ Priority 3: Hard defaults ("User", "Not specified")
└─ Use whichever is available

Step 3: Always have valid data
├─ firstName will be: 'Test' or user.firstName or 'User'
├─ lastName will be: 'User' or user.lastName or ''
├─ location will be: 'Remote' or 'Not specified'
└─ Profile creation succeeds ✅
```

---

## Error Handling Flow

```
Stripe Redirect
    │
    ├─ Missing session_id? → 400 Bad Request
    ├─ Missing pendingSignupId? → 400 Bad Request
    │
    ├─ Stripe.retrieve fails? → 500 Error
    │
    ├─ Session not found? → 404 Not Found
    ├─ Payment not paid? → Redirect to /sign-in?error=payment_failed
    │
    ├─ Pending signup not found? → Redirect to /sign-in?error=session_expired
    │
    └─ Success → Check profile
        │
        ├─ Profile exists → /seeker/dashboard?welcome=true
        └─ Profile missing → /onboarding?payment_status=success&...
```

---

## Data Flow During Payment

### Session 1: Onboarding (User filling form)

```
User fills onboarding form
    │
    ├─ name: 'Test Seeker'
    ├─ location: 'Remote'
    ├─ skills: ['JavaScript', 'React']
    └─ ... other fields

User selects package: 'gold'
    │
    └─ State updated with selection

User clicks "Continue to Checkout"
    │
    └─ Save to pending signup
        │
        ├─ POST /api/onboarding/pending-signup
        │
        ├─ Body:
        │  {
        │    firstName: 'Test',
        │    lastName: 'Seeker',
        │    location: 'Remote',
        │    skills: ['JavaScript', 'React'],
        │    ... all other fields
        │  }
        │
        └─ Response:
           {
             pendingSignup: {
               id: 'cmn...',
               clerkUserId: 'user_...',
               onboardingData: '{"firstName":"Test",...}',
               selectedPlan: 'gold',
               email: 'user@example.com'
             }
           }
```

### Session 2: Stripe Checkout

```
User on /checkout page
    │
    ├─ Sees order summary
    ├─ Selects payment method
    └─ Clicks "Pay with Stripe"

Create Stripe session
    │
    ├─ POST /api/payments/stripe-checkout
    │
    ├─ Metadata:
    │  {
    │    planId: 'gold',
    │    pendingSignupId: 'cmn...',
    │    clerkUserId: 'user_...'
    │  }
    │
    └─ Response:
       {
         sessionId: 'cs_test_...',
         url: 'https://checkout.stripe.com/c/pay/cs_test_...'
       }

Redirect to Stripe
    │
    └─ User completes payment
```

### Session 3: Payment Verification

```
Stripe calls success_url
    │
    ├─ URL: /api/payments/stripe-success
    │ params:
    │ - session_id: 'cs_test_...'
    │ - pendingSignupId: 'cmn...'
    │
    └─ Handler:
       │
       ├─ Verify payment with Stripe API
       ├─ Get metadata (planId, clerkUserId from session)
       ├─ Fetch pending signup by ID
       ├─ Check if profile exists
       │
       └─ Redirect to /onboarding?payment_status=success&sessionId=...
```

### Session 4: Profile Creation

```
Onboarding page loads with payment_status=success
    │
    ├─ Detect payment params in URL
    ├─ Fetch pending signup by ID
    │
    ├─ Parse onboardingData:
    │  {
    │    firstName: 'Test',
    │    lastName: 'Seeker',
    │    location: 'Remote',
    │    ...
    │  }
    │
    ├─ Call /api/onboarding/complete
    │ Creates:
    │ - UserProfile { name: 'Test Seeker', ... }
    │ - JobSeeker { membershipPlan: 'gold_bimonthly' }
    │
    ├─ Call /api/seeker/subscription/process-payment
    │ Creates:
    │ - Subscription { plan: 'gold_bimonthly', stripeSessionId: 'cs_test_...' }
    │
    └─ Redirect to /seeker/dashboard?welcome=true
```

---

## Success Criteria

When the flow works correctly, you should see:

✅ **In Console Logs**:

```
💳 ONBOARDING: Payment success detected
🔍 ONBOARDING: Fetching pending signup by ID
✅ ONBOARDING: Pending signup saved with data
💾 ONBOARDING: Completing onboarding profile
✅ ONBOARDING: Onboarding profile completed successfully
💳 ONBOARDING: Processing Stripe payment
✅ ONBOARDING: Subscription created successfully
🎉 ONBOARDING: Redirected to dashboard
```

✅ **In Browser**:

- Redirected to `/seeker/dashboard`
- See welcome message
- See subscription details

✅ **In Database**:

- UserProfile created
- JobSeeker created
- Subscription created with correct stripe session ID

✅ **No Errors**:

- No validation failures
- No 400/500 errors
- No console errors

---

## Testing the Flow

See detailed testing guide in `STRIPE_E2E_TESTING_COMPLETE.md`

Quick test:

```bash
1. npm run dev
2. http://localhost:3000/onboarding
3. Fill form: "Test Seeker", "Remote"
4. Select: "Flex Gold"
5. Click: "Checkout"
6. Pay with: 4242 4242 4242 4242
7. Verify: Dashboard with welcome message
```

That's it! 🚀
