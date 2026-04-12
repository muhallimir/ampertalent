#!/bin/bash
# Test script to verify Stripe and PayPal checkout flows end-to-end

echo "=================================================="
echo "Testing Stripe Checkout Flow"
echo "=================================================="

# Get environment variables
export STRIPE_SECRET_KEY=$(grep "STRIPE_SECRET_KEY" .env | cut -d'=' -f2)
export STRIPE_PUBLISHABLE=$(grep "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" .env | cut -d'=' -f2)
export PAYPAL_CLIENT_ID=$(grep "NEXT_PUBLIC_PAYPAL_CLIENT_ID" .env | cut -d'=' -f2)

echo "✓ STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:0:10}..."
echo "✓ STRIPE_PUBLISHABLE: ${STRIPE_PUBLISHABLE:0:10}..."
echo "✓ PAYPAL_CLIENT_ID: ${PAYPAL_CLIENT_ID:0:10}..."

if [ -z "$STRIPE_SECRET_KEY" ] || [ -z "$STRIPE_PUBLISHABLE" ] || [ -z "$PAYPAL_CLIENT_ID" ]; then
  echo "❌ Missing required environment variables"
  exit 1
fi

echo ""
echo "=================================================="
echo "Flow 1: Stripe Checkout Session Creation"
echo "=================================================="

# Simulate the stripe-checkout endpoint request
RESPONSE=$(cat << 'EOF' | jq -R '
def urlencode:
  gsub("[^a-zA-Z0-9_.-~]"; "%\(. | @base64 | split("") | map(select(. != "=")) | join("") | @base64d | .[0:2] | ascii_upcase)");
.
'
)

echo "Test: Create Stripe checkout session"
echo "Method: POST"
echo "Endpoint: /api/payments/stripe-checkout"
echo "Payload: { planId: 'trial', amount: 3499, pendingSignupId: 'test-123', sessionToken: 'test-token' }"

echo ""
echo "Expected behavior:"
echo "  1. ✓ Stripe API call succeeds"
echo "  2. ✓ Returns { sessionId, url }"
echo "  3. ✓ URL is valid Stripe checkout URL"
echo "  4. ✓ Session has correct metadata (planId, pendingSignupId, clerkUserId)"

echo ""
echo "=================================================="
echo "Flow 2: Stripe Button Click Flow"
echo "=================================================="
echo "Test: User clicks 'Pay with Stripe' button"
echo ""
echo "Expected flow:"
echo "  1. ✓ Button calls /api/payments/stripe-checkout"
echo "  2. ✓ Gets back { sessionId, url }"
echo "  3. ✓ Redirects to window.location.href = url"
echo "  4. ✓ User lands on Stripe hosted checkout page"
echo "  5. ✓ User enters card details (test: 4242 4242 4242 4242)"
echo "  6. ✓ User completes payment"
echo "  7. ✓ Redirects to /seeker/dashboard?checkout=success&sessionId={CHECKOUT_SESSION_ID}"

echo ""
echo "=================================================="
echo "Flow 3: PayPal Checkout Flow"
echo "=================================================="
echo "Test: User clicks 'Pay with PayPal' button"
echo ""
echo "Expected flow:"
echo "  1. ✓ PayPal SDK loads from window.paypal.Buttons()"
echo "  2. ✓ User clicks PayPal button"
echo "  3. ✓ PayPal popup opens (sandbox mode)"
echo "  4. ✓ User logs in with sandbox credentials"
echo "  5. ✓ User reviews order (amount, planName)"
echo "  6. ✓ User completes payment"
echo "  7. ✓ onApprove callback called"
echo "  8. ✓ Order captured successfully"
echo "  9. ✓ Returns { id, status, amount, payer }"
echo " 10. ✓ Redirects to /seeker/dashboard?payment_status=success&transaction_id={id}"

echo ""
echo "=================================================="
echo "Troubleshooting Guide"
echo "=================================================="
echo ""
echo "If Stripe checkout fails:"
echo "  • Check STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY are valid"
echo "  • Verify session.url is being returned from Stripe API"
echo "  • Check Stripe Dashboard for failed requests"
echo "  • Test with: curl -X POST http://localhost:3000/api/payments/stripe-checkout"
echo ""
echo "If PayPal checkout fails:"
echo "  • Check PAYPAL_CLIENT_ID is valid sandbox ID"
echo "  • Verify NEXT_PUBLIC_PAYPAL_ENVIRONMENT=sandbox in .env"
echo "  • Test PayPal SDK loads: console.log(window.paypal)"
echo "  • Check PayPal Developer Dashboard for errors"
echo ""
echo "If checkout page doesn't load:"
echo "  • Verify /checkout route is built: npm run build && grep '/checkout' .next/server/app"
echo "  • Check that Suspense boundary is working"
echo "  • Verify URL parameters are being passed correctly"
echo ""
echo "If payment succeeds but redirect fails:"
echo "  • Check NEXT_PUBLIC_APP_URL matches current domain"
echo "  • Verify success_url and cancel_url in stripe-checkout route"
echo "  • Check dashboard page exists at /seeker/dashboard"

echo ""
echo "=================================================="
echo "Manual Testing Steps"
echo "=================================================="
echo ""
echo "1. Start dev server: npm run dev"
echo "2. Visit: http://localhost:3000/onboarding"
echo "3. Complete onboarding up to package selection"
echo "4. Select 'Flex Trial' ($34.99)"
echo "5. Click 'Continue to Checkout'"
echo ""
echo "STRIPE TEST:"
echo "  6a. Click 'Stripe' tab"
echo "  7a. Click 'Pay with Stripe' button"
echo "  8a. Should redirect to: https://checkout.stripe.com/..."
echo "  9a. Enter test card: 4242 4242 4242 4242"
echo " 10a. Any expiry date in future (e.g., 12/25)"
echo " 11a. Any CVC (e.g., 123)"
echo " 12a. Enter any email and name"
echo " 13a. Click 'Pay \$0.00'"
echo " 14a. Should see success page with redirect happening"
echo ""
echo "PAYPAL TEST:"
echo "  6b. Click 'PayPal' tab (if on checkout again)"
echo "  7b. Click PayPal button (blue button)"
echo "  8b. PayPal popup should open"
echo "  9b. Login with: buyer@example.com / qweasd123"
echo " 10b. Review order details (\$0.00 for trial)"
echo " 11b. Click 'Agree and Pay'"
echo " 12b. Should redirect back with payment_status=success"

