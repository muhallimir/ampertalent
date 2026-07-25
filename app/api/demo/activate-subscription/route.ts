/**
 * POST /api/demo/activate-subscription
 *
 * Creates a realistic subscription for a demo seeker account — without
 * going through the Stripe/PayPal checkout. This makes the demo
 * dashboard show real membership data (plan, resume credits, expiry)
 * so a prospective client can see the full feature set without entering
 * a real credit card.
 *
 * Picks a default plan (trial_monthly — 1 free resume, 33 days) and
 * creates the matching Subscription + JobSeeker rows.
 *
 * Only works for demo accounts (name starts with "demo-") and only
 * for seeker profiles.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { DEMO_NAME_REGEX } from '@/lib/demo-credentials'
import { getPlanById } from '@/lib/subscription-plans'
import type { MembershipPlan } from '@prisma/client'

const DEFAULT_PLAN_ID = 'trial' // 'trial_monthly' — 1 resume credit, 33 days, free trial

export async function POST(request: NextRequest) {
  let body: { planId?: string } = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const planId = body.planId ?? DEFAULT_PLAN_ID

  // Auth: must be a signed-in demo user
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await db.userProfile.findUnique({
    where: { clerkUserId: userId },
    include: { jobSeeker: true },
  })
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }
  if (!profile.name || !DEMO_NAME_REGEX.test(profile.name)) {
    return NextResponse.json(
      { error: 'Refusing to activate a subscription for a non-demo account' },
      { status: 403 }
    )
  }
  if (profile.role !== 'seeker') {
    return NextResponse.json(
      { error: 'Demo subscription activation is only for seeker accounts' },
      { status: 400 }
    )
  }

  const plan = getPlanById(planId)
  if (!plan) {
    return NextResponse.json(
      { error: `Unknown plan "${planId}"` },
      { status: 400 }
    )
  }

  const now = new Date()
  // Trial lasts `trialDays` from now; non-trial lasts `duration` days
  const durationDays = plan.trialDays ?? plan.duration
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)
  const isTrial = plan.membershipPlan === 'trial_monthly'

  try {
    // Create or update the JobSeeker row with the new plan
    const jobSeeker = profile.jobSeeker
      ? await db.jobSeeker.update({
          where: { userId: profile.id },
          data: {
            membershipPlan: plan.membershipPlan as MembershipPlan,
            membershipExpiresAt: expiresAt,
            resumeCredits: plan.resumeCredits,
            trialEndsAt: isTrial ? expiresAt : null,
            isOnTrial: isTrial,
          },
        })
      : await db.jobSeeker.create({
          data: {
            userId: profile.id,
            membershipPlan: plan.membershipPlan as MembershipPlan,
            membershipExpiresAt: expiresAt,
            resumeCredits: plan.resumeCredits,
            trialEndsAt: isTrial ? expiresAt : null,
            isOnTrial: isTrial,
          },
        })

    // Create a Subscription row so the dashboard has historical data
    await db.subscription.create({
      data: {
        seekerId: jobSeeker.userId,
        plan: plan.membershipPlan as MembershipPlan,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: expiresAt,
        expires_at: expiresAt,
        authnetSubscriptionId: `demo_sub_${profile.id}_${now.getTime()}`,
      },
    })

    return NextResponse.json({
      success: true,
      plan: {
        id: plan.id,
        name: plan.name,
        membershipPlan: plan.membershipPlan,
        resumeCredits: plan.resumeCredits,
        expiresAt: expiresAt.toISOString(),
        isTrial,
      },
    })
  } catch (err: any) {
    console.error('🚨 DEMO SUBSCRIPTION: failed:', err)
    return NextResponse.json(
      { error: 'Failed to activate demo subscription', details: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
