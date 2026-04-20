import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import stripe from '@/lib/stripe'

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        if (currentUser.profile.role !== 'seeker' && !(currentUser.isImpersonating && currentUser.profile.role === 'seeker')) {
            return NextResponse.json({ error: 'Only job seekers can access payment methods' }, { status: 403 })
        }

        const userProfile = await db.userProfile.findUnique({
            where: { id: currentUser.profile.id },
            include: { jobSeeker: true },
        })

        if (!userProfile?.jobSeeker) {
            return NextResponse.json({ error: 'Job seeker profile not found' }, { status: 404 })
        }

        // Get Stripe customer ID from the most recent subscription
        const latestSubscription = await db.subscription.findFirst({
            where: { seekerId: currentUser.profile.id },
            orderBy: { createdAt: 'desc' },
            select: { authnetCustomerId: true },
        })

        let paymentMethods: any[] = []

        // First, check DB payment_methods table (saved after first purchase)
        const dbMethods = await db.paymentMethod.findMany({
            where: { seekerId: userProfile.id },
            orderBy: { createdAt: 'desc' },
        })

        if (dbMethods.length > 0) {
            paymentMethods = dbMethods.map(pm => ({
                id: pm.id,
                type: pm.type || 'credit_card',
                last4: pm.last4 || '',
                brand: pm.brand || '',
                expiryMonth: pm.expiryMonth || 0,
                expiryYear: pm.expiryYear || 0,
                isDefault: pm.isDefault,
            }))
        } else if (latestSubscription?.authnetCustomerId) {
            try {
                const stripeMethods = await stripe.paymentMethods.list({
                    customer: latestSubscription.authnetCustomerId,
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
        console.error('Error fetching seeker payment methods:', error)
        return NextResponse.json({ error: 'Failed to fetch payment methods' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        if (currentUser.profile.role !== 'seeker') {
            return NextResponse.json({ error: 'Only job seekers can manage payment methods' }, { status: 403 })
        }

        const { paymentMethodId } = await request.json()

        if (!paymentMethodId) {
            return NextResponse.json({ error: 'paymentMethodId is required' }, { status: 400 })
        }

        const userProfile = await db.userProfile.findUnique({
            where: { id: currentUser.profile.id },
        })

        // Get Stripe customer ID from the most recent subscription (stored in authnetCustomerId)
        const latestSubscription = await db.subscription.findFirst({
            where: { seekerId: currentUser.profile.id },
            orderBy: { createdAt: 'desc' },
            select: { authnetCustomerId: true },
        })

        let customerId = latestSubscription?.authnetCustomerId

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: currentUser.clerkUser.emailAddresses?.[0]?.emailAddress || '',
                name: userProfile?.name || '',
                metadata: { userId: currentUser.profile.id },
            })
            customerId = customer.id
        }

        await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId })

        return NextResponse.json({ success: true, message: 'Payment method added successfully' })
    } catch (error) {
        console.error('Error adding payment method:', error)
        return NextResponse.json({ error: 'Failed to add payment method' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        if (currentUser.profile.role !== 'seeker') {
            return NextResponse.json({ error: 'Only job seekers can manage payment methods' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const paymentMethodId = searchParams.get('id')

        if (!paymentMethodId) {
            return NextResponse.json({ error: 'Payment method ID is required' }, { status: 400 })
        }

        await stripe.paymentMethods.detach(paymentMethodId)

        return NextResponse.json({ success: true, message: 'Payment method removed successfully' })
    } catch (error) {
        console.error('Error removing payment method:', error)
        return NextResponse.json({ error: 'Failed to remove payment method' }, { status: 500 })
    }
}
