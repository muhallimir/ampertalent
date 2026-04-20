import { NextRequest, NextResponse } from 'next/server' 
import { getCurrentUser } from '@/lib/auth'
import { getPayPalClient } from '@/lib/paypal'
import { db } from '@/lib/db'
import { MembershipPlan } from '@prisma/client'
import { getServiceById } from '@/lib/additional-services'
import { getEmployerPackageById } from '@/lib/employer-packages'
import { completeSeekerOnboardingFromPendingSignup } from '@/lib/checkout-session-management'
import { NotificationService } from '@/lib/notification-service'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * POST /api/payments/paypal/execute-billing-agreement
 * Execute a PayPal Billing Agreement after user approval.
 * Called from:
 *   - /seeker/subscription/paypal-return  (logged-in seeker subscription/service)
 *   - /employer/billing/paypal-return     (logged-in employer package)
 *   - /api/payments/paypal-success        (onboarding new seeker)
 */
export async function POST(request: NextRequest) {
    const requestId = Math.random().toString(36).substring(2, 8)

    try {
        console.log(`🅿️ [${requestId}] PayPal: Executing billing agreement`)

        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const {
            token,
            planId,
            savePaymentMethod = true,
            addOnIds = [],
            customAmount,
            pendingSignupId,
            sessionToken,
            setupOnly = false,
        } = body

        if (!token || (!planId && !setupOnly)) {
            return NextResponse.json(
                { error: 'Missing required fields: token, planId (or setupOnly=true)' },
                { status: 400 }
            )
        }

        // Resolve user profile — complete onboarding first if needed
        let userProfile = await db.userProfile.findUnique({
            where: { clerkUserId: currentUser.clerkUser.id },
            include: { employer: true, jobSeeker: true },
        })

        if (!userProfile && pendingSignupId) {
            console.log(`🅿️ [${requestId}] PayPal: No profile, completing onboarding from pendingSignupId: ${pendingSignupId}`)
            try {
                const onboardingResult = await completeSeekerOnboardingFromPendingSignup(
                    pendingSignupId,
                    currentUser.clerkUser.id
                )
                if (onboardingResult.success) {
                    userProfile = await db.userProfile.findUnique({
                        where: { clerkUserId: currentUser.clerkUser.id },
                        include: { employer: true, jobSeeker: true },
                    })
                } else {
                    console.error(`❌ [${requestId}] PayPal: Onboarding failed:`, onboardingResult.error)
                }
            } catch (onboardingError) {
                console.error(`❌ [${requestId}] PayPal: Exception during onboarding:`, onboardingError)
            }
        }

        if (!userProfile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
        }

        const isSeeker = userProfile.role === 'seeker' && !!userProfile.jobSeeker
        const isEmployer = userProfile.role === 'employer' && !!userProfile.employer

        if (!isSeeker && !isEmployer) {
            return NextResponse.json({ error: 'Invalid user type' }, { status: 400 })
        }

        // Map planId to MembershipPlan enum
        const membershipPlans: Record<string, { name: string; price: number; duration: number; trialDays?: number; plan: MembershipPlan }> = {
            trial: { name: '3-Day Free Trial', price: 0, duration: 3, trialDays: 3, plan: 'trial_monthly' },
            gold: { name: 'Gold Professional', price: 49.99, duration: 60, plan: 'gold_bimonthly' },
            'vip-platinum': { name: 'VIP Platinum Professional', price: 79.99, duration: 90, plan: 'vip_quarterly' },
            'annual-platinum': { name: 'Annual Platinum Professional', price: 299.0, duration: 365, plan: 'annual_platinum' },
        }

        const planDetails = membershipPlans[planId]
        const serviceId = planId.startsWith('service_') ? planId.replace('service_', '') : planId
        const service = !planDetails ? getServiceById(serviceId) : null
        const employerPkg = !planDetails && !service ? getEmployerPackageById(planId) : null

        const isSubscriptionPurchase = !!planDetails && isSeeker
        const isPackagePurchase = !!employerPkg && isEmployer
        const isServicePurchase = !!service

        if (!planDetails && !employerPkg && !service && !setupOnly) {
            return NextResponse.json({ error: 'Invalid plan, package, or service ID' }, { status: 400 })
        }

        // Execute the billing agreement
        const paypalClient = getPayPalClient()
        const result = await paypalClient.executeBillingAgreement(token)
        console.log(`✅ [${requestId}] PayPal billing agreement executed: ${result.billingAgreementId}`)

        // ─── SETUP-ONLY: just save billing agreement as a payment method ───────
        if (setupOnly) {
            const existingMethodCount = await db.paymentMethod.count({
                where: isSeeker
                    ? { seekerId: userProfile.jobSeeker!.userId }
                    : { employerId: userProfile.employer!.userId },
            })
            if (existingMethodCount > 0) {
                await db.paymentMethod.updateMany({
                    where: isSeeker
                        ? { seekerId: userProfile.jobSeeker!.userId, isDefault: true }
                        : { employerId: userProfile.employer!.userId, isDefault: true },
                    data: { isDefault: false },
                })
            }
            await db.paymentMethod.create({
                data: {
                    ...(isSeeker ? { seekerId: userProfile.jobSeeker!.userId } : { employerId: userProfile.employer!.userId }),
                    type: 'paypal',
                    last4: userProfile.email?.split('@')[0]?.slice(-4) || 'acct',
                    brand: 'PayPal',
                    expiryMonth: 0,
                    expiryYear: 0,
                    isDefault: existingMethodCount === 0,
                    authnetPaymentProfileId: `PAYPAL|${result.billingAgreementId}`,
                },
            })
            console.log(`✅ [${requestId}] PayPal: Saved billing agreement as payment method (setup-only)`)
            return NextResponse.json({ success: true, setupOnly: true, billingAgreementId: result.billingAgreementId })
        }
        // ────────────────────────────────────────────────────────────────────────

        // Determine if immediate charge is needed
        const isTrial = planId === 'trial'
        const needsImmediateCharge = !isTrial && (isPackagePurchase || isServicePurchase || (!!planDetails && !isTrial))

        let paypalTransactionId: string | undefined

        if (needsImmediateCharge) {
            let chargeAmount: number
            let chargeDescription: string

            if (isPackagePurchase && employerPkg) {
                chargeAmount = customAmount !== undefined ? customAmount : employerPkg.price
                chargeDescription = `${employerPkg.name} - Employer Package`
            } else if (isServicePurchase && service) {
                chargeAmount = service.price
                chargeDescription = `${service.name} - Premium Service`
            } else if (planDetails) {
                chargeAmount = planDetails.price
                chargeDescription = `${planDetails.name} - Subscription`
            } else {
                return NextResponse.json({ error: 'Could not determine charge amount' }, { status: 400 })
            }

            const chargeResult = await paypalClient.chargeReferenceTransaction({
                billingAgreementId: result.billingAgreementId,
                amount: chargeAmount,
                currency: 'USD',
                description: chargeDescription,
                invoiceNumber: `PP-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
            })

            if (!chargeResult.success) {
                return NextResponse.json(
                    { error: 'PayPal payment failed', details: chargeResult.error },
                    { status: 400 }
                )
            }

            paypalTransactionId = chargeResult.transactionId
            console.log(`✅ [${requestId}] PayPal charge successful: ${paypalTransactionId}`)
        }

        // Save payment method
        if (savePaymentMethod) {
            const storedId = `PAYPAL|${result.billingAgreementId}`
            const payerDisplay = result.payerEmail?.slice(-8) || 'PayPal'
            const ownerId = isSeeker ? userProfile.id : (userProfile.employer?.userId || userProfile.id)
            const ownerField = isSeeker ? 'seeker_id' : 'employer_id'

            const existingMethods = await db.$queryRaw<Array<{ id: string }>>`
                SELECT id FROM payment_methods
                WHERE ${isSeeker ? db.$queryRaw`seeker_id` : db.$queryRaw`employer_id`} = ${ownerId}
                AND authnet_payment_profile_id LIKE 'PAYPAL|%'
                LIMIT 1
            `.catch(() => [] as Array<{ id: string }>)

            // Use raw SQL to handle dynamic column
            if (existingMethods.length > 0) {
                await db.$executeRawUnsafe(
                    `UPDATE payment_methods SET authnet_payment_profile_id = $1, last4 = $2, brand = 'paypal', updated_at = NOW() WHERE id = $3`,
                    storedId, payerDisplay, existingMethods[0].id
                )
            } else {
                await db.$executeRawUnsafe(
                    `UPDATE payment_methods SET is_default = false WHERE ${ownerField} = $1`,
                    ownerId
                )
                const pmId = `pm_paypal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                await db.$executeRawUnsafe(
                    `INSERT INTO payment_methods (id, ${ownerField}, type, last4, brand, expiry_month, expiry_year, is_default, authnet_payment_profile_id, created_at, updated_at)
                     VALUES ($1, $2, 'paypal', $3, 'paypal', 12, 2099, true, $4, NOW(), NOW())`,
                    pmId, ownerId, payerDisplay, storedId
                )
            }
            console.log(`✅ [${requestId}] PayPal payment method saved`)
        }

        // Process purchase based on type
        let subscriptionId: string | undefined
        let servicePurchaseId: string | undefined
        let employerPackageId: string | undefined

        if (isServicePurchase && service && isSeeker) {
            // Create service purchase record
            const purchaseId = `asp_paypal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            await db.$executeRaw`
                INSERT INTO additional_service_purchases (id, service_id, user_id, seeker_id, amount_paid, status, created_at, updated_at)
                VALUES (${purchaseId}, ${service.id}, ${userProfile.id}, ${userProfile.id}, ${service.price}, 'pending', NOW(), NOW())
            `
            servicePurchaseId = purchaseId

        } else if (isSubscriptionPurchase && planDetails && userProfile.jobSeeker) {
            // Create external payment record (required by Subscription FK constraint)
            const amountPaid = isTrial ? 0 : planDetails.price
            const externalPayment = await db.externalPayment.create({
                data: {
                    userId: userProfile.id,
                    amount: new Decimal(amountPaid.toFixed(2)),
                    planId,
                    status: 'completed',
                    webhookProcessedAt: new Date(),
                },
            })

            // Deactivate any existing active subscriptions
            await db.subscription.updateMany({
                where: { seekerId: userProfile.id, status: 'active' },
                data: { status: 'canceled' },
            })

            const periodEnd = new Date(Date.now() + planDetails.duration * 24 * 60 * 60 * 1000)
            const subscription = await db.subscription.create({
                data: {
                    seekerId: userProfile.jobSeeker.userId,
                    plan: planDetails.plan,
                    status: 'active',
                    externalPaymentId: externalPayment.id,
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: periodEnd,
                    nextBillingDate: periodEnd,
                    authnetCustomerId: `PAYPAL|${result.billingAgreementId}`,
                },
            })

            // Update job seeker membership
            await db.jobSeeker.update({
                where: { userId: userProfile.jobSeeker.userId },
                data: {
                    membershipPlan: planDetails.plan,
                    membershipExpiresAt: periodEnd,
                    isOnTrial: isTrial,
                    trialEndsAt: isTrial ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : null,
                },
            })

            subscriptionId = subscription.id
            console.log(`✅ [${requestId}] PayPal: Subscription created: ${subscriptionId}`)

        } else if (isPackagePurchase && employerPkg && userProfile.employer) {
            // Create employer package
            const pkg = await db.employerPackage.create({
                data: {
                    employerId: userProfile.employer.userId,
                    packageType: planId as any,
                    listingsRemaining: 1,
                    purchasedAt: new Date(),
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    arbSubscriptionId: `PAYPAL|${result.billingAgreementId}`,
                },
            })
            await db.employer.update({
                where: { userId: userProfile.employer.userId },
                data: { currentPackageId: pkg.id },
            })
            employerPackageId = pkg.id
        }

        // Clean up pending signup after successful onboarding
        if (pendingSignupId) {
            await db.pendingSignup.delete({ where: { id: pendingSignupId } }).catch(() => null)
        }

        // Send admin + customer notification emails
        try {
            const orderDate = new Date()
            const orderNumber = `ORD-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${(paypalTransactionId || result.billingAgreementId).slice(-4)}`
            const productName = planDetails?.name || service?.name || employerPkg?.name || planId
            const chargedAmount = isTrial ? 0 : (planDetails?.price || service?.price || (customAmount ?? employerPkg?.price) || 0)
            const customerName = isEmployer
                ? (userProfile.employer as any)?.companyName || userProfile.name || 'Employer'
                : userProfile.name || 'Seeker'
            const customerType = isEmployer ? 'Employer' : 'Seeker'

            await NotificationService.sendAdminPaymentNotification({
                orderNumber,
                orderDate: orderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                customerName,
                customerType,
                customerId: userProfile.id,
                customerEmail: userProfile.email || '',
                productDescription: isTrial ? `${productName} (Free Trial)` : productName,
                quantity: 1,
                price: chargedAmount,
                paymentType: 'paypal',
                isRenewal: false,
                transactionId: paypalTransactionId || result.billingAgreementId,
            })

            await NotificationService.sendCustomerPaymentConfirmationEmail({
                email: userProfile.email || '',
                firstName: userProfile.firstName || userProfile.name?.split(' ')[0] || 'Valued Customer',
                amount: chargedAmount,
                description: isTrial ? `${productName} (Free Trial - No Charge Today)` : productName,
                transactionId: paypalTransactionId || result.billingAgreementId,
                paymentType: 'paypal',
                isTrial,
                isRecurring: isSubscriptionPurchase && !isTrial,
            })
        } catch (emailError) {
            console.error(`⚠️ [${requestId}] PayPal: Email sending failed (non-blocking):`, emailError)
        }

        return NextResponse.json({
            success: true,
            billingAgreementId: result.billingAgreementId,
            subscriptionId,
            servicePurchaseId,
            employerPackageId,
            message: 'PayPal payment processed successfully',
        })
    } catch (error) {
        console.error(`❌ [${requestId}] PayPal execute billing agreement error:`, error)
        return NextResponse.json(
            { error: 'Failed to execute PayPal billing agreement' },
            { status: 500 }
        )
    }
}
