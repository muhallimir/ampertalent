import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import stripe from '@/lib/stripe'
import { ensureDemoRoleRows } from '@/lib/demo-role-backfill'

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

        // A non-onboarded seeker may not have a JobSeeker row yet. Create the
        // minimum row so GET / POST don't 404 (and so the POST below can
        // satisfy payment_methods.seeker_id FK).
        if (userProfile && !userProfile.jobSeeker) {
            try {
                await ensureDemoRoleRows(userProfile.id)
            } catch (e) {
                // ignore — fall through to manual create below
            }
            const refetched = await db.userProfile.findUnique({
                where: { id: currentUser.profile.id },
                include: { jobSeeker: true },
            })
            if (refetched && !refetched.jobSeeker) {
                await db.jobSeeker.create({
                    data: { userId: userProfile.id, membershipPlan: 'none' },
                })
            }
        }

        const userProfileFinal = await db.userProfile.findUnique({
            where: { id: currentUser.profile.id },
            include: { jobSeeker: true },
        })
        if (!userProfileFinal?.jobSeeker) {
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
            where: { seekerId: userProfileFinal.id },
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

        const { paymentMethodId, isDefault } = await request.json()

        if (!paymentMethodId) {
            return NextResponse.json({ error: 'paymentMethodId is required' }, { status: 400 })
        }

        const userProfile = await db.userProfile.findUnique({
            where: { id: currentUser.profile.id },
        })

        // The payment_methods.seeker_id FK references job_seekers.user_id.
        // Make sure that row exists before we try to insert — a non-onboarded
        // seeker (or a freshly-created user profile) won't have a JobSeeker
        // row yet, and the FK constraint will reject the payment_method
        // insert otherwise. Demo accounts get a richer backfill; everyone
        // else gets the minimum row needed to satisfy the FK.
        let jobSeeker = await db.jobSeeker.findUnique({
            where: { userId: currentUser.profile.id },
            select: { userId: true },
        })
        if (!jobSeeker) {
            try {
                await ensureDemoRoleRows(currentUser.profile.id)
            } catch (e) {
                // ignore — fall through to manual create below
            }
            jobSeeker = await db.jobSeeker.findUnique({
                where: { userId: currentUser.profile.id },
                select: { userId: true },
            })
            if (!jobSeeker) {
                jobSeeker = await db.jobSeeker.create({
                    data: { userId: currentUser.profile.id, membershipPlan: 'none' },
                    select: { userId: true },
                })
            }
        }

        // Reuse existing Stripe customer rather than creating new ones on every "Add card".
        // Priority:
        //  1. PM already attached to a customer
        //  2. Seeker has an existing subscription with authnetCustomerId (cus_xxx)
        //  3. Create new customer

        let customerId: string | undefined

        // 1. Check if PM already has a customer
        try {
            const freshPM = await stripe.paymentMethods.retrieve(paymentMethodId)
            if (freshPM.customer) customerId = freshPM.customer as string
        } catch (_) { /* ignore */ }

        // 2. Reuse customer from existing subscription
        if (!customerId) {
            const latestSub = await db.subscription.findFirst({
                where: { seekerId: currentUser.profile.id, authnetCustomerId: { startsWith: 'cus_' } },
                orderBy: { createdAt: 'desc' },
                select: { authnetCustomerId: true },
            })
            if (latestSub?.authnetCustomerId) customerId = latestSub.authnetCustomerId
        }

        // 3. Create a new customer
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: currentUser.clerkUser.emailAddresses?.[0]?.emailAddress || userProfile?.email || '',
                name: userProfile?.name || '',
                metadata: { userId: currentUser.clerkUser.id, seekerId: currentUser.profile.id },
            })
            customerId = customer.id
        }

        // Attach the PM to the customer (idempotent on Stripe side)
        const stripeMethod = await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId })

        // Determine if this should be the default (true if it's the first method, or caller asked)
        const existingMethodCount = await db.paymentMethod.count({
            where: { seekerId: currentUser.profile.id },
        })
        const shouldBeDefault = !!isDefault || existingMethodCount === 0

        // If setting as default, unset any existing default card
        if (shouldBeDefault) {
            await db.paymentMethod.updateMany({
                where: { seekerId: currentUser.profile.id, isDefault: true },
                data: { isDefault: false },
            })
        }

        // Save to local payment_methods table so it shows up in the UI
        const savedMethod = await db.paymentMethod.create({
            data: {
                seekerId: currentUser.profile.id,
                type: 'credit_card',
                last4: stripeMethod.card?.last4 || '',
                brand: stripeMethod.card?.brand || '',
                expiryMonth: stripeMethod.card?.exp_month || 0,
                expiryYear: stripeMethod.card?.exp_year || 0,
                isDefault: shouldBeDefault,
                authnetPaymentProfileId: paymentMethodId, // store Stripe PM id here
            },
        })

        // Persist the Stripe customer id on the latest subscription (if any) for future charges
        const latestSubForCustomer = await db.subscription.findFirst({
            where: { seekerId: currentUser.profile.id },
            orderBy: { createdAt: 'desc' },
            select: { id: true, authnetCustomerId: true },
        })
        if (latestSubForCustomer && !latestSubForCustomer.authnetCustomerId) {
            await db.subscription.update({
                where: { id: latestSubForCustomer.id },
                data: { authnetCustomerId: customerId },
            })
        }

        return NextResponse.json({
            success: true,
            message: 'Payment method added successfully',
            customerId,
            paymentMethod: savedMethod,
        })
    } catch (error) {
        console.error('Error adding payment method:', error)
        return NextResponse.json({ error: 'Failed to add payment method' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        if (currentUser.profile.role !== 'seeker') {
            return NextResponse.json({ error: 'Only job seekers can manage payment methods' }, { status: 403 })
        }

        const body = await request.json()
        const { paymentMethodId, action, stripePaymentMethodId } = body

        if (!paymentMethodId) {
            return NextResponse.json({ error: 'paymentMethodId is required' }, { status: 400 })
        }

        // ── setDefault: mark a saved card as the default ─────────────────────
        if (action === 'setDefault') {
            const existing = await db.paymentMethod.findFirst({
                where: { id: paymentMethodId, seekerId: currentUser.profile.id },
            })
            if (!existing) {
                return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })
            }

            // Unset all existing defaults first
            await db.paymentMethod.updateMany({
                where: { seekerId: currentUser.profile.id, isDefault: true },
                data: { isDefault: false },
            })

            await db.paymentMethod.update({
                where: { id: paymentMethodId },
                data: { isDefault: true },
            })

            return NextResponse.json({ success: true, message: 'Default payment method updated' })
        }

        // ── update: replace the card with a new one (Stripe PM id) ───────────
        if (action === 'update') {
            if (!stripePaymentMethodId || !stripePaymentMethodId.startsWith('pm_')) {
                return NextResponse.json(
                    { error: 'A valid Stripe paymentMethodId is required for update' },
                    { status: 400 }
                )
            }

            const existing = await db.paymentMethod.findFirst({
                where: { id: paymentMethodId, seekerId: currentUser.profile.id },
            })
            if (!existing) {
                return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })
            }

            // Resolve the customer to attach the new PM to (reuse existing or create)
            let customerId: string | undefined
            try {
                const freshPM = await stripe.paymentMethods.retrieve(stripePaymentMethodId)
                if (freshPM.customer) customerId = freshPM.customer as string
            } catch (_) { /* ignore */ }
            if (!customerId) {
                const latestSub = await db.subscription.findFirst({
                    where: { seekerId: currentUser.profile.id, authnetCustomerId: { startsWith: 'cus_' } },
                    orderBy: { createdAt: 'desc' },
                    select: { authnetCustomerId: true },
                })
                customerId = latestSub?.authnetCustomerId
            }
            if (!customerId) {
                const customer = await stripe.customers.create({
                    email: currentUser.clerkUser.emailAddresses?.[0]?.emailAddress || '',
                    name: existing.brand || 'Stripe Customer',
                    metadata: { userId: currentUser.clerkUser.id, seekerId: currentUser.profile.id },
                })
                customerId = customer.id
            }

            const stripeMethod = await stripe.paymentMethods.attach(stripePaymentMethodId, { customer: customerId })

            await db.paymentMethod.update({
                where: { id: paymentMethodId },
                data: {
                    last4: stripeMethod.card?.last4 || existing.last4,
                    brand: stripeMethod.card?.brand || existing.brand,
                    expiryMonth: stripeMethod.card?.exp_month || existing.expiryMonth,
                    expiryYear: stripeMethod.card?.exp_year || existing.expiryYear,
                    authnetPaymentProfileId: stripePaymentMethodId,
                },
            })

            return NextResponse.json({ success: true, message: 'Payment method updated' })
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    } catch (error) {
        console.error('Error updating payment method:', error)
        return NextResponse.json({ error: 'Failed to update payment method' }, { status: 500 })
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
