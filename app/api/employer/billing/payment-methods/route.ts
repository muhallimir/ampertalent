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

        // First, check DB payment_methods table (saved after first purchase)
        const dbMethods = await db.paymentMethod.findMany({
            where: { employerId: userProfile.employer.userId },
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
        } else if (latestPackage?.arbSubscriptionId && latestPackage.arbSubscriptionId.startsWith('cus_')) {
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

        const body = await request.json()
        const { paymentMethodId, isDefault } = body
        if (!paymentMethodId) {
            return NextResponse.json({ error: 'paymentMethodId is required' }, { status: 400 })
        }

        const userProfile = await db.userProfile.findUnique({
            where: { id: currentUser.profile.id },
            include: { employer: true },
        })

        if (!userProfile?.employer) {
            return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 })
        }

        // Create a Stripe customer and attach the payment method
        const customer = await stripe.customers.create({
            email: userProfile.email || '',
            name: userProfile.name || '',
            metadata: { userId: currentUser.profile.id, role: 'employer' },
        })

        const stripeMethod = await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id })

        // Determine if this should be default (true if it's the first method)
        const existingMethodCount = await db.paymentMethod.count({
            where: { employerId: userProfile.employer.userId },
        })
        const shouldBeDefault = isDefault || existingMethodCount === 0

        // If setting as default, unset existing defaults
        if (shouldBeDefault) {
            await db.paymentMethod.updateMany({
                where: { employerId: userProfile.employer.userId, isDefault: true },
                data: { isDefault: false },
            })
        }

        // Save to payment_methods table
        const savedMethod = await db.paymentMethod.create({
            data: {
                employerId: userProfile.employer.userId,
                type: 'credit_card',
                last4: stripeMethod.card?.last4 || '',
                brand: stripeMethod.card?.brand || '',
                expiryMonth: stripeMethod.card?.exp_month || 0,
                expiryYear: stripeMethod.card?.exp_year || 0,
                isDefault: shouldBeDefault,
                authnetPaymentProfileId: paymentMethodId, // store Stripe PM id here
            },
        })

        return NextResponse.json({ success: true, message: 'Payment method added successfully', customerId: customer.id, paymentMethod: savedMethod })
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
