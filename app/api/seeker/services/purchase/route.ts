import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import stripe from '@/lib/stripe'
import { CONCIERGE_SERVICES } from '@/lib/stripe-products-config'

export const dynamic = 'force-dynamic'

interface PurchaseRequest {
  serviceId: string
  paymentMethodId?: string
}

/**
 * POST /api/seeker/services/purchase
 * Purchase a premium service (one-time payment)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: PurchaseRequest = await request.json()
    const { serviceId, paymentMethodId } = body

    if (!serviceId) {
      return NextResponse.json(
        { error: 'Service ID is required' },
        { status: 400 }
      )
    }

    // Get user profile
    const userProfile = await db.userProfile.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get seeker
    const seeker = await db.jobSeeker.findUnique({
      where: { userId: userProfile.id },
      select: {
        userId: true,
      },
    })

    if (!seeker) {
      return NextResponse.json({ error: 'Seeker profile not found' }, { status: 404 })
    }

    // Find the service
    const service = CONCIERGE_SERVICES.find((s) => s.id === serviceId)
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Get or create Stripe customer
    let stripeCustomerId: string

    // Check if we have an existing payment method with a customer ID
    if (paymentMethodId) {
      const existingPayment = await db.paymentMethod.findUnique({
        where: { id: paymentMethodId },
      })

      if (!existingPayment?.authnetPaymentProfileId) {
        // Create new customer
        const customer = await stripe.customers.create({
          email: userProfile.email || userId,
          name: userProfile.name,
          metadata: {
            userId,
            seekerId: seeker.userId,
          },
        })
        stripeCustomerId = customer.id
      } else {
        stripeCustomerId = existingPayment.authnetPaymentProfileId
      }
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: userProfile.email || userId,
        name: userProfile.name,
        metadata: {
          userId,
          seekerId: seeker.userId,
        },
      })
      stripeCustomerId = customer.id
    }

    // Create payment intent for one-time service charge
    const paymentIntent = await stripe.paymentIntents.create({
      customer: stripeCustomerId,
      amount: Math.round(service.monthlyPrice * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: paymentMethodId ? true : false,
      description: `${service.name} - Premium Service`,
      metadata: {
        serviceId,
        seekerId: seeker.userId,
        userId,
        type: 'service_purchase',
      },
    })

    if (paymentMethodId && paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: `Payment failed: ${paymentIntent.status}` },
        { status: 400 }
      )
    }

    // Create service purchase record
    const purchase = await db.additionalServicePurchase.create({
      data: {
        serviceId: service.id,
        userId: userProfile.id,
        seekerId: seeker.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: paymentMethodId ? 'completed' : 'pending',
        paymentId: paymentIntent.id,
        amountPaid: paymentIntent.amount / 100, // Convert from cents to dollars
      },
    })

    console.log(`[Service Purchase] Created purchase ${purchase.id} for service ${serviceId}`)

    return NextResponse.json(
      {
        success: true,
        purchase: {
          id: purchase.id,
          serviceId,
          serviceName: service.name,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          clientSecret: paymentMethodId ? undefined : paymentIntent.client_secret,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Service Purchase] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to purchase service'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
