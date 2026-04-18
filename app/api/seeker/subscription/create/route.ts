import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import stripe from '@/lib/stripe'
import { planIdToMembershipPlan, getPlanById } from '@/lib/subscription-plans'

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        if (currentUser.profile.role !== 'seeker') {
            return NextResponse.json({ error: 'Only job seekers can create subscriptions' }, { status: 403 })
        }

        const body = await request.json()
        const { planId, paymentMethodId } = body

        if (!planId || !paymentMethodId) {
            return NextResponse.json({ error: 'planId and paymentMethodId are required' }, { status: 400 })
        }

        const plan = getPlanById(planId)
        if (!plan) {
            return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 })
        }

        const userProfile = await db.userProfile.findUnique({
            where: { id: currentUser.profile.id },
            include: { jobSeeker: true },
        })

        if (!userProfile?.jobSeeker) {
            return NextResponse.json({ error: 'Job seeker profile not found' }, { status: 404 })
        }

        // Check for existing subscription to get Stripe customer ID
        const existingSubscription = await db.subscription.findFirst({
            where: { seekerId: currentUser.profile.id },
            orderBy: { createdAt: 'desc' },
            select: { authnetCustomerId: true },
        })

        let stripeCustomerId = existingSubscription?.authnetCustomerId

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: userProfile.email || '',
                name: userProfile.name || '',
                metadata: { userId: currentUser.profile.id },
            })
            stripeCustomerId = customer.id
        }

        // Attach payment method and set as default
        await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId })
        await stripe.customers.update(stripeCustomerId, {
            invoice_settings: { default_payment_method: paymentMethodId },
        })

        // Create Stripe subscription if priceId is available
        let stripeSubscriptionId: string | undefined

        if ((plan as any).stripePriceId) {
            const stripeSubscription = await stripe.subscriptions.create({
                customer: stripeCustomerId,
                items: [{ price: (plan as any).stripePriceId }],
                metadata: { userId: currentUser.profile.id, planId },
            })
            stripeSubscriptionId = stripeSubscription.id
        }

        // Create subscription record
        const periodEnd = new Date(Date.now() + (plan.duration || 30) * 24 * 60 * 60 * 1000)

        const subscription = await db.subscription.create({
            data: {
                seekerId: currentUser.profile.id,
                plan: planIdToMembershipPlan(planId) as any,
                status: 'active',
                currentPeriodEnd: periodEnd,
                authnetCustomerId: stripeCustomerId,
                authnetSubscriptionId: stripeSubscriptionId,
            },
        })

        // Update job seeker membership
        await db.jobSeeker.update({
            where: { userId: currentUser.profile.id },
            data: {
                membershipPlan: planIdToMembershipPlan(planId) as any,
                membershipExpiresAt: periodEnd,
                hasPreviousSubscription: true,
            },
        })

        return NextResponse.json({ success: true, subscription })
    } catch (error) {
        console.error('Error creating subscription:', error)
        return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
    }
}
