import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getPayPalClient } from '@/lib/paypal'
import { getServiceById } from '@/lib/additional-services'
import { getEmployerPackageById } from '@/lib/employer-packages'

/**
 * POST /api/payments/create-billing-agreement
 * Create a PayPal Billing Agreement Token (redirect-based flow).
 * Returns an approvalUrl for redirecting the user to PayPal.
 *
 * Supports:
 * - Seeker subscriptions (trial, gold, vip-platinum, annual-platinum)
 * - Seeker premium services (service_career_jumpstart, etc.)
 * - Employer packages (standard, featured, concierge_level_1, etc.)
 * - Onboarding (new seeker signup via pendingSignupId)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            planId,
            returnUrl,
            cancelUrl,
            purchaseType = 'subscription',
            addOnIds = [],
            customAmount,
            pendingSignupId,
            userType,
            setupOnly = false,
        } = body

        const currentUser = await getCurrentUser(request)

        if (!currentUser?.clerkUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // For onboarding flow: user may not have a profile yet — check pendingSignupId
        if (!currentUser.profile) {
            if (pendingSignupId) {
                const pendingSignup = await db.pendingSignup.findUnique({
                    where: { id: pendingSignupId },
                })
                if (!pendingSignup || pendingSignup.clerkUserId !== currentUser.clerkUser.id) {
                    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
                }
                // Valid pending signup — allow through
            } else {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
        }

        if ((!planId && !setupOnly) || !returnUrl || !cancelUrl) {
            return NextResponse.json(
                { error: 'Missing required fields: planId (or setupOnly=true), returnUrl, cancelUrl' },
                { status: 400 }
            )
        }

        // Determine what is being purchased for description
        const membershipPlans: Record<string, { name: string; price: number }> = {
            trial: { name: '3-Day Free Trial', price: 0 },
            gold: { name: 'Gold Professional', price: 49.99 },
            'vip-platinum': { name: 'VIP Platinum Professional', price: 79.99 },
            'annual-platinum': { name: 'Annual Platinum Professional', price: 299.0 },
        }

        const serviceId = planId && planId.startsWith('service_') ? planId.replace('service_', '') : (planId || '')
        const service = planId && !membershipPlans[planId] ? getServiceById(serviceId) : null
        const employerPackage = planId && !membershipPlans[planId] && !service ? getEmployerPackageById(planId) : null

        const description =
            setupOnly
                ? 'AmperTalent Payment Method'
                : membershipPlans[planId!]?.name ||
                service?.name ||
                employerPackage?.name ||
                'AmperTalent Subscription'

        // Check PayPal config
        if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
            return NextResponse.json(
                { error: 'PayPal is not configured. Please use a credit card.' },
                { status: 503 }
            )
        }

        const paypalClient = getPayPalClient()
        const result = await paypalClient.createBillingAgreementToken({
            returnUrl,
            cancelUrl,
            description: `AmperTalent - ${description}`,
        })

        console.log('✅ PAYPAL: Created billing agreement token:', result.tokenId)

        return NextResponse.json({
            success: true,
            token: result.tokenId,
            approvalUrl: result.approvalUrl,
        })
    } catch (error) {
        console.error('❌ PAYPAL: Error creating billing agreement:', error)
        return NextResponse.json(
            { error: 'Failed to create PayPal billing agreement' },
            { status: 500 }
        )
    }
}
