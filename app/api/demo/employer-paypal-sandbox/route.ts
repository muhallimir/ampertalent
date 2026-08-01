/**
 * POST /api/demo/employer-paypal-sandbox
 *
 * One-click PayPal sandbox for the employer billing page. Mirrors
 * /api/demo/employer-stripe-sandbox so admins, prospects, and demo
 * visitors can experience the real PayPal sandbox UI (the billing-agreement
 * approval screen, sandbox buyer login, etc.) without having to manually
 * post to /api/payments/create-billing-agreement.
 *
 * Flow:
 *   1. Verify the caller is authenticated.
 *   2. Make sure the caller has a role-specific row (`Employer` for an
 *      employer demo) — defence-in-depth so the subsequent
 *      execute-billing-agreement call doesn't trip the "Invalid user type"
 *      guard when a demo visitor skipped onboarding.
 *   3. Create a real PayPal billing-agreement token via
 *      `paypalClient.createBillingAgreementToken` and return the
 *      `approvalUrl`. The visitor completes the approval in PayPal
 *      sandbox; PayPal redirects them back to
 *      `/employer/billing/paypal-setup-return` which calls
 *      `execute-billing-agreement` to save the billing agreement as a
 *      payment method.
 *
 * Notes:
 *   - The amount is not used here (we only create a setup billing
 *     agreement, not a reference transaction). The amount is only charged
 *     if the visitor later purchases a package with this saved method.
 *   - The route is gated on the same env vars as the real PayPal flow
 *     (NEXT_PUBLIC_PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET). If those are
 *     missing we return 503 so the UI can show a clear message.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayPalClient } from '@/lib/paypal'
import { ensureDemoRoleRows } from '@/lib/demo-role-backfill'

const SANDBOX_PRODUCT_NAME =
  'AmperTalent PayPal Sandbox (use sb-buyer@personal.example.com with sandbox test password)'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const email = currentUser.clerkUser.emailAddresses[0]?.emailAddress || ''
    if (!email) {
      return NextResponse.json(
        { error: 'No email on file — cannot create a PayPal billing agreement' },
        { status: 400 }
      )
    }

    // Ensure the demo role row exists. A freshly-created demo account that
    // hasn't finished onboarding is missing the Employer row; the
    // backfill helper is a no-op for real (non-demo) accounts.
    if (currentUser.profile) {
      const demoState = await ensureDemoRoleRows(currentUser.profile.id)
      if (demoState.isDemo && demoState.created) {
        console.log('🅿️ DEMO PAYPAL SANDBOX: demo backfill created missing', demoState.created, 'row for', currentUser.profile.id)
      }
    }

    if (
      !process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
      !process.env.PAYPAL_CLIENT_SECRET
    ) {
      return NextResponse.json(
        { error: 'PayPal is not configured. Set NEXT_PUBLIC_PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.' },
        { status: 503 }
      )
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `http${request.headers.get('x-forwarded-proto') === 'https' ? 's' : ''}://${request.headers.get('host') || 'localhost:3000'}`

    const returnUrl = `${baseUrl}/employer/billing/paypal-setup-return?sandbox=1`
    const cancelUrl = `${baseUrl}/employer/billing?tab=payment-methods&paypal_sandbox=cancelled`

    const paypalClient = getPayPalClient()
    if (!paypalClient.isConfigured()) {
      return NextResponse.json(
        { error: 'PayPal is not configured on this server.' },
        { status: 503 }
      )
    }

    const result = await paypalClient.createBillingAgreementToken({
      returnUrl,
      cancelUrl,
      description: SANDBOX_PRODUCT_NAME,
    })

    return NextResponse.json({
      success: true,
      token: result.tokenId,
      approvalUrl: result.approvalUrl,
      returnUrl,
      cancelUrl,
      instructions: 'Approve the agreement in PayPal sandbox. After returning to the app the billing agreement is saved as a payment method — no money is charged.',
    })
  } catch (err: any) {
    console.error('🚨 DEMO EMPLOYER PAYPAL SANDBOX: failed', err)
    return NextResponse.json(
      { error: 'Failed to create PayPal sandbox session', details: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
