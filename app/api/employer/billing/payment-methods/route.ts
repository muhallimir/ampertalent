import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import stripe from '@/lib/stripe'

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (currentUser.profile.role !== 'employer' && !(currentUser.isImpersonating && currentUser.profile.role === 'employer')) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const userProfile = await db.userProfile.findUnique({
            where: { clerkUserId: currentUser.clerkUser.id as string },
            include: { employer: true },
        })

        if (!userProfile || !userProfile.employer) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Get Stripe customer ID from the most recent employer package (stored in arbSubscriptionId)
        const latestPackage = await db.employerPackage.findFirst({
            where: { employerId: userProfile.employer.userId },
            orderBy: { purchasedAt: 'desc' },
            select: { arbSubscriptionId: true },
        })

        let paymentMethods: any[] = []

        if (latestPackage?.arbSubscriptionId && latestPackage.arbSubscriptionId.startsWith('cus_')) {
            try {
                const stripeMethods = await stripe.paymentMethods.list({
                    customer: latestPackage.arbSubscriptionId,
                    type: 'card',
                })

                paymentMethods = stripeMethods.data.map(pm => ({
                    id: pm.id,
                    type: 'credit_card',
                    last4: pm.card?.last4 || '',
                    brand: pm.card?.brand || '',
                    expiryMonth: pm.card?.exp_month || 0,
                    expiryYear: pm.card?.exp_year || 0,
                    isDefault: false,
                }))
            } catch (stripeError) {
                console.log('Could not fetch from Stripe:', stripeError)
            }
        }

        return NextResponse.json({ success: true, paymentMethods })
    } catch (error) {
        console.error('Error fetching employer payment methods:', error)
        return NextResponse.json({ error: 'Failed to fetch payment methods' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (currentUser.profile.role !== 'employer') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const { paymentMethodId } = await request.json()
        if (!paymentMethodId) {
            return NextResponse.json({ error: 'paymentMethodId is required' }, { status: 400 })
        }

        const userProfile = await db.userProfile.findUnique({
            where: { id: currentUser.profile.id },
        })

        const customer = await stripe.customers.create({
            email: userProfile?.email || '',
            name: userProfile?.name || '',
            metadata: { userId: currentUser.profile.id, role: 'employer' },
        })

        await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id })

        return NextResponse.json({ success: true, message: 'Payment method added successfully', customerId: customer.id })
    } catch (error) {
        console.error('Error adding employer payment method:', error)
        return NextResponse.json({ error: 'Failed to add payment method' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (currentUser.profile.role !== 'employer') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const paymentMethodId = searchParams.get('id')

        if (!paymentMethodId) {
            return NextResponse.json({ error: 'Payment method ID is required' }, { status: 400 })
        }

        await stripe.paymentMethods.detach(paymentMethodId)

        return NextResponse.json({ success: true, message: 'Payment method removed successfully' })
    } catch (error) {
        console.error('Error removing employer payment method:', error)
        return NextResponse.json({ error: 'Failed to remove payment method' }, { status: 500 })
    }
}
