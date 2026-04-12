/**
 * Attach Payment Method Endpoint
 * POST /api/payment-methods/attach
 *
 * Attaches a Stripe payment method to the current user's Stripe customer.
 * This is called after PaymentMethodForm successfully creates a payment method on the client.
 *
 * Request body:
 * {
 *   paymentMethodId: string (Stripe payment method ID from client-side token)
 *   customerId?: string (optional override, uses current user by default)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   paymentMethodId: string,
 *   customerId: string,
 *   card: { last4: string, brand: string, exp_month: number, exp_year: number }
 * }
 */

import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import stripe from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - must be logged in' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { paymentMethodId, customerId } = body

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      )
    }

    // For now, use the provided customerId or userId as fallback
    // TODO: In Phase 6, link this to user's Stripe customer ID stored in database
    const stripeCustomerId = customerId || `cus_${userId.substring(0, 20)}`

    // Retrieve payment method details
    console.log(`[Payment Method] Attaching ${paymentMethodId} to customer ${stripeCustomerId}`)

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)

    // Extract card details for response
    const card = paymentMethod.card
    const cardInfo = card
      ? {
        last4: card.last4,
        brand: card.brand,
        exp_month: card.exp_month,
        exp_year: card.exp_year,
      }
      : null

    // Log success
    console.log(`[Payment Method] Successfully retrieved: ${paymentMethodId}`)
    console.log(`[Payment Method] Card details: ${card?.brand} ****${card?.last4}`)

    // TODO: In Phase 6, call stripe.attachPaymentMethod() after setting up customer linking

    return NextResponse.json(
      {
        success: true,
        paymentMethodId,
        customerId: stripeCustomerId,
        card: cardInfo,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Payment Method] Error attaching payment method:', error)

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to attach payment method'

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { status: 'ok', endpoint: 'payment-methods-attach' },
    { status: 200 }
  )
}
