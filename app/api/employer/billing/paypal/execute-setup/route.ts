import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getPayPalClient } from '@/lib/paypal'

/**
 * POST /api/employer/billing/paypal/execute-setup
 * Execute a PayPal Billing Agreement for saving payment method only (no charge).
 * Called after PayPal redirects the user back to our site with a token.
 */
export async function POST(request: NextRequest) {
    const requestId = Math.random().toString(36).substring(2, 8)

    try {
        console.log(`🅿️ [${requestId}] PayPal: Executing payment method setup`)

        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!currentUser.profile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
        }

        const employer = await db.employer.findUnique({
            where: { userId: currentUser.profile.id },
        })

        if (!employer) {
            return NextResponse.json({ error: 'Only employers can add payment methods' }, { status: 403 })
        }

        const body = await request.json()
        const { token } = body

        if (!token) {
            return NextResponse.json({ error: 'Missing required field: token' }, { status: 400 })
        }

        const paypalClient = getPayPalClient()
        if (!paypalClient.isConfigured()) {
            return NextResponse.json(
                { error: 'PayPal is not configured on this server.' },
                { status: 503 }
            )
        }

        const agreement = await paypalClient.executeBillingAgreement(token)
        const { billingAgreementId, payerEmail } = agreement

        console.log(`✅ [${requestId}] PayPal billing agreement executed: ${billingAgreementId}`)

        // Store the payment method (PAYPAL|B-xxxx format)
        const storedId = `PAYPAL|${billingAgreementId}`
        const payerDisplay = payerEmail.slice(-8) || 'PayPal'

        // Check if employer already has a PayPal payment method
        const existingPayPalMethods = await db.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM payment_methods
      WHERE employer_id = ${currentUser.profile.id}
      AND authnet_payment_profile_id LIKE 'PAYPAL|%'
      LIMIT 1
    `

        let paymentMethodId: string

        if (existingPayPalMethods.length > 0) {
            await db.$executeRaw`
        UPDATE payment_methods
        SET authnet_payment_profile_id = ${storedId},
            last4 = ${payerDisplay},
            updated_at = NOW()
        WHERE id = ${existingPayPalMethods[0].id}
      `
            paymentMethodId = existingPayPalMethods[0].id
            console.log(`✅ [${requestId}] Updated existing PayPal payment method: ${paymentMethodId}`)
        } else {
            const hasDefaultMethod = await db.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM payment_methods
        WHERE employer_id = ${currentUser.profile.id}
        AND is_default = true
        LIMIT 1
      `
            const isDefault = hasDefaultMethod.length === 0

            const newPaymentMethod = await db.paymentMethod.create({
                data: {
                    employerId: currentUser.profile.id,
                    authnetPaymentProfileId: storedId,
                    type: 'paypal',
                    brand: 'PayPal',
                    last4: payerDisplay,
                    expiryMonth: 12,
                    expiryYear: 2099,
                    isDefault,
                },
            })
            paymentMethodId = newPaymentMethod.id
            console.log(`✅ [${requestId}] Created new PayPal payment method: ${paymentMethodId} (isDefault: ${isDefault})`)
        }

        return NextResponse.json({
            success: true,
            paymentMethodId,
            billingAgreementId,
            payerEmail,
            message: 'PayPal payment method saved successfully',
        })
    } catch (error) {
        console.error(`❌ [${requestId}] PayPal execute setup error:`, error)
        return NextResponse.json({ error: 'Failed to save PayPal payment method' }, { status: 500 })
    }
}
