import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { SEEKER_SUBSCRIPTION_PLANS } from '@/lib/subscription-plans'

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        if (currentUser.profile.role !== 'seeker') {
            return NextResponse.json({ error: 'Only job seekers can access invoices' }, { status: 403 })
        }

        const subscriptions = await db.subscription.findMany({
            where: { seekerId: currentUser.profile.id },
            orderBy: { createdAt: 'desc' },
        })

        const membershipPlanToIdMap: Record<string, string> = {
            trial_monthly: 'trial', gold_bimonthly: 'gold', vip_quarterly: 'vip-platinum', annual_platinum: 'annual-platinum',
        }

        const invoices = subscriptions.map(subscription => {
            const planId = membershipPlanToIdMap[subscription.plan] || subscription.plan
            const plan = SEEKER_SUBSCRIPTION_PLANS.find(p => p.id === planId)
            const isTrial = planId === 'trial' && (plan as any)?.trialDays

            return {
                id: `inv_${subscription.id}`,
                amount: isTrial ? 0 : (plan?.price || 0),
                status: isTrial ? 'trial' : (subscription.status === 'active' ? 'paid' : 'pending'),
                date: subscription.createdAt.toISOString(),
                description: isTrial
                    ? `${plan?.name || 'Trial Subscription'} - Free Trial`
                    : `${plan?.name || 'Subscription'} - ${(plan as any)?.billing || 'monthly'}`,
                planName: plan?.name || 'Unknown Plan',
                downloadUrl: `/api/seeker/subscription/invoices/inv_${subscription.id}/download`,
            }
        })

        return NextResponse.json({ success: true, invoices })
    } catch (error) {
        console.error('Error fetching invoices:', error)
        return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
    }
}
