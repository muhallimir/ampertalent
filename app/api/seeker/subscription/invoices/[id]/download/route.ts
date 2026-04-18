import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateInvoicePDF } from '@/lib/invoice-pdf'
import { db } from '@/lib/db'
import { SEEKER_SUBSCRIPTION_PLANS } from '@/lib/subscription-plans'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        if (currentUser.profile.role !== 'seeker') {
            return NextResponse.json({ error: 'Only job seekers can download invoices' }, { status: 403 })
        }

        const subscriptionId = resolvedParams.id.replace('inv_', '')

        const subscription = await db.subscription.findFirst({
            where: { id: subscriptionId, seekerId: currentUser.profile.id },
        })

        if (!subscription) {
            return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
        }

        const membershipPlanToIdMap: Record<string, string> = {
            trial_monthly: 'trial', gold_bimonthly: 'gold', vip_quarterly: 'vip-platinum', annual_platinum: 'annual-platinum',
        }

        const planId = membershipPlanToIdMap[subscription.plan] || subscription.plan
        const plan = SEEKER_SUBSCRIPTION_PLANS.find(p => p.id === planId)
        const isTrial = planId === 'trial' && (plan as any)?.trialDays

        const invoiceData = {
            id: resolvedParams.id,
            amount_due: isTrial ? 0 : (plan?.price || 0) * 100,
            status: isTrial ? 'trial' : (subscription.status === 'active' ? 'paid' : 'pending'),
            created_at: subscription.createdAt,
            description: isTrial
                ? `${plan?.name || 'Trial Subscription'} - Free Trial`
                : `${plan?.name || 'Subscription'} - ${(plan as any)?.billing || 'monthly'}`,
            plan_name: plan?.name || 'Unknown Plan',
            paid_at: isTrial ? null : (subscription.status === 'active' ? subscription.createdAt : null),
            due_date: subscription.currentPeriodEnd,
            user_name: currentUser.profile.firstName && currentUser.profile.lastName
                ? `${currentUser.profile.firstName} ${currentUser.profile.lastName}`
                : 'Job Seeker',
            user_email: currentUser.profile.email || currentUser.clerkUser.primaryEmailAddress?.emailAddress || 'user@example.com',
        }

        const pdfBuffer = await generateInvoicePDF(invoiceData)

        return new NextResponse(pdfBuffer as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="invoice-${resolvedParams.id}.pdf"`,
                'Content-Length': pdfBuffer.length.toString(),
            },
        })
    } catch (error) {
        console.error('Error generating invoice PDF:', error)
        return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 })
    }
}
