import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import stripe from '@/lib/stripe'
import { getSeekerPlans } from '@/lib/stripe-products-config'

export const dynamic = 'force-dynamic'

const PLAN_ID_TO_MEMBERSHIP_MAP: Record<string, 'trial_monthly' | 'gold_bimonthly' | 'vip_quarterly' | 'annual_platinum'> = {
  'seeker-flex-trial': 'trial_monthly',
  'seeker-flex-gold': 'gold_bimonthly',
  'seeker-flex-vip': 'vip_quarterly',
  'seeker-flex-annual': 'annual_platinum',
}

const PLAN_DETAILS: Record<string, { durationDays: number; resumeCredits: number }> = {
  trial_monthly: { durationDays: 7, resumeCredits: 1 },
  gold_bimonthly: { durationDays: 60, resumeCredits: 5 },
  vip_quarterly: { durationDays: 90, resumeCredits: 10 },
  annual_platinum: { durationDays: 365, resumeCredits: 20 },
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - must be logged in' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { planType, paymentMethodId, billingEmail } = body

    if (!planType) {
      return NextResponse.json(
        { error: 'Plan type is required' },
        { status: 400 }
      )
    }

    const userProfile = await db.userProfile.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    let jobSeeker = await db.jobSeeker.findUnique({
      where: { userId: userProfile.id },
      select: {
        userId: true,
        membershipPlan: true,
      },
    })

    if (!jobSeeker) {
      jobSeeker = await db.jobSeeker.create({
        data: {
          userId: userProfile.id,
          membershipPlan: 'none',
        },
      })
    }

    const plans = getSeekerPlans()
    const plan = plans.find((p) => p.id === planType)

    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 })
    }

    const membershipEnum = PLAN_ID_TO_MEMBERSHIP_MAP[plan.id]
    if (!membershipEnum) {
      return NextResponse.json(
        { error: 'Plan mapping not found' },
        { status: 500 }
      )
    }

    const planDetail = PLAN_DETAILS[membershipEnum]

    if (membershipEnum !== 'trial_monthly' && !paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method is required for paid plans' },
        { status: 400 }
      )
    }

    let stripeCustomerId: string
    const existingSubscription = await db.subscription.findFirst({
      where: {
        seekerId: jobSeeker.userId,
      },
      select: {
        authnetCustomerId: true,
      },
    })

    if (existingSubscription?.authnetCustomerId) {
      stripeCustomerId = existingSubscription.authnetCustomerId
    } else {
      const customer = await stripe.customers.create({
        email: billingEmail || userProfile.email || userId,
        name: userProfile.name,
        metadata: {
          userId,
          seekerId: jobSeeker.userId,
        },
      })
      stripeCustomerId = customer.id
    }

    console.log(
      `[Seeker Subscription] Creating ${membershipEnum} subscription for seeker ${jobSeeker.userId}`
    )

    let stripeSubscriptionId: string | null = null

    if (membershipEnum !== 'trial_monthly') {
      const subscriptionParams: any = {
        customer: stripeCustomerId,
        items: [
          {
            price: plan.priceId,
          },
        ],
        metadata: {
          planType: membershipEnum,
          seekerId: jobSeeker.userId,
          userId,
        },
      }

      if (paymentMethodId) {
        subscriptionParams.default_payment_method = paymentMethodId
      }

      const stripeSubscription = await stripe.subscriptions.create(subscriptionParams)
      stripeSubscriptionId = stripeSubscription.id
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + planDetail.durationDays * 24 * 60 * 60 * 1000)

    const subscription = await db.subscription.create({
      data: {
        seekerId: jobSeeker.userId,
        authnetSubscriptionId: stripeSubscriptionId || undefined,
        authnetCustomerId: stripeCustomerId,
        plan: membershipEnum,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: expiresAt,
        expires_at: expiresAt,
      },
    })

    await db.jobSeeker.update({
      where: { userId: jobSeeker.userId },
      data: {
        membershipPlan: membershipEnum,
        membershipExpiresAt: expiresAt,
        resumeCredits: planDetail.resumeCredits,
        trialEndsAt: membershipEnum === 'trial_monthly' ? expiresAt : null,
        isOnTrial: membershipEnum === 'trial_monthly',
      },
    })

    console.log(
      `[Seeker Subscription] Successfully created subscription ${subscription.id}`
    )

    return NextResponse.json(
      {
        success: true,
        subscriptionId: subscription.id,
        message: `Successfully subscribed to ${plan.name}`,
        membership: {
          plan: membershipEnum,
          expiresAt: expiresAt.toISOString(),
          status: subscription.status,
          resumeCredits: planDetail.resumeCredits,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Seeker Subscription] Error:', error)

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to purchase subscription'

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { status: 'ok', endpoint: 'seeker-subscription-purchase' },
    { status: 200 }
  )
}
