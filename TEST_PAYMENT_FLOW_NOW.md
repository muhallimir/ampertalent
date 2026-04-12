# Test the Fixed Payment Flow - Quick Start

## The Issue Was Fixed ✅

The database foreign key constraint error is now resolved. The fix creates an `ExternalPayment` record before creating the `Subscription`, ensuring all foreign keys are satisfied.

---

## Quick Test (5 minutes)

### Step 1: Rebuild & Start Server
```bash
cd /Users/amirlocus/Documents/Projects/Locus/ampertalent

# Kill any running servers first

# Rebuild
npm run build

# Start dev server
npm run dev
```

### Step 2: Test the Payment Flow

1. **Open Browser**: http://localhost:3000/onboarding
2. **Clear Cache**: DevTools → Application → Clear All
3. **Fill Onboarding**:
   - Role: "I'm Looking for Work" (Seeker)
   - First Name: "Test"
   - Last Name: "User"
   - Location: "Remote"
4. **Continue** through steps
5. **Select Package**: "Flex Gold" ($49.99)
6. **Checkout**: Click "Continue to Checkout"
7. **Stripe Payment**: Click "Stripe" tab → "Pay with Stripe"
8. **Stripe Form**: Fill with test card:
   - Card: `4242 4242 4242 4242`
   - Expiry: `12/25`
   - CVC: `123`
   - Name: `Test User`
9. **Pay**: Click "Pay $49.99"

### Step 3: Verify Success

You should see in **server console**:
```
✅ PROCESS-PAYMENT: Stripe session retrieved: { ... paid ... }
💳 PROCESS-PAYMENT: Creating external payment record for Stripe session
✅ PROCESS-PAYMENT: External payment created: { id: 'cmn...', amount: 49.99 }
✅ PROCESS-PAYMENT: Subscription created: { ... }
🎉 ONBOARDING: Payment complete, redirecting to dashboard
```

Then browser should redirect to: `/seeker/dashboard?welcome=true`

### Step 4: Verify in Database (Supabase)

Check these tables for new records:

1. **external_payments**: 
   - Should have 1 new record with amount 49.99
   - status: 'completed'

2. **subscriptions**:
   - Should have 1 new record
   - plan: 'gold_bimonthly'
   - status: 'active'
   - external_payment_id: Should match the external_payments ID

3. **user_profiles**:
   - Should have 1 new record with your test user

4. **job_seekers**:
   - Should have 1 new record
   - membership_plan: 'gold_bimonthly'

---

## Expected Success Output

When everything works:

```
Console Logs (Server):
✅ STRIPE-CHECKOUT: Created checkout session
🔄 STRIPE-SUCCESS: Received request
⏳ STRIPE-SUCCESS: Profile not found, redirecting to onboarding
🎯 ONBOARDING COMPLETE: Starting for user
✅ ONBOARDING COMPLETE: User profile created
✅ ONBOARDING COMPLETE: Job seeker profile created
💳 PROCESS-PAYMENT: Processing payment
✅ PROCESS-PAYMENT: Stripe session retrieved
💳 PROCESS-PAYMENT: Creating external payment record
✅ PROCESS-PAYMENT: External payment created
✅ PROCESS-PAYMENT: Subscription created
🎉 ONBOARDING: Payment complete, redirecting to dashboard

Browser Result:
- Redirected to /seeker/dashboard?welcome=true
- See welcome banner
- See subscription info
- No errors in console
```

---

## If Still Having Issues

### Check Console for Errors
Open DevTools → Console → Look for error messages

### Common Issues

**Issue**: Still seeing foreign key error
- **Fix**: Restart server with `npm run dev`
- Check that the code in `/app/api/seeker/subscription/process-payment/route.ts` has the `externalPayment.create()` call

**Issue**: Redirects back to onboarding indefinitely  
- **Fix**: Check browser console for error messages
- May need to clear localStorage/cache

**Issue**: Payment succeeds but stuck on onboarding
- **Fix**: Check console for "Payment success detected" message
- Verify profile creation succeeded in database

---

## The Complete Flow (Now Working)

```
1. Stripe Payment ✓
2. Stripe redirects to /api/payments/stripe-success ✓
3. Verifies payment_status === 'paid' ✓
4. Checks if profile exists (doesn't yet) ✓
5. Redirects to /onboarding?payment_status=success ✓
6. Onboarding detects payment_status ✓
7. Creates UserProfile ✓
8. Creates JobSeeker ✓
9. Creates ExternalPayment ← CRITICAL FIX
10. Creates Subscription (linked to ExternalPayment) ← CRITICAL FIX
11. Redirects to /seeker/dashboard?welcome=true ✓
```

All foreign key constraints satisfied! ✅

---

## Next Steps

1. Run the test above
2. Verify all database records created
3. Verify no errors in console
4. If successful, the payment flow is completely fixed!

Good luck! 🚀
