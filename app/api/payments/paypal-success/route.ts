import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/payments/paypal-success
 * Redirect handler for PayPal billing agreement return.
 *
 * PayPal redirects here with: ?ba_token=BA-xxx&token=EC-xxx[&planId=xxx&pendingSignupId=xxx]
 * We forward everything to /seeker/subscription/paypal-return which handles execution.
 * The pendingSignupId check in execute-billing-agreement handles the onboarding case.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)

        const baToken = searchParams.get('ba_token')
        const ecToken = searchParams.get('token')
        const token = baToken || ecToken
        const planId = searchParams.get('planId')
        const pendingSignupId = searchParams.get('pendingSignupId')

        console.log('🔄 PAYPAL-SUCCESS: Received billing agreement return:', {
            ba_token: baToken,
            token: ecToken,
            planId,
            pendingSignupId,
        })

        if (!token) {
            console.error('❌ PAYPAL-SUCCESS: Missing PayPal token in return URL')
            return NextResponse.redirect(new URL('/sign-in?error=invalid_return', request.url))
        }

        // Forward to the seeker paypal-return page which handles execution
        const returnUrl = new URL('/seeker/subscription/paypal-return', request.url)
        if (baToken) returnUrl.searchParams.set('ba_token', baToken)
        if (ecToken) returnUrl.searchParams.set('token', ecToken)
        if (planId) returnUrl.searchParams.set('planId', planId)
        if (pendingSignupId) returnUrl.searchParams.set('pendingSignupId', pendingSignupId)

        return NextResponse.redirect(returnUrl)
    } catch (error) {
        console.error('❌ PAYPAL-SUCCESS: Error handling PayPal return:', error)
        return NextResponse.redirect(new URL('/sign-in?error=processing_failed', request.url))
    }
}
