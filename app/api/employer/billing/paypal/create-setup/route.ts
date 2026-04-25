import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getPayPalClient } from '@/lib/paypal'

/**
 * POST /api/employer/billing/paypal/create-setup
 * Create a PayPal Billing Agreement Token for saving payment method only (no immediate charge).
 */
export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!currentUser.profile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
        }

        const employer = await db.employer.findUnique({
            where: { userId: currentUser.profile.id },
        })

        if (!employer) {
            return NextResponse.json({ error: 'Only employers can add payment methods' }, { status: 403 })
        }

        const body = await request.json()
        const { returnUrl, cancelUrl } = body

        if (!returnUrl || !cancelUrl) {
            return NextResponse.json(
                { error: 'Missing required fields: returnUrl, cancelUrl' },
                { status: 400 }
            )
        }

        const paypalClient = getPayPalClient()
        if (!paypalClient.isConfigured()) {
            return NextResponse.json(
                { error: 'PayPal is not configured on this server. Please use a credit card instead.' },
                { status: 503 }
            )
        }

        const returnUrlObj = new URL(returnUrl)
        returnUrlObj.searchParams.set('userId', currentUser.profile.id)
        returnUrlObj.searchParams.set('setupOnly', 'true')
        const finalReturnUrl = returnUrlObj.toString()

        const result = await paypalClient.createBillingAgreementToken({
            returnUrl: finalReturnUrl,
            cancelUrl,
            description: 'AmperTalent - Save PayPal as payment method for future purchases',
        })

        console.log(`✅ PayPal setup token created: ${result.tokenId}`)

        return NextResponse.json({
            success: true,
            approvalUrl: result.approvalUrl,
            token: result.tokenId,
        })
    } catch (error) {
        console.error('❌ PayPal create setup error:', error)
        return NextResponse.json({ error: 'Failed to create PayPal setup' }, { status: 500 })
    }
}
