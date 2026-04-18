import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * POST /api/employer/billing/paypal/create-setup
 * Create a PayPal Billing Agreement Token for saving payment method only (no immediate charge).
 * Note: Full PayPal billing agreement creation requires PayPal Classic API.
 * This stub returns an error directing users to use Stripe cards instead.
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

        // Check if PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are configured
        if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
            return NextResponse.json(
                { error: 'PayPal is not configured on this server. Please use a credit card instead.' },
                { status: 503 }
            )
        }

        // Create PayPal billing agreement token via PayPal REST API
        const authResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
            method: 'POST',
            headers: {
                Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        })

        if (!authResponse.ok) {
            console.error('❌ PAYPAL-SETUP: Failed to get PayPal access token')
            return NextResponse.json({ error: 'Failed to authenticate with PayPal' }, { status: 500 })
        }

        const { access_token } = await authResponse.json()

        const returnUrlObj = new URL(returnUrl)
        returnUrlObj.searchParams.set('userId', currentUser.profile.id)
        returnUrlObj.searchParams.set('setupOnly', 'true')
        const finalReturnUrl = returnUrlObj.toString()

        // Create billing agreement token
        const tokenResponse = await fetch('https://api-m.paypal.com/v1/billing-agreements/agreement-tokens', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: 'AmperTalent - Save PayPal as payment method for future purchases',
                shipping_address: {
                    line1: 'Not Provided',
                    city: 'Not Provided',
                    state: 'NA',
                    postal_code: '00000',
                    country_code: 'US',
                },
                payer: { payment_method: 'PAYPAL' },
                plan: {
                    type: 'MERCHANT_INITIATED_BILLING',
                    merchant_preferences: {
                        return_url: finalReturnUrl,
                        cancel_url: cancelUrl,
                        notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/paypal`,
                        accepted_pymt_type: 'INSTANT',
                        skip_shipping_address: true,
                    },
                },
            }),
        })

        if (!tokenResponse.ok) {
            const errBody = await tokenResponse.json()
            console.error('❌ PAYPAL-SETUP: Failed to create billing agreement token:', errBody)
            return NextResponse.json({ error: 'Failed to create PayPal setup token' }, { status: 500 })
        }

        const tokenData = await tokenResponse.json()
        const approvalLink = tokenData.links?.find((l: { rel: string; href: string }) => l.rel === 'approval_url')

        console.log(`✅ PayPal setup token created: ${tokenData.token_id}`)

        return NextResponse.json({
            success: true,
            approvalUrl: approvalLink?.href,
            token: tokenData.token_id,
        })
    } catch (error) {
        console.error('❌ PayPal create setup error:', error)
        return NextResponse.json({ error: 'Failed to create PayPal setup' }, { status: 500 })
    }
}
