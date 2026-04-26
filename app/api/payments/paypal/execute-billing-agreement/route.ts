import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getPayPalClient, formatPayPalStorageId } from '@/lib/paypal'
import { db } from '@/lib/db'
import { MembershipPlan, PackageType } from '@prisma/client'
import { getServiceById } from '@/lib/additional-services'
import { getEmployerPackageById } from '@/lib/employer-packages'
import { completeSeekerOnboardingFromPendingSignup } from '@/lib/checkout-session-management'
import { NotificationService } from '@/lib/notification-service'

/**
 * POST /api/payments/paypal/execute-billing-agreement
 * Execute a PayPal Billing Agreement after user approval.
 * Mirrors HireMyMom implementation exactly — adapted for ampertalent schema.
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

        // ── Resolve user profile — complete onboarding first if needed ───────
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

        // ── Plan / package / service lookup ──────────────────────────────────
        const membershipPlans: Record<string, {
            name: string; price: number; duration: number; trialDays?: number; plan: MembershipPlan
        }> = {
            trial: { name: '3-Day Free Trial', price: 0, duration: 3, trialDays: 3, plan: 'trial_monthly' },
            gold: { name: 'Gold Professional', price: 49.99, duration: 60, plan: 'gold_bimonthly' },
            'vip-platinum': { name: 'VIP Platinum Professional', price: 79.99, duration: 90, plan: 'vip_quarterly' },
            'annual-platinum': { name: 'Annual Platinum Professional', price: 299.0, duration: 365, plan: 'annual_platinum' },
        }

        const planDetails = planId ? membershipPlans[planId] : undefined
        const employerPkg = planId && !planDetails ? getEmployerPackageById(planId) : undefined
        const serviceId = planId?.startsWith('service_') ? planId.replace('service_', '') : (planId || '')
        const service = planId && !planDetails && !employerPkg ? getServiceById(serviceId) : undefined

        const isSubscriptionPurchase = !!planDetails && isSeeker
        const isPackagePurchase = !!employerPkg && isEmployer
        const isServicePurchase = !!service

        if (!setupOnly && !planDetails && !employerPkg && !service) {
            console.error(`❌ [${requestId}] Invalid plan/package/service ID: ${planId}`)
            return NextResponse.json({ error: 'Invalid plan, package, or service ID' }, { status: 400 })
        }

        // ── Execute the billing agreement ─────────────────────────────────────
        const paypalClient = getPayPalClient()
        if (!paypalClient.isConfigured()) {
            console.error(`❌ [${requestId}] PayPal not configured — check NEXT_PUBLIC_PAYPAL_CLIENT_ID + PAYPAL_CLIENT_SECRET`)
            return NextResponse.json({ error: 'PayPal is not configured on this server.' }, { status: 503 })
        }

        let result: Awaited<ReturnType<typeof paypalClient.executeBillingAgreement>>
        try {
            result = await paypalClient.executeBillingAgreement(token)
        } catch (execError: any) {
            console.error(`❌ [${requestId}] PayPal executeBillingAgreement failed:`, execError?.message)
            return NextResponse.json(
                { error: 'Failed to execute PayPal billing agreement', details: execError?.message },
                { status: 502 }
            )
        }
        console.log(`✅ [${requestId}] PayPal billing agreement executed: ${result.billingAgreementId}`)

        // ── SETUP-ONLY: just save billing agreement as payment method ─────────
        if (setupOnly) {
            const existingCount = await db.paymentMethod.count({
                where: isSeeker
                    ? { seekerId: userProfile.jobSeeker!.userId }
                    : { employerId: userProfile.employer!.userId },
            })
            if (existingCount > 0) {
                await db.paymentMethod.updateMany({
                    where: isSeeker
                        ? { seekerId: userProfile.jobSeeker!.userId, isDefault: true }
                        : { employerId: userProfile.employer!.userId, isDefault: true },
                    data: { isDefault: false },
                })
            }
            await db.paymentMethod.create({
                data: {
                    ...(isSeeker
                        ? { seekerId: userProfile.jobSeeker!.userId }
                        : { employerId: userProfile.employer!.userId }),
                    type: 'paypal',
                    last4: result.payerEmail?.slice(-8) || 'acct',
                    brand: 'PayPal',
                    expiryMonth: 12,
                    expiryYear: 2099,
                    isDefault: existingCount === 0,
                    authnetPaymentProfileId: formatPayPalStorageId(result.billingAgreementId),
                },
            })
            console.log(`✅ [${requestId}] PayPal: Saved billing agreement as payment method (setup-only)`)
            return NextResponse.json({ success: true, setupOnly: true, billingAgreementId: result.billingAgreementId })
        }

        // ── Charge immediately if needed ──────────────────────────────────────
        const isTrial = planId === 'trial'
        const needsImmediateCharge = !isTrial && (isPackagePurchase || isServicePurchase || (!!planDetails && !isTrial))

        let paypalTransactionId: string | undefined
        let paypalSaleId: string | undefined

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

            console.log(`💰 [${requestId}] Charging PayPal: $${chargeAmount} for ${chargeDescription}`)

            const chargeResult = await paypalClient.chargeReferenceTransaction({
                billingAgreementId: result.billingAgreementId,
                amount: chargeAmount,
                currency: 'USD',
                description: chargeDescription,
                invoiceNumber: `AT-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
            })

            if (!chargeResult.success) {
                console.error(`❌ [${requestId}] PayPal charge failed:`, chargeResult.error, chargeResult.errorDetails)
                return NextResponse.json(
                    { error: 'PayPal payment failed', details: chargeResult.error, errorDetails: chargeResult.errorDetails },
                    { status: 400 }
                )
            }

            paypalTransactionId = chargeResult.transactionId
            paypalSaleId = chargeResult.saleId
            console.log(`✅ [${requestId}] PayPal charge successful: txn=${paypalTransactionId} sale=${paypalSaleId}`)
        }

        // ── Save payment method ───────────────────────────────────────────────
        if (savePaymentMethod) {
            const storedId = formatPayPalStorageId(result.billingAgreementId)
            const payerDisplay = result.payerEmail?.slice(-8) || 'PayPal'
            const ownerId = isSeeker ? userProfile.id : userProfile.id

            if (isSeeker) {
                const existing = await db.$queryRaw<Array<{ id: string }>>`
                    SELECT id FROM payment_methods WHERE seeker_id = ${ownerId}
                    AND authnet_payment_profile_id LIKE 'PAYPAL|%' LIMIT 1
                `
                if (existing.length > 0) {
                    await db.$executeRaw`
                        UPDATE payment_methods SET authnet_payment_profile_id = ${storedId},
                        brand = 'paypal', last4 = ${payerDisplay}, updated_at = NOW()
                        WHERE id = ${existing[0].id}
                    `
                } else {
                    await db.$executeRaw`UPDATE payment_methods SET is_default = false WHERE seeker_id = ${ownerId}`
                    const pmId = `pm_paypal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                    await db.$executeRaw`
                        INSERT INTO payment_methods (id, seeker_id, type, last4, brand, expiry_month, expiry_year, is_default, authnet_payment_profile_id, created_at, updated_at)
                        VALUES (${pmId}, ${ownerId}, 'paypal', ${payerDisplay}, 'paypal', 12, 2099, true, ${storedId}, NOW(), NOW())
                    `
                }
            } else {
                const existing = await db.$queryRaw<Array<{ id: string }>>`
                    SELECT id FROM payment_methods WHERE employer_id = ${ownerId}
                    AND authnet_payment_profile_id LIKE 'PAYPAL|%' LIMIT 1
                `
                if (existing.length > 0) {
                    await db.$executeRaw`
                        UPDATE payment_methods SET authnet_payment_profile_id = ${storedId},
                        brand = 'paypal', last4 = ${payerDisplay}, updated_at = NOW()
                        WHERE id = ${existing[0].id}
                    `
                } else {
                    await db.$executeRaw`UPDATE payment_methods SET is_default = false WHERE employer_id = ${ownerId}`
                    const pmId = `pm_paypal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                    await db.$executeRaw`
                        INSERT INTO payment_methods (id, employer_id, type, last4, brand, expiry_month, expiry_year, is_default, authnet_payment_profile_id, created_at, updated_at)
                        VALUES (${pmId}, ${ownerId}, 'paypal', ${payerDisplay}, 'paypal', 12, 2099, true, ${storedId}, NOW(), NOW())
                    `
                }
            }
            console.log(`✅ [${requestId}] PayPal payment method saved`)
        }

        // ── Process based on purchase type ────────────────────────────────────
        let subscriptionId: string | undefined
        let servicePurchaseId: string | undefined
        let employerPackageId: string | undefined

        if (isServicePurchase && service && isSeeker) {
            const purchaseId = `asp_paypal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            await db.$executeRaw`
                INSERT INTO additional_service_purchases (id, service_id, user_id, seeker_id, amount_paid, status, created_at, updated_at)
                VALUES (${purchaseId}, ${service.id}, ${userProfile.id}, ${userProfile.id}, ${service.price}, 'pending', NOW(), NOW())
            `
            servicePurchaseId = purchaseId
            console.log(`✅ [${requestId}] Service purchase created: ${purchaseId}`)

        } else if (isSubscriptionPurchase && planDetails && userProfile.jobSeeker) {
            const seekerUserId = userProfile.jobSeeker.userId

            // External payment record (required by Subscription FK)
            const externalPayment = await db.externalPayment.create({
                data: {
                    userId: userProfile.id,
                    ghlTransactionId: `PAYPAL_${result.billingAgreementId}`,
                    amount: isTrial ? 0 : planDetails.price,
                    planId,
                    status: 'completed',
                    webhookProcessedAt: new Date(),
                },
            })

            const now = new Date()
            const periodEnd = new Date(now.getTime() + planDetails.duration * 24 * 60 * 60 * 1000)

            // Deactivate existing active subscriptions
            await db.subscription.updateMany({
                where: { seekerId: userProfile.id, status: 'active' },
                data: { status: 'canceled' },
            })

            const subscription = await db.subscription.create({
                data: {
                    seekerId: seekerUserId,
                    plan: planDetails.plan,
                    status: 'active',
                    externalPaymentId: externalPayment.id,
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                    authnetCustomerId: formatPayPalStorageId(result.billingAgreementId),
                },
            })

            await db.jobSeeker.update({
                where: { userId: seekerUserId },
                data: {
                    membershipPlan: planDetails.plan,
                    membershipExpiresAt: periodEnd,
                    isOnTrial: isTrial,
                    trialEndsAt: isTrial ? new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) : null,
                },
            })

            subscriptionId = subscription.id
            console.log(`✅ [${requestId}] Subscription created: ${subscriptionId} (${planDetails.plan})`)

        } else if (isPackagePurchase && employerPkg && userProfile.employer) {
            const employerUserId = userProfile.employer.userId
            const expiresAt = new Date(Date.now() + (employerPkg.duration || 30) * 24 * 60 * 60 * 1000)

            // Map package ID to PackageType enum
            const packageTypeMap: Record<string, PackageType> = {
                'standard': 'standard_job_post',
                'featured': 'featured_job_post',
                'email_blast': 'email_blast',
                'gold_plus': 'gold_plus',
                'concierge_lite': 'concierge_lite',
                'concierge_level_1': 'concierge_level_1',
                'concierge_level_2': 'concierge_level_2',
                'concierge_level_3': 'concierge_level_3',
            }
            const packageType: PackageType = packageTypeMap[employerPkg.id] || 'standard_job_post'

            const pkg = await db.employerPackage.create({
                data: {
                    employerId: employerUserId,
                    packageType,
                    listingsRemaining: employerPkg.listings ?? 1,
                    featuredListingsRemaining: employerPkg.featuredListings ?? 0,
                    expiresAt,
                    purchasedAt: new Date(),
                    arbSubscriptionId: formatPayPalStorageId(result.billingAgreementId),
                },
            })

            await db.employer.update({
                where: { userId: employerUserId },
                data: { currentPackageId: pkg.id },
            })

            // Invoice record
            try {
                await db.invoice.create({
                    data: {
                        employerPackageId: pkg.id,
                        authnetTransactionId: null,
                        amountDue: Math.round((customAmount ?? employerPkg.price) * 100),
                        status: 'paid',
                        description: `${employerPkg.name} - ${userProfile.employer.companyName || userProfile.name}`,
                        packageName: employerPkg.name,
                        paidAt: new Date(),
                    },
                })
            } catch (invoiceErr) {
                console.error(`⚠️ [${requestId}] Invoice creation failed (non-blocking):`, invoiceErr)
            }

            employerPackageId = pkg.id
            console.log(`✅ [${requestId}] Employer package created: ${pkg.id} (${employerPkg.name})`)
        }

        // ── Clean up pending signup ───────────────────────────────────────────
        if (pendingSignupId) {
            await db.pendingSignup.delete({ where: { id: pendingSignupId } }).catch(() => null)
        }

        // ── Send emails (non-blocking) ────────────────────────────────────────
        try {
            const orderDate = new Date()
            const orderDateStr = orderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
            const orderSuffix = (paypalTransactionId || result.billingAgreementId).slice(-4).toUpperCase()
            const orderNumber = `ORD-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${orderSuffix}`
            const productName = planDetails?.name || service?.name || employerPkg?.name || planId
            const chargedAmount = isTrial ? 0 : (planDetails?.price ?? service?.price ?? customAmount ?? employerPkg?.price ?? 0)
            const customerName = isEmployer
                ? (userProfile.employer?.companyName || userProfile.name || 'Employer')
                : (userProfile.name || 'Seeker')

            await NotificationService.sendAdminPaymentNotification({
                orderNumber,
                orderDate: orderDateStr,
                customerName,
                customerType: isEmployer ? 'Employer' : 'Seeker',
                customerId: userProfile.id,
                customerEmail: userProfile.email || '',
                productDescription: isTrial ? `${productName} (Free Trial)` : productName,
                quantity: 1,
                price: chargedAmount,
                paymentType: 'paypal',
                isRenewal: false,
                transactionId: paypalTransactionId || `PAYPAL_${result.billingAgreementId}`,
            })

            await NotificationService.sendCustomerPaymentConfirmationEmail({
                email: userProfile.email || '',
                firstName: userProfile.firstName || userProfile.name?.split(' ')[0] || 'Valued Customer',
                amount: chargedAmount,
                description: isTrial ? `${productName} (Free Trial - No Charge Today)` : productName,
                transactionId: paypalTransactionId || `PAYPAL_${result.billingAgreementId}`,
                paymentType: 'paypal',
                isTrial,
                isRecurring: isSubscriptionPurchase && !isTrial,
            })
        } catch (emailErr) {
            console.error(`⚠️ [${requestId}] Email sending failed (non-blocking):`, emailErr)
        }

        // ── Response ──────────────────────────────────────────────────────────
        const pendingNotification = (() => {
            if (isSeeker && planDetails) {
                return {
                    type: 'welcome',
                    title: isTrial ? 'Welcome to AmperTalent! 🎉' : 'Subscription Activated! 🎉',
                    message: isTrial
                        ? 'Your 3-day free trial is now active. Enjoy full access!'
                        : `Your ${planDetails.name} subscription is now active.`,
                    showToast: true, toastVariant: 'success', toastDuration: 8000,
                }
            }
            if (isSeeker && service) {
                return {
                    type: 'purchase', title: 'Service Purchased! ✅',
                    message: `Your ${service.name} has been purchased. Our team will reach out shortly.`,
                    showToast: true, toastVariant: 'success', toastDuration: 6000,
                }
            }
            if (isPackagePurchase && employerPkg) {
                return {
                    type: 'purchase', title: 'Package Purchased! 🎉',
                    message: `Your ${employerPkg.name} package is ready. Start posting jobs now!`,
                    showToast: true, toastVariant: 'success', toastDuration: 6000,
                }
            }
        })()

        return NextResponse.json({
            success: true,
            billingAgreementId: result.billingAgreementId,
            payerEmail: result.payerEmail,
            transactionId: paypalTransactionId,
            saleId: paypalSaleId,
            charged: !!paypalTransactionId,
            subscriptionId,
            servicePurchaseId,
            employerPackageId,
            planId,
            pendingNotification,
            message: isPackagePurchase
                ? 'Employer package purchased successfully via PayPal'
                : isServicePurchase
                    ? 'Service purchased successfully via PayPal'
                    : paypalTransactionId
                        ? 'PayPal payment processed successfully'
                        : 'PayPal trial subscription activated',
        })

    } catch (error: any) {
        console.error(`❌ [${requestId}] PayPal execute billing agreement error:`, error)
        return NextResponse.json(
            { error: 'Failed to execute PayPal billing agreement', details: error?.message },
            { status: 500 }
        )
    }
}
