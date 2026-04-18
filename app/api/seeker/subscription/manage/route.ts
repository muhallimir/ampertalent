import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { inAppNotificationService } from '@/lib/in-app-notification-service'
import {
    planDisplayName,
    planIdToMembershipPlan,
    getPlanById,
} from '@/lib/subscription-plans'

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Unauthorized - Authentication required' }, { status: 401 })
        }

        const body = await request.json()
        const { action, planId } = body

        if (!action || !['upgrade', 'downgrade', 'cancel', 'reactivate'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action. Must be upgrade, downgrade, cancel, or reactivate' }, { status: 400 })
        }

        const userProfile = await db.userProfile.findUnique({
            where: { clerkUserId: currentUser.clerkUser.id },
            include: { jobSeeker: true },
        })

        if (!userProfile || !userProfile.jobSeeker) {
            return NextResponse.json({ error: 'Job seeker profile not found' }, { status: 404 })
        }

        const currentSubscription = await db.subscription.findFirst({
            where: { seekerId: userProfile.id, status: 'active' },
            orderBy: { createdAt: 'desc' },
        })

        switch (action) {
            case 'cancel':
                return await handleCancelSubscription(userProfile, currentSubscription)
            case 'reactivate':
                return await handleReactivateSubscription(userProfile, currentSubscription)
            case 'upgrade':
            case 'downgrade':
                if (!planId) {
                    return NextResponse.json({ error: 'Plan ID is required for upgrade/downgrade' }, { status: 400 })
                }
                return await handlePlanChange(userProfile, currentSubscription, planId, action)
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }
    } catch (error) {
        console.error('[SUB-MANAGE] ERROR: Failed to manage subscription:', error)
        return NextResponse.json({ error: 'Failed to manage subscription' }, { status: 500 })
    }
}

async function handleCancelSubscription(userProfile: any, currentSubscription: any) {
    if (!currentSubscription) {
        return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    try {
        const planDurations: Record<string, number> = {
            trial_monthly: 33, gold_bimonthly: 60, vip_quarterly: 90, annual_platinum: 365,
        }
        let periodEnd = currentSubscription.currentPeriodEnd
        if (!periodEnd) {
            const days = planDurations[currentSubscription.plan] || 30
            const startDate = currentSubscription.currentPeriodStart || currentSubscription.createdAt
            periodEnd = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000)
        }

        const updatedSubscription = await db.subscription.update({
            where: { id: currentSubscription.id },
            data: { cancelAtPeriodEnd: true, currentPeriodEnd: periodEnd, updatedAt: new Date() },
        })

        await db.jobSeeker.update({
            where: { userId: userProfile.id },
            data: { membershipExpiresAt: periodEnd, updatedAt: new Date() },
        })

        const planName = planDisplayName(currentSubscription.plan)
        const cancellationDate = updatedSubscription.currentPeriodEnd
            ? new Date(updatedSubscription.currentPeriodEnd).toLocaleDateString()
            : 'end of billing period'

        // Fire-and-forget notifications
        Promise.resolve().then(async () => {
            await new Promise(resolve => setTimeout(resolve, 500))
            try {
                await inAppNotificationService.notifySeekerSubscriptionCancellation(userProfile.id, planName, cancellationDate)
            } catch (err) {
                console.error('Subscription cancellation notification failed:', err)
            }
        }).catch(console.error)

        return NextResponse.json({
            success: true,
            message: 'Subscription will be canceled at the end of the current billing period',
            subscription: updatedSubscription,
        })
    } catch (error) {
        console.error('[SUB-MANAGE] CANCEL ERROR:', error)
        return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
    }
}

async function handleReactivateSubscription(userProfile: any, currentSubscription: any) {
    if (!currentSubscription || !currentSubscription.cancelAtPeriodEnd) {
        return NextResponse.json({ error: 'No canceled subscription found to reactivate' }, { status: 404 })
    }

    try {
        const updatedSubscription = await db.subscription.update({
            where: { id: currentSubscription.id },
            data: { cancelAtPeriodEnd: false, updatedAt: new Date() },
        })

        await db.jobSeeker.update({
            where: { userId: userProfile.id },
            data: { cancelledSeeker: false, cancelledAt: null },
        })

        const planName = planDisplayName(currentSubscription.plan)

        Promise.resolve().then(async () => {
            await new Promise(resolve => setTimeout(resolve, 500))
            try {
                await inAppNotificationService.notifySeekerSubscriptionReactivation(userProfile.id, planName)
            } catch (err) {
                console.error('Subscription reactivation notification failed:', err)
            }
        }).catch(console.error)

        return NextResponse.json({ success: true, message: 'Subscription has been reactivated', subscription: updatedSubscription })
    } catch (error) {
        console.error('Error reactivating subscription:', error)
        return NextResponse.json({ error: 'Failed to reactivate subscription' }, { status: 500 })
    }
}

async function handlePlanChange(userProfile: any, currentSubscription: any, newPlanId: string, action: string) {
    if (!currentSubscription) {
        return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    try {
        const plan = getPlanById(newPlanId)
        if (!plan) {
            return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 })
        }

        await db.subscription.update({
            where: { id: currentSubscription.id },
            data: { cancelAtPeriodEnd: true, updatedAt: new Date() },
        })

        const newSubscription = await db.subscription.create({
            data: {
                seekerId: userProfile.id,
                plan: planIdToMembershipPlan(newPlanId) as any,
                status: 'active',
                currentPeriodEnd: new Date(Date.now() + (plan.duration || 30) * 24 * 60 * 60 * 1000),
                createdAt: currentSubscription.currentPeriodEnd || new Date(),
            },
        })

        await db.jobSeeker.update({
            where: { userId: userProfile.id },
            data: { membershipPlan: planIdToMembershipPlan(newPlanId) as any, membershipExpiresAt: newSubscription.currentPeriodEnd },
        })

        return NextResponse.json({
            success: true,
            message: `Subscription will be ${action}d to ${plan.name} at the end of the current billing period`,
            currentSubscription,
            newSubscription,
        })
    } catch (error) {
        console.error(`Error ${action}ing subscription:`, error)
        return NextResponse.json({ error: `Failed to ${action} subscription` }, { status: 500 })
    }
}
