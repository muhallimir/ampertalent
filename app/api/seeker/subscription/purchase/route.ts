import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import stripe from '@/lib/stripe'
import { getPlanById } from '@/lib/subscription-plans'
import { MembershipPlan } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized - must be logged in' }, { status: 401 })
    }

    if (currentUser.profile.role !== 'seeker') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    // Modal sends planId (e.g. 'trial', 'gold', 'vip-platinum')
    // Legacy route accepted planType — support both
    const { planId, planType, paymentMethodId } = body
    const resolvedPlanId = planId || planType

    if (!resolvedPlanId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 })
    }

    const planConfig = getPlanById(resolvedPlanId)
    if (!planConfig) {
      return NextResponse.json({ error: `Invalid plan: ${resolvedPlanId}` }, { status: 400 })
    }

    const isTrial = planConfig.membershipPlan === 'trial_monthly'

    if (!isTrial && !paymentMethodId) {
      return NextResponse.json({ error: 'Payment method is required for paid plans' }, { status: 400 })
    }

    const userProfile = await db.userProfile.findUnique({
      where: { clerkUserId: currentUser.clerkUser.id },
      select: { id: true, email: true, name: true },
    })

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    let jobSeeker = await db.jobSeeker.findUnique({
      where: { userId: userProfile.id },
      select: { userId: true, membershipPlan: true },
    })

    if (!jobSeeker) {
      jobSeeker = await db.jobSeeker.create({
        data: { userId: userProfile.id, membershipPlan: 'none' },
      })
    }

    // Resolve the actual Stripe payment method ID from DB record
    let stripePaymentMethodId: string | undefined
    if (paymentMethodId && !isTrial) {
      const dbMethod = await db.paymentMethod.findFirst({
        where: { id: paymentMethodId, seekerId: jobSeeker.userId },
      })

      if (dbMethod) {
        if (!dbMethod.authnetPaymentProfileId?.startsWith('pm_')) {
          return NextResponse.json({ error: 'Invalid Stripe payment method on record. Please re-add your card.' }, { status: 400 })
        }
        stripePaymentMethodId = dbMethod.authnetPaymentProfileId
      } else if (paymentMethodId.startsWith('pm_')) {
        stripePaymentMethodId = paymentMethodId
      } else {
        return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })
      }
    }

    // Get the Stripe customer that owns this PM.
    // Always retrieve from Stripe — do NOT reuse cus_xxx from a stale subscription
    // record which may belong to a different customer than the one the PM was attached to.
    let stripeCustomerId: string
    if (stripePaymentMethodId) {
      const stripePMDetails = await stripe.paymentMethods.retrieve(stripePaymentMethodId)
      if (stripePMDetails.customer) {
        stripeCustomerId = stripePMDetails.customer as string
      } else {
        // Fresh token with no customer yet → create one and attach
        const customer = await stripe.customers.create({
          email: userProfile.email || '',
          name: userProfile.name || '',
          metadata: { userId: currentUser.clerkUser.id, seekerId: jobSeeker.userId },
        })
        stripeCustomerId = customer.id
        await stripe.paymentMethods.attach(stripePaymentMethodId, { customer: stripeCustomerId })
      }
    } else {
      // Trial — no payment method — still need a customer record
      const existingSubscription = await db.subscription.findFirst({
        where: { seekerId: jobSeeker.userId, authnetCustomerId: { startsWith: 'cus_' } },
        select: { authnetCustomerId: true },
      })
      if (existingSubscription?.authnetCustomerId) {
        stripeCustomerId = existingSubscription.authnetCustomerId
      } else {
        const customer = await stripe.customers.create({
          email: userProfile.email || '',
          name: userProfile.name || '',
          metadata: { userId: currentUser.clerkUser.id, seekerId: jobSeeker.userId },
        })
        stripeCustomerId = customer.id
      }
    }

    console.log(`[Seeker Purchase] Creating ${planConfig.membershipPlan} for seeker ${jobSeeker.userId}`)

    let stripeSubscriptionId: string | null = null

    if (!isTrial && stripePaymentMethodId) {
      // Look up the Stripe price ID for this plan from environment
      const PLAN_PRICE_IDS: Record<string, string> = {
        gold: process.env.STRIPE_FLEX_GOLD_PRICE_ID || '',
        'vip-platinum': process.env.STRIPE_FLEX_VIP_PRICE_ID || '',
        'annual-platinum': process.env.STRIPE_FLEX_ANNUAL_PRICE_ID || '',
      }

      const priceId = PLAN_PRICE_IDS[planConfig.id]
      if (priceId) {
        const stripeSubscription = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [{ price: priceId }],
          default_payment_method: stripePaymentMethodId,
          metadata: { planId: planConfig.id, membershipPlan: planConfig.membershipPlan, seekerId: jobSeeker.userId },
        })
        stripeSubscriptionId = stripeSubscription.id
      } else {
        // No Stripe price configured — do a one-time charge instead
        const paymentIntent = await stripe.paymentIntents.create({
          customer: stripeCustomerId,
          amount: Math.round(planConfig.price * 100),
          currency: 'usd',
          payment_method: stripePaymentMethodId,
          confirm: true,
          off_session: true,
          metadata: { planId: planConfig.id, seekerId: jobSeeker.userId },
        })
        if (paymentIntent.status !== 'succeeded') {
          return NextResponse.json({ error: 'Payment failed' }, { status: 400 })
        }
        stripeSubscriptionId = paymentIntent.id
      }
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + planConfig.duration * 24 * 60 * 60 * 1000)

    const subscription = await db.subscription.create({
      data: {
        seekerId: jobSeeker.userId,
        authnetSubscriptionId: stripeSubscriptionId || undefined,
        authnetCustomerId: stripeCustomerId,
        plan: planConfig.membershipPlan as MembershipPlan,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: expiresAt,
        expires_at: expiresAt,
      },
    })

    await db.jobSeeker.update({
      where: { userId: jobSeeker.userId },
      data: {
        membershipPlan: planConfig.membershipPlan as MembershipPlan,
        membershipExpiresAt: expiresAt,
        resumeCredits: planConfig.resumeCredits,
        trialEndsAt: isTrial ? expiresAt : null,
        isOnTrial: isTrial,
      },
    })

    console.log(`[Seeker Purchase] Successfully created subscription ${subscription.id}`)

    const purchaseAmount = isTrial ? 0 : planConfig.price

    // ── In-app notification for the seeker ────────────────────────────────────
    try {
      await db.notification.create({
        data: {
          userId: userProfile.id,
          type: 'seeker_payment_confirmation',
          title: 'Subscription Activated',
          message: `Your ${planConfig.name} subscription is now active${isTrial ? ' (trial)' : ''}. Enjoy your membership!`,
          data: {
            subscriptionId: subscription.id,
            plan: planConfig.membershipPlan,
            planName: planConfig.name,
            amount: purchaseAmount,
            expiresAt: expiresAt.toISOString(),
          },
          priority: 'high',
          actionUrl: '/seeker/dashboard',
        },
      })
    } catch (notifErr) {
      console.error('[Seeker Purchase] In-app notification failed:', notifErr)
    }

    // ── Customer confirmation email ────────────────────────────────────────────
    try {
      const { NotificationService } = await import('@/lib/notification-service')
      await NotificationService.sendPaymentConfirmation({
        userId: userProfile.id,
        userType: 'seeker',
        firstName: userProfile.name?.split(' ')[0] || 'there',
        email: userProfile.email || '',
        amount: purchaseAmount,
        description: `${planConfig.name} Subscription`,
        transactionId: stripeSubscriptionId || stripeCustomerId,
        planName: planConfig.name,
      })
    } catch (emailErr) {
      console.error('[Seeker Purchase] Customer email failed:', emailErr)
    }

    // ── Admin notification email ───────────────────────────────────────────────
    try {
      const { sendEmail, getAdminNotificationRecipients, buildAdminEmailHtml } = await import('@/lib/resend')
      const adminEmails = getAdminNotificationRecipients()
      await sendEmail({
        to: adminEmails,
        subject: `[AmperTalent Admin] New Seeker Subscription — ${planConfig.name}`,
        html: buildAdminEmailHtml({
          title: '👤 New Seeker Subscription',
          subtitle: `Activated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
          rows: [
            { label: 'Seeker', value: `${userProfile.name} (${userProfile.email})` },
            { label: 'Plan', value: planConfig.name },
            { label: 'Amount', value: isTrial ? 'Free Trial' : `$${purchaseAmount}` },
            { label: 'Subscription ID', value: subscription.id },
            { label: 'Expires', value: expiresAt.toLocaleDateString() },
          ],
          footerNote: isTrial ? 'This is a free trial activation — no charge was made today.' : 'Review in the AmperTalent admin dashboard.',
        }),
      })
    } catch (adminEmailErr) {
      console.error('[Seeker Purchase] Admin email failed:', adminEmailErr)
    }

    return NextResponse.json(
      {
        success: true,
        subscriptionId: subscription.id,
        message: `Successfully subscribed to ${planConfig.name}`,
        membership: {
          plan: planConfig.membershipPlan,
          expiresAt: expiresAt.toISOString(),
          status: 'active',
          resumeCredits: planConfig.resumeCredits,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Seeker Purchase] Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to purchase subscription' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'ok', endpoint: 'seeker-subscription-purchase' }, { status: 200 })
}

