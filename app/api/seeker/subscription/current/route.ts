import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

function calculatePeriodEnd(subscription: { createdAt: Date; currentPeriodStart: Date | null; plan: string }): Date {
    const durations: Record<string, number> = {
        trial_monthly: 33, gold_bimonthly: 60, vip_quarterly: 90, annual_platinum: 365,
    }
    const days = durations[subscription.plan] || 30
    const startDate = subscription.currentPeriodStart || subscription.createdAt
    return new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000)
}

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser(request)
        if (!user?.clerkUser || !user.profile) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        if (user.profile.role !== 'seeker' && !(user.isImpersonating && user.profile.role === 'seeker')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const subscription = await db.subscription.findFirst({
            where: { seekerId: user.profile.id, status: { in: ['active', 'past_due'] } },
            orderBy: { createdAt: 'desc' },
        })

        const jobSeeker = await db.jobSeeker.findUnique({
            where: { userId: user.profile.id },
            select: { membershipPlan: true, membershipExpiresAt: true, resumeCredits: true, cancelledSeeker: true, cancelledAt: true, hasPreviousSubscription: true },
        })

        if (!jobSeeker) {
            return NextResponse.json({ error: 'Job seeker profile not found' }, { status: 404 })
        }

        const membershipPlanToIdMap: Record<string, string> = {
            trial_monthly: 'trial', gold_bimonthly: 'gold', vip_quarterly: 'vip-platinum', annual_platinum: 'annual-platinum',
        }

        const periodEnd = subscription?.currentPeriodEnd ?? (subscription ? calculatePeriodEnd(subscription) : null)
        const periodStart = subscription?.currentPeriodStart || subscription?.createdAt

        const currentSubscription = subscription ? {
            id: subscription.id,
            planId: membershipPlanToIdMap[subscription.plan] || subscription.plan,
            status: subscription.status,
            currentPeriodStart: periodStart?.toISOString(),
            currentPeriodEnd: periodEnd?.toISOString(),
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            createdAt: subscription.createdAt.toISOString(),
            updatedAt: subscription.updatedAt.toISOString(),
        } : null

        return NextResponse.json({
            subscription: currentSubscription,
            membershipDetails: { plan: jobSeeker.membershipPlan, expiresAt: jobSeeker.membershipExpiresAt?.toISOString(), resumeCredits: jobSeeker.resumeCredits },
            cancellationState: { cancelledSeeker: jobSeeker.cancelledSeeker, cancelledAt: jobSeeker.cancelledAt?.toISOString() ?? null, hasPreviousSubscription: jobSeeker.hasPreviousSubscription },
            success: true,
        })
    } catch (error) {
        console.error('❌ Error fetching current subscription:', error)
        return NextResponse.json({ error: 'Failed to fetch current subscription' }, { status: 500 })
    }
}
