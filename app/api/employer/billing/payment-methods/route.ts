import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import stripe from '@/lib/stripe'
import { ensureDemoRoleRows } from '@/lib/demo-role-backfill'

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

        // Auto-provision the Employer row when missing so a freshly-onboarded
        // employer can still manage payment methods without 403-ing first.
        if (userProfile && !userProfile.employer) {
            try {
                await ensureDemoRoleRows(userProfile.id)
            } catch (e) {
                // ignore — fall through to manual create below
            }
            const refetched = await db.userProfile.findUnique({
                where: { clerkUserId: currentUser.clerkUser.id as string },
                include: { employer: true },
            })
            if (refetched && !refetched.employer) {
                await db.employer.create({
                    data: {
                        userId: userProfile.id,
                        companyName: userProfile.name || 'Company',
                    },
                })
            }
        }

        const userProfileFinal = await db.userProfile.findUnique({
            where: { clerkUserId: currentUser.clerkUser.id as string },
            include: { employer: true },
        })

        if (!userProfileFinal || !userProfileFinal.employer) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Get Stripe customer ID from the most recent employer package (stored in arbSubscriptionId)
        const latestPackage = await db.employerPackage.findFirst({
            where: { employerId: userProfileFinal.employer.userId },
            orderBy: { purchasedAt: 'desc' },
            select: { arbSubscriptionId: true },
        })

        let paymentMethods: any[] = []

        // First, check DB payment_methods table (saved after first purchase)
        const dbMethods = await db.paymentMethod.findMany({
            where: { employerId: userProfileFinal.employer.userId },
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

        // payment_methods.employer_id FK references employers.user_id. Make sure
        // the Employer row exists before the insert — a non-onboarded employer
        // (or a freshly-created profile) won't have one yet.
        let employerRecord = userProfile?.employer
        if (userProfile && !employerRecord) {
            try {
                await ensureDemoRoleRows(userProfile.id)
            } catch (e) {
                // ignore — fall through to manual create below
            }
            const refetched = await db.userProfile.findUnique({
                where: { id: currentUser.profile.id },
                include: { employer: true },
            })
            if (refetched?.employer) {
                employerRecord = refetched.employer
            } else {
                employerRecord = await db.employer.create({
                    data: {
                        userId: userProfile.id,
                        companyName: userProfile.name || 'Company',
                    },
                })
            }
        }

        if (!employerRecord) {
            return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 })
        }

        // Reuse the Stripe customer stored on the Employer record (single source of truth).
        // Fall back to existing DB payment methods, then create a new customer.
        let customerId: string | undefined

        // 1. Canonical source: stripeCustomerId on the Employer row
        if (employerRecord.stripeCustomerId) customerId = employerRecord.stripeCustomerId

        // 2. Check if the freshly-tokenised PM is already attached to a customer
        if (!customerId) {
            try {
                const freshPM = await stripe.paymentMethods.retrieve(paymentMethodId)
                if (freshPM.customer) customerId = freshPM.customer as string
            } catch (_) { /* ignore */ }
        }

        // 3. No existing customer → create one and persist it
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: userProfile.email || '',
                name: userProfile.name || '',
                metadata: { userId: currentUser.profile.id, role: 'employer' },
            })
            customerId = customer.id
        }

        // Persist customer ID on Employer so future calls don't create duplicates
        await db.employer.update({
            where: { userId: employerRecord.userId },
            data: { stripeCustomerId: customerId },
        })

        const stripeMethod = await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId })

        // Determine if this should be default (true if it's the first method)
        const existingMethodCount = await db.paymentMethod.count({
            where: { employerId: employerRecord.userId },
        })
        const shouldBeDefault = isDefault || existingMethodCount === 0

        // If setting as default, unset existing defaults
        if (shouldBeDefault) {
            await db.paymentMethod.updateMany({
                where: { employerId: employerRecord.userId, isDefault: true },
                data: { isDefault: false },
            })
        }

        // Save to payment_methods table
        const savedMethod = await db.paymentMethod.create({
            data: {
                employerId: employerRecord.userId,
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

export async function PUT(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (currentUser.profile.role !== 'employer') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const body = await request.json()
        const { paymentMethodId, action, stripePaymentMethodId } = body

        if (!paymentMethodId) {
            return NextResponse.json({ error: 'paymentMethodId is required' }, { status: 400 })
        }

        const userProfile = await db.userProfile.findUnique({
            where: { id: currentUser.profile.id },
            include: { employer: true },
        })

        // Auto-provision the Employer row when missing (mirrors POST).
        let employerRecord = userProfile?.employer
        if (userProfile && !employerRecord) {
            try {
                await ensureDemoRoleRows(userProfile.id)
            } catch (e) {
                // ignore
            }
            const refetched = await db.userProfile.findUnique({
                where: { id: currentUser.profile.id },
                include: { employer: true },
            })
            if (refetched?.employer) {
                employerRecord = refetched.employer
            } else {
                employerRecord = await db.employer.create({
                    data: {
                        userId: userProfile.id,
                        companyName: userProfile.name || 'Company',
                    },
                })
            }
        }
        if (!employerRecord) {
            return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 })
        }

        // ── setDefault: mark a saved card as the default ─────────────────────
        if (action === 'setDefault') {
            const existing = await db.paymentMethod.findFirst({
                where: { id: paymentMethodId, employerId: employerRecord.userId },
            })
            if (!existing) {
                return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })
            }

            // Unset all existing defaults first
            await db.paymentMethod.updateMany({
                where: { employerId: employerRecord.userId, isDefault: true },
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
                where: { id: paymentMethodId, employerId: employerRecord.userId },
            })
            if (!existing) {
                return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })
            }

            // Resolve the customer to attach the new PM to (reuse existing or create)
            let customerId: string | undefined = employerRecord.stripeCustomerId
            try {
                const freshPM = await stripe.paymentMethods.retrieve(stripePaymentMethodId)
                if (freshPM.customer) customerId = freshPM.customer as string
            } catch (_) { /* ignore */ }
            if (!customerId) {
                const latestPkg = await db.employerPackage.findFirst({
                    where: { employerId: employerRecord.userId, arbSubscriptionId: { startsWith: 'cus_' } },
                    orderBy: { purchasedAt: 'desc' },
                    select: { arbSubscriptionId: true },
                })
                customerId = latestPkg?.arbSubscriptionId
            }
            if (!customerId) {
                const customer = await stripe.customers.create({
                    email: userProfile?.email || '',
                    name: userProfile?.name || employerRecord.companyName || '',
                    metadata: { userId: currentUser.profile.id, role: 'employer' },
                })
                customerId = customer.id
            }

            // Persist on Employer row
            await db.employer.update({
                where: { userId: employerRecord.userId },
                data: { stripeCustomerId: customerId },
            })

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
        console.error('Error updating employer payment method:', error)
        return NextResponse.json({ error: 'Failed to update payment method' }, { status: 500 })
    }
}
