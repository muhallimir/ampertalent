/**
 * API for activating an exclusive plan after payment
 * POST - Process payment and activate the exclusive plan
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
// import { getAuthorizeNetClient } from '@/lib/authorize-net'
// import { isPayPalPaymentMethod, extractBillingAgreementId, getPayPalClient } from '@/lib/paypal'
import { INVITATION_PACKAGE_CONFIG } from '@/lib/employer-package-provisioning'
import { InAppNotificationService } from '@/lib/in-app-notification-service'
// CRM sync removed - not configured for ampertalent
import { NotificationService } from '@/lib/notification-service'

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.profile || currentUser.profile.role !== 'employer') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { paymentMethodId } = body

        // Get employer with exclusive plan info and payment methods
        const employer = await db.employer.findUnique({
            where: { userId: currentUser.profile.id },
            select: {
                userId: true,
                companyName: true,
                billingAddress: true,
                exclusivePlanType: true,
                exclusivePlanAmountCents: true,
                exclusivePlanActivatedAt: true,
                paymentMethods: paymentMethodId ? {
                    where: { id: paymentMethodId }
                } : {
                    where: { isDefault: true },
                    take: 1
                },
                user: {
                    select: { name: true, email: true }
                }
            }
        })

        if (!employer) {
            return NextResponse.json({ error: 'Employer not found' }, { status: 404 })
        }

        if (!employer.exclusivePlanType) {
            return NextResponse.json({ error: 'No exclusive plan offer found' }, { status: 400 })
        }

        if (employer.exclusivePlanActivatedAt) {
            return NextResponse.json({ error: 'Exclusive plan already activated' }, { status: 400 })
        }

        const packageConfig = INVITATION_PACKAGE_CONFIG[employer.exclusivePlanType]
        if (!packageConfig) {
            return NextResponse.json({ error: 'Invalid package configuration' }, { status: 400 })
        }

        const amountCents = employer.exclusivePlanAmountCents || packageConfig.amountCents
        const amountDollars = amountCents / 100

        // Get payment method
        const paymentMethod = employer.paymentMethods[0]
        if (!paymentMethod) {
            return NextResponse.json({
                error: 'No payment method found. Please add a payment method first.',
                requiresPaymentMethod: true
            }, { status: 400 })
        }

        let paymentResult: { success: boolean; transactionId?: string; error?: string }

        // Check if PayPal or AuthNet
        if (paymentMethod.authnetPaymentProfileId && isPayPalPaymentMethod(paymentMethod.authnetPaymentProfileId)) {
            // PayPal payment
            const billingAgreementId = extractBillingAgreementId(paymentMethod.authnetPaymentProfileId)
            if (!billingAgreementId) {
                return NextResponse.json({ error: 'Invalid PayPal payment method' }, { status: 400 })
            }

            const paypalClient = getPayPalClient()
            const paypalResult = await paypalClient.chargeReferenceTransaction({
                billingAgreementId,
                amount: amountDollars,
                description: `${packageConfig.packageName} - First Payment`,
                invoiceNumber: `EXC-${currentUser.profile.id}-${Date.now()}`
            })

            paymentResult = {
                success: paypalResult.success,
                transactionId: paypalResult.transactionId,
                error: paypalResult.error
            }
        } else if (paymentMethod.authnetPaymentProfileId) {
            // AuthNet payment
            const [customerProfileId, paymentProfileId] = paymentMethod.authnetPaymentProfileId.split('|')

            if (!customerProfileId || !paymentProfileId) {
                return NextResponse.json({ error: 'Invalid payment profile' }, { status: 400 })
            }

            const authorizeNetClient = getAuthorizeNetClient()
            const authnetResult = await authorizeNetClient.createTransaction({
                transactionType: 'authCaptureTransaction',
                amount: amountDollars.toFixed(2),
                profile: {
                    customerProfileId,
                    paymentProfile: { paymentProfileId }
                },
                order: {
                    invoiceNumber: `EXC-${Date.now()}`,
                    description: `${packageConfig.packageName} - First Payment`
                }
            })

            paymentResult = {
                success: authnetResult.success,
                transactionId: authnetResult.transactionId,
                error: authnetResult.errors?.[0]?.errorText
            }
        } else {
            // Development mode - no real payment profile
            console.log('⚠️ NO PAYMENT PROFILE: Using simulated payment for development')
            paymentResult = {
                success: true,
                transactionId: `DEV-${Date.now()}`
            }
        }

        if (!paymentResult.success) {
            return NextResponse.json({
                error: paymentResult.error || 'Payment failed',
                paymentError: true
            }, { status: 400 })
        }

        // Calculate expiration date
        const expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + packageConfig.durationMonths)

        // Calculate next billing date (1 month from now for recurring)
        let nextBillingDate: Date | null = null
        if (packageConfig.isRecurring) {
            nextBillingDate = new Date()
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
        }

        // Create the employer package
        const employerPackage = await db.employerPackage.create({
            data: {
                employerId: currentUser.profile.id,
                packageType: packageConfig.packageType,
                listingsRemaining: packageConfig.listingsRemaining,
                featuredListingsRemaining: packageConfig.featuredListingsRemaining,
                expiresAt,
                isRecurring: packageConfig.isRecurring,
                billingFrequency: packageConfig.billingFrequency,
                billingCyclesTotal: packageConfig.billingCyclesTotal,
                billingCyclesCompleted: 1,
                nextBillingDate,
                recurringAmountCents: amountCents,
                recurringStatus: 'active',
            }
        })

        // Update employer - use raw query to handle new fields
        await db.$executeRaw`
      UPDATE employers 
      SET current_package_id = ${employerPackage.id},
          exclusive_plan_activated_at = NOW(),
          updated_at = NOW()
      WHERE user_id = ${currentUser.profile.id}
    `

        // Create invoice
        await db.invoice.create({
            data: {
                employerPackageId: employerPackage.id,
                amountDue: amountCents,
                status: 'paid',
                description: `First payment for ${packageConfig.packageName}`,
                packageName: packageConfig.packageName,
                authnetTransactionId: paymentResult.transactionId || null,
                paidAt: new Date(),
                dueDate: new Date()
            }
        })

        // Record activation in external_payments so it appears in the Sales Transaction tab as N
        // PayPal transactions use ghlTransactionId with PAYPAL_ prefix; AuthNet use authnetTransactionId
        const isPayPalTxn = paymentResult.transactionId?.startsWith('PAYID-') ||
            (paymentMethod.authnetPaymentProfileId ? isPayPalPaymentMethod(paymentMethod.authnetPaymentProfileId) : false)
        try {
            await db.externalPayment.create({
                data: {
                    userId: currentUser.profile.id,
                    planId: packageConfig.packageType,
                    amount: amountCents / 100,
                    status: 'completed',
                    authnetTransactionId: isPayPalTxn ? null : (paymentResult.transactionId || null),
                    ghlTransactionId: isPayPalTxn ? `PAYPAL_${paymentResult.transactionId}` : null,
                    webhookProcessedAt: new Date(),
                }
            })
            console.log('✅ EXCLUSIVE-PLAN: Activation recorded in external_payments for Sales tab')
        } catch (epError) {
            console.error('⚠️ EXCLUSIVE-PLAN: Failed to write external_payment (non-fatal):', epError)
        }

        // CRM sync skipped - not configured for ampertalent

        // Send notifications
        const employerName = employer.user.name || employer.companyName
        const employerEmail = employer.user.email || ''

        // Notify employer
        await InAppNotificationService.notifyExclusivePlanActivated(
            currentUser.profile.id,
            packageConfig.packageName,
            amountCents
        )

        // Notify admins
        await InAppNotificationService.notifyAdminExclusivePlanActivated(
            employerName,
            employerEmail,
            currentUser.profile.id,
            packageConfig.packageName,
            amountCents,
            paymentResult.transactionId || 'N/A'
        )

        // Send admin order notification EMAIL (Resend)
        try {
            const orderDate = new Date()
            const orderNumber = `EXC-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${employerPackage.id.slice(-6).toUpperCase()}`
            const paymentMethodType = paymentMethod.authnetPaymentProfileId &&
                isPayPalPaymentMethod(paymentMethod.authnetPaymentProfileId) ? 'PayPal' : 'Credit Card (Authorize.net)'

            // Parse billing address if available
            let parsedBillingAddress: { name?: string; address?: string; city?: string; state?: string; zip?: string; country?: string } | undefined
            if (employer.billingAddress) {
                try {
                    parsedBillingAddress = JSON.parse(employer.billingAddress)
                } catch {
                    const parts = employer.billingAddress.split('|').map(p => p.trim())
                    if (parts.length >= 3) {
                        const cityStateZip = parts[2] || ''
                        const cityStateMatch = cityStateZip.match(/^(.+),\s*([A-Z]{2})\s*(\d{5})?/)
                        parsedBillingAddress = {
                            name: parts[0],
                            address: parts[1],
                            city: cityStateMatch?.[1] || '',
                            state: cityStateMatch?.[2] || '',
                            zip: cityStateMatch?.[3] || '',
                            country: parts[3] || 'United States'
                        }
                    }
                }
            }

            await NotificationService.sendAdminPaymentNotification({
                orderNumber,
                orderDate: orderDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short'
                }),
                customerName: employerName,
                customerType: 'Employer',
                customerId: currentUser.profile.id,
                customerEmail: employerEmail,
                productDescription: `${packageConfig.packageName} (Exclusive Plan)`,
                price: amountDollars,
                paymentMethod: paymentMethodType,
                transactionId: paymentResult.transactionId || undefined,
                subscriptionStartDate: new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                subscriptionEndDate: expiresAt.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                nextPaymentDate: nextBillingDate?.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                billingAddress: parsedBillingAddress,
                paymentType: paymentMethodType === 'PayPal' ? 'paypal' : 'card',
            })
            console.log('✅ EXCLUSIVE-PLAN: Admin order notification email sent')

            // Send customer payment confirmation email - queued with feature flag
            await NotificationService.sendCustomerPaymentConfirmationEmail({
                email: employerEmail,
                firstName: employerName || 'Valued Customer',
                amount: amountDollars,
                description: `${packageConfig.packageName} (Exclusive Plan)`,
                transactionId: paymentResult.transactionId || 'N/A',
                lineItems: [{ name: `${packageConfig.packageName} (Exclusive Plan)`, amount: amountDollars }],
                isRecurring: true,
                paymentType: 'card',
                paymentMethod: !(paymentMethod.authnetPaymentProfileId && isPayPalPaymentMethod(paymentMethod.authnetPaymentProfileId)) && paymentMethod?.last4
                    ? `Card ending in ${paymentMethod.last4}`
                    : undefined,
            })
            console.log('✅ EXCLUSIVE-PLAN: Customer payment confirmation email queued')
        } catch (emailError) {
            console.error('⚠️ EXCLUSIVE-PLAN: Email notification failed:', emailError)
        }

        console.log(`✅ Exclusive plan activated for employer ${currentUser.profile.id}: ${packageConfig.packageName}`)

        return NextResponse.json({
            success: true,
            message: 'Exclusive plan activated successfully!',
            package: {
                id: employerPackage.id,
                type: employerPackage.packageType,
                name: packageConfig.packageName,
                listingsRemaining: employerPackage.listingsRemaining,
                featuredListingsRemaining: employerPackage.featuredListingsRemaining,
                expiresAt: employerPackage.expiresAt,
                nextBillingDate: employerPackage.nextBillingDate,
                monthlyAmount: amountDollars,
                totalMonths: packageConfig.billingCyclesTotal,
            }
        })
    } catch (error) {
        console.error('Error activating exclusive plan:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
