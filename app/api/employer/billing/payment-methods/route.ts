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

        // Reuse existing Stripe customer for this employer rather than creating a new
        // one on every "Add card" call (which causes pm_xxx → wrong cus_xxx mismatch).
        //
        // Priority order:
        //  1. PM is already attached to a customer (e.g. re-adding same card)
        //  2. Employer has an existing DB payment method → retrieve its customer
        //  3. Employer purchased before → customer stored in EmployerPackage.arbSubscriptionId
        //  4. Last resort: create a new customer

        let customerId: string | undefined

        // 1. Check if the freshly-tokenised PM is already attached to a customer
        try {
            const freshPM = await stripe.paymentMethods.retrieve(paymentMethodId)
            if (freshPM.customer) customerId = freshPM.customer as string
        } catch (_) { /* ignore */ }

        // 2. Look up via an existing DB payment method for this employer
        if (!customerId) {
            const existingDbPMs = await db.paymentMethod.findMany({
                where: { employerId: userProfile.employer.userId, authnetPaymentProfileId: { startsWith: 'pm_' } },
                orderBy: { createdAt: 'asc' },
                take: 3,
            })
            for (const dbPM of existingDbPMs) {
                try {
                    const pm = await stripe.paymentMethods.retrieve(dbPM.authnetPaymentProfileId!)
                    if (pm.customer) { customerId = pm.customer as string; break }
                } catch (_) { /* ignore */ }
            }
        }

        // 3. Look up via the latest EmployerPackage (stores cus_xxx in arbSubscriptionId)
        if (!customerId) {
            const pkg = await db.employerPackage.findFirst({
                where: { employerId: userProfile.employer.userId, arbSubscriptionId: { startsWith: 'cus_' } },
                orderBy: { purchasedAt: 'desc' },
                select: { arbSubscriptionId: true },
            })
            if (pkg?.arbSubscriptionId) customerId = pkg.arbSubscriptionId
        }

        // 4. No existing customer → create one now
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: userProfile.email || '',
                name: userProfile.name || '',
                metadata: { userId: currentUser.profile.id, role: 'employer' },
            })
            customerId = customer.id
        }

        const stripeMethod = await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId })

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

        return NextResponse.json({ success: true, message: 'Payment method added successfully', customerId: customerId, paymentMethod: savedMethod })
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
