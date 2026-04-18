import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import stripe from '@/lib/stripe'
import { JOB_PACKAGES } from '@/lib/employer-packages'

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Unauthorized - Authentication required' }, { status: 401 })
        }

        const body = await request.json()
        const { action, packageId } = body

        if (!action || !['purchase', 'upgrade', 'cancel'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action. Must be purchase, upgrade, or cancel' }, { status: 400 })
        }

        if (!packageId && action !== 'cancel') {
            return NextResponse.json({ error: 'Package ID is required' }, { status: 400 })
        }

        const userProfile = await db.userProfile.findUnique({
            where: { clerkUserId: currentUser.clerkUser.id },
            include: {
                employer: {
                    include: {
                        packages: { where: { expiresAt: { gt: new Date() } }, orderBy: { purchasedAt: 'desc' } },
                    },
                },
            },
        })

        if (!userProfile || !userProfile.employer) {
            return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 })
        }

        switch (action) {
            case 'purchase':
            case 'upgrade': {
                const selectedPackage = JOB_PACKAGES.find(p => p.id === packageId)
                if (!selectedPackage) {
                    return NextResponse.json({ error: 'Package not found' }, { status: 404 })
                }

                // For Stripe integration, return a checkout URL or handle payment
                // The actual payment is handled via the checkout route
                return NextResponse.json({
                    success: true,
                    message: `Package ${action} initiated. Please complete payment.`,
                    checkoutUrl: `/employer/billing/checkout?packageId=${packageId}`,
                })
            }

            case 'cancel': {
                const activePackage = userProfile.employer.packages[0]
                if (!activePackage) {
                    return NextResponse.json({ error: 'No active package found to cancel' }, { status: 404 })
                }

                // Cancel Stripe recurring subscription if applicable
                if (activePackage.isRecurring && activePackage.arbSubscriptionId) {
                    try {
                        if (activePackage.arbSubscriptionId.startsWith('sub_')) {
                            await stripe.subscriptions.update(activePackage.arbSubscriptionId, {
                                cancel_at_period_end: true,
                            })
                        }
                    } catch (stripeError) {
                        console.error('Error canceling Stripe subscription:', stripeError)
                    }
                }

                await db.employerPackage.update({
                    where: { id: activePackage.id },
                    data: { recurringStatus: 'cancelled' },
                })

                // Send notification (fire-and-forget)
                Promise.resolve().then(async () => {
                    try {
                        console.log(`[BILLING-MANAGE] Package cancellation for employer: ${userProfile.id}, package: ${activePackage.packageType}`)
                    } catch (err) {
                        console.error('Cancellation notification failed:', err)
                    }
                }).catch(console.error)

                return NextResponse.json({ success: true, message: 'Package cancellation processed' })
            }

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }
    } catch (error) {
        console.error('Error managing employer billing:', error)
        return NextResponse.json({ error: 'Failed to manage billing' }, { status: 500 })
    }
}
