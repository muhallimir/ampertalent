import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as any
})

// Map planId to MembershipPlan enum
const planIdToMembershipPlan: Record<string, any> = {
    'trial': 'trial_monthly',
    'gold': 'gold_bimonthly',
    'vip-platinum': 'vip_quarterly',
    'annual-platinum': 'annual_platinum'
}

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { sessionId, paymentMethod, paymentStatus } = await request.json()

        if (!sessionId || !paymentMethod) {
            return NextResponse.json(
                { error: 'sessionId and paymentMethod required' },
                { status: 400 }
            )
        }

        console.log('💳 PROCESS-PAYMENT: Processing payment:', {
            userId: currentUser.clerkUser.id,
            sessionId,
            paymentMethod,
            paymentStatus
        })

        if (paymentStatus !== 'success') {
            console.log('⚠️ PROCESS-PAYMENT: Payment status is not success, skipping processing')
            return NextResponse.json(
                { error: 'Payment not successful' },
                { status: 400 }
            )
        }

        // For Stripe payments, retrieve the session and verify payment
        if (paymentMethod === 'stripe') {
            try {
                const session = await stripe.checkout.sessions.retrieve(sessionId)

                if (!session) {
                    console.error('❌ PROCESS-PAYMENT: Stripe session not found:', sessionId)
                    return NextResponse.json(
                        { error: 'Stripe session not found' },
                        { status: 404 }
                    )
                }

                console.log('✅ PROCESS-PAYMENT: Stripe session retrieved:', {
                    sessionId: session.id,
                    paymentStatus: session.payment_status,
                    customer: session.customer_email
                })

                // Only process if payment_status is 'paid'
                if (session.payment_status !== 'paid') {
                    console.log('⚠️ PROCESS-PAYMENT: Stripe payment not yet paid, status:', session.payment_status)
                    return NextResponse.json(
                        { error: 'Payment not yet completed' },
                        { status: 400 }
                    )
                }

                // Get the plan from metadata
                const planId = session.metadata?.planId as string
                if (!planId) {
                    console.error('❌ PROCESS-PAYMENT: No planId in session metadata')
                    return NextResponse.json(
                        { error: 'Plan not found in session' },
                        { status: 400 }
                    )
                }

                const membershipPlan = planIdToMembershipPlan[planId]
                if (!membershipPlan) {
                    console.error('❌ PROCESS-PAYMENT: Unknown planId:', planId)
                    return NextResponse.json(
                        { error: 'Unknown plan' },
                        { status: 400 }
                    )
                }

                // Get or create user profile
                let userProfile = await db.userProfile.findUnique({
                    where: { clerkUserId: currentUser.clerkUser.id }
                })

                if (!userProfile) {
                    console.log('📝 PROCESS-PAYMENT: Creating new user profile')
                    userProfile = await db.userProfile.create({
                        data: {
                            clerkUserId: currentUser.clerkUser.id,
                            email: currentUser.clerkUser.emailAddresses[0]?.emailAddress || '',
                            name: `${currentUser.clerkUser.firstName || ''} ${currentUser.clerkUser.lastName || ''}`.trim(),
                            role: 'seeker'
                        }
                    })
                }

                // Get or create job seeker profile
                let jobSeeker = await db.jobSeeker.findUnique({
                    where: { userId: userProfile.id }
                })

                if (!jobSeeker) {
                    console.log('📝 PROCESS-PAYMENT: Creating new job seeker profile')
                    jobSeeker = await db.jobSeeker.create({
                        data: {
                            userId: userProfile.id
                        }
                    })
                }

                // Create subscription record
                const trialEndsAt = planId === 'trial' ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : null
                const subscription = await db.subscription.create({
                    data: {
                        seekerId: jobSeeker.userId,
                        plan: membershipPlan,
                        status: 'active',
                        externalPaymentId: session.id,
                        currentPeriodStart: new Date(),
                        currentPeriodEnd: new Date(Date.now() + (planId === 'trial' ? 3 : 30) * 24 * 60 * 60 * 1000),
                        nextBillingDate: new Date(Date.now() + (planId === 'trial' ? 3 : 30) * 24 * 60 * 60 * 1000)
                    }
                })

                // Update job seeker membership info
                await db.jobSeeker.update({
                    where: { userId: jobSeeker.userId },
                    data: {
                        membershipPlan,
                        membershipExpiresAt: subscription.currentPeriodEnd,
                        isOnTrial: planId === 'trial',
                        trialEndsAt
                    }
                })

                console.log('✅ PROCESS-PAYMENT: Subscription created:', {
                    subscriptionId: subscription.id,
                    plan: subscription.plan,
                    seekerId: subscription.seekerId
                })

                return NextResponse.json({
                    success: true,
                    subscriptionId: subscription.id,
                    plan: subscription.plan
                })
            } catch (error) {
                console.error('❌ PROCESS-PAYMENT: Error processing Stripe payment:', error)
                return NextResponse.json(
                    { error: 'Failed to verify Stripe payment' },
                    { status: 500 }
                )
            }
        }

        // For PayPal payments (already processed via webhook/return page)
        if (paymentMethod === 'paypal') {
            console.log('ℹ️ PROCESS-PAYMENT: PayPal payment processing is handled via return page, skipping')
            return NextResponse.json({
                success: true,
                message: 'PayPal payment already processed'
            })
        }

        return NextResponse.json(
            { error: 'Unknown payment method' },
            { status: 400 }
        )
    } catch (error) {
        console.error('❌ PROCESS-PAYMENT: Unexpected error:', error)
        return NextResponse.json(
            { error: 'Failed to process payment' },
            { status: 500 }
        )
    }
}
