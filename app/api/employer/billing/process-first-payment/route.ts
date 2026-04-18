import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { activatePackageAfterPayment, hasPendingPackagePayment } from '@/lib/employer-package-provisioning'
import { NotificationService } from '@/lib/notification-service'
import stripe from '@/lib/stripe'

// Helper to detect PayPal payment method (stored as PAYPAL|B-xxxx)
const isPayPalPaymentMethod = (id: string) => id.startsWith('PAYPAL|')
const extractBillingAgreementId = (id: string) => id.replace('PAYPAL|', '')

/**
 * GET /api/employer/billing/process-first-payment
 * Check if the employer has a pending package payment
 */
export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.profile?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { hasPending, package: pendingPackage } = await hasPendingPackagePayment(currentUser.profile.id)

        if (!hasPending || !pendingPackage) {
            return NextResponse.json({ hasPendingPayment: false })
        }

        return NextResponse.json({
            hasPendingPayment: true,
            package: {
                id: pendingPackage.id,
                type: pendingPackage.packageType,
                amount: (pendingPackage.recurringAmountCents || 0) / 100,
                billingCycles: pendingPackage.billingCyclesTotal,
                description: `$${((pendingPackage.recurringAmountCents || 0) / 100).toFixed(2)}/month for ${pendingPackage.billingCyclesTotal} months`,
            },
        })
    } catch (error: any) {
        console.error('❌ Error checking pending payment:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * POST /api/employer/billing/process-first-payment
 * Processes the first payment for a recurring employer package.
 * Supports Stripe (payment intent) and PayPal (reference transaction).
 */
export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.profile?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const employer = await db.employer.findUnique({
            where: { userId: currentUser.profile.id },
            select: {
                userId: true,
                companyName: true,
                billingAddress: true,
                paymentMethods: {
                    where: { isDefault: true },
                    take: 1,
                },
            },
        })

        if (!employer) {
            return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 })
        }

        const { hasPending, package: pendingPackage } = await hasPendingPackagePayment(currentUser.profile.id)

        if (!hasPending || !pendingPackage) {
            return NextResponse.json({ error: 'No pending package payment found' }, { status: 404 })
        }

        const defaultPaymentMethod = employer.paymentMethods?.[0]
        if (!defaultPaymentMethod || !defaultPaymentMethod.authnetPaymentProfileId) {
            return NextResponse.json(
                { error: 'No payment method found. Please add a payment method first.', code: 'NO_PAYMENT_METHOD' },
                { status: 400 }
            )
        }

        const amountCents = pendingPackage.recurringAmountCents || 0
        const amountDollars = (amountCents / 100).toFixed(2)
        const description = `First payment for ${pendingPackage.packageType}`
        const invoiceNumber = `EP-FIRST-${pendingPackage.id.slice(-8)}`
        const paymentProfileId = defaultPaymentMethod.authnetPaymentProfileId

        let paymentResult: { success: boolean; transactionId?: string; error?: string } = { success: false }

        if (isPayPalPaymentMethod(paymentProfileId)) {
            // PayPal Reference Transaction
            const billingAgreementId = extractBillingAgreementId(paymentProfileId)
            if (!billingAgreementId) {
                paymentResult = { success: false, error: 'Invalid PayPal billing agreement' }
            } else {
                // PayPal reference transactions are handled via PayPal Orders API
                // For now, log and mark as requiring manual processing
                console.warn(`⚠️ PayPal reference transaction for billing agreement ${billingAgreementId} requires server-side PayPal SDK`)
                paymentResult = { success: false, error: 'PayPal reference transactions not yet configured. Please use a card.' }
            }
        } else if (paymentProfileId.startsWith('pm_') || paymentProfileId.startsWith('cus_')) {
            // Stripe payment method
            try {
                // Get or derive Stripe customer from the employerPackage arbSubscriptionId
                let stripeCustomerId: string | undefined
                const latestPackage = await db.employerPackage.findFirst({
                    where: { employerId: currentUser.profile.id },
                    orderBy: { createdAt: 'desc' },
                    select: { arbSubscriptionId: true },
                })
                if (latestPackage?.arbSubscriptionId?.startsWith('cus_')) {
                    stripeCustomerId = latestPackage.arbSubscriptionId
                }

                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amountCents,
                    currency: 'usd',
                    customer: stripeCustomerId,
                    payment_method: paymentProfileId.startsWith('pm_') ? paymentProfileId : undefined,
                    confirm: true,
                    description,
                    metadata: { packageId: pendingPackage.id, invoiceNumber },
                    automatic_payment_methods: paymentProfileId.startsWith('pm_') ? undefined : { enabled: true },
                })

                if (paymentIntent.status === 'succeeded') {
                    paymentResult = { success: true, transactionId: paymentIntent.id }
                } else {
                    paymentResult = { success: false, error: `Payment status: ${paymentIntent.status}` }
                }
            } catch (stripeError: any) {
                paymentResult = { success: false, error: stripeError.message }
            }
        } else {
            paymentResult = { success: false, error: 'Unsupported payment method type' }
        }

        if (!paymentResult.success) {
            console.error(`❌ First payment failed for package ${pendingPackage.id}:`, paymentResult.error)
            return NextResponse.json(
                { error: 'Payment failed', details: paymentResult.error, code: 'PAYMENT_FAILED' },
                { status: 402 }
            )
        }

        const activated = await activatePackageAfterPayment(pendingPackage.id, paymentResult.transactionId || 'unknown')

        if (!activated) {
            console.error(`❌ Failed to activate package after payment`)
            return NextResponse.json(
                {
                    error: 'Payment processed but package activation failed. Please contact support.',
                    transactionId: paymentResult.transactionId,
                    code: 'ACTIVATION_FAILED',
                },
                { status: 500 }
            )
        }

        console.log(`✅ First payment processed for package ${pendingPackage.id}: $${amountDollars}`)

        try {
            const orderDate = new Date()
            const orderNumber = `EP-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${pendingPackage.id.slice(-6).toUpperCase()}`
            const paymentMethodType = isPayPalPaymentMethod(paymentProfileId) ? 'PayPal' : 'Credit Card (Stripe)'

            await NotificationService.sendAdminPaymentNotification({
                orderNumber,
                orderDate: orderDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short',
                }),
                customerName: currentUser.profile.name || 'Unknown',
                customerType: 'Employer',
                customerId: currentUser.profile.id,
                customerEmail: currentUser.profile.email || '',
                productDescription: `First Payment - ${pendingPackage.packageType}`,
                price: parseFloat(amountDollars),
                paymentMethod: paymentMethodType,
                transactionId: paymentResult.transactionId || undefined,
                nextPaymentDate: pendingPackage.nextBillingDate?.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                }),
                paymentType: 'card',
            })

            await NotificationService.sendCustomerPaymentConfirmationEmail({
                email: currentUser.profile.email || '',
                firstName: currentUser.profile.firstName || currentUser.profile.name || 'Valued Customer',
                amount: parseFloat(amountDollars),
                description: `First Payment - ${pendingPackage.packageType}`,
                transactionId: paymentResult.transactionId || 'N/A',
                lineItems: [{ name: `First Payment - ${pendingPackage.packageType}`, amount: parseFloat(amountDollars) }],
                isRecurring: true,
                paymentType: 'card',
                paymentMethod:
                    !isPayPalPaymentMethod(paymentProfileId) && defaultPaymentMethod?.last4
                        ? `Card ending in ${defaultPaymentMethod.last4}`
                        : undefined,
            })
        } catch (emailError) {
            console.error('⚠️ FIRST-PAYMENT: Email notification failed:', emailError)
        }

        return NextResponse.json({
            success: true,
            message: 'Payment processed successfully',
            transactionId: paymentResult.transactionId,
            package: {
                id: pendingPackage.id,
                type: pendingPackage.packageType,
                amount: parseFloat(amountDollars),
                nextBillingDate: pendingPackage.nextBillingDate,
            },
        })
    } catch (error: any) {
        console.error('❌ Error processing first payment:', error)
        return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
    }
}
