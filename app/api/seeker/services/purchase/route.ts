import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import stripe from '@/lib/stripe'
import { getServiceById } from '@/lib/additional-services'
import { NotificationService } from '@/lib/notification-service'
import { inAppNotificationService } from '@/lib/in-app-notification-service'

export const dynamic = 'force-dynamic'

interface PurchaseRequest {
  serviceId: string
  paymentMethodId?: string
}

/**
 * POST /api/seeker/services/purchase
 * Purchase a premium service (one-time payment)
 *
 * Accepts serviceId from the seeker-services catalog (lib/additional-services.ts)
 * Examples: 'career_jumpstart', 'interview_success_training', 'personal_career_strategist',
 *           'resume_refresh', 'create_new_resume', 'cover_letter_service', 'the_works'
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

    // Find the service using the canonical seeker-services catalog.
    // The frontend posts `service.id` from getServiceById() in additional-services.ts
    const service = getServiceById(serviceId)
    if (!service) {
      console.error('❌ SERVICE-PURCHASE: Unknown serviceId:', serviceId)
      return NextResponse.json({ error: `Service not found: ${serviceId}` }, { status: 404 })
    }

    if (service.userType !== 'seeker') {
      return NextResponse.json(
        { error: 'This service is not available for seekers' },
        { status: 400 }
      )
    }

    // Resolve the actual Stripe payment method + customer (DB record holds Stripe pm_xxx in authnetPaymentProfileId)
    let stripePaymentMethodId: string | undefined
    let stripeCustomerId: string | undefined

    if (paymentMethodId) {
      const dbMethod = await db.paymentMethod.findFirst({
        where: { id: paymentMethodId, seekerId: userProfile.id },
      })

      if (dbMethod) {
        if (!dbMethod.authnetPaymentProfileId?.startsWith('pm_')) {
          return NextResponse.json(
            { error: 'Invalid Stripe payment method on record. Please re-add your card.' },
            { status: 400 }
          )
        }
        stripePaymentMethodId = dbMethod.authnetPaymentProfileId
      } else if (paymentMethodId.startsWith('pm_')) {
        stripePaymentMethodId = paymentMethodId
      } else {
        return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })
      }
    }

    if (stripePaymentMethodId) {
      const pmDetails = await stripe.paymentMethods.retrieve(stripePaymentMethodId)
      if (pmDetails.customer) {
        stripeCustomerId = pmDetails.customer as string
      }
    }

    // Fallback: reuse the seeker's Stripe customer from their most recent subscription
    if (!stripeCustomerId) {
      const latestSub = await db.subscription.findFirst({
        where: { seekerId: userProfile.id, authnetCustomerId: { startsWith: 'cus_' } },
        orderBy: { createdAt: 'desc' },
        select: { authnetCustomerId: true },
      })
      if (latestSub?.authnetCustomerId) stripeCustomerId = latestSub.authnetCustomerId
    }

    // Create a new Stripe customer if we still don't have one
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userProfile.email || userId,
        name: userProfile.name || undefined,
        metadata: { userId, seekerId: seeker.userId },
      })
      stripeCustomerId = customer.id
    }

    // Make sure the PM is attached to the resolved customer (no-op if already attached)
    if (stripePaymentMethodId) {
      try {
        await stripe.paymentMethods.attach(stripePaymentMethodId, { customer: stripeCustomerId })
      } catch (attachErr: any) {
        // "Payment method already attached" is fine — anything else surfaces
        if (!attachErr?.message?.toLowerCase().includes('already attached')) {
          throw attachErr
        }
      }
    }

    // Create the external payment record FIRST — AdditionalServicePurchase.paymentId
    // is a FK to ExternalPayment.id (see Prisma schema). The service purchase is
    // linked to its payment via this row.
    const externalPayment = await db.externalPayment.create({
      data: {
        userId: userProfile.id,
        amount: service.price,
        planId: service.id,
        status: 'pending',
      },
    })

    let paymentIntentId: string
    let paymentStatus: string

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        customer: stripeCustomerId,
        amount: Math.round(service.price * 100), // dollars → cents
        currency: 'usd',
        payment_method: stripePaymentMethodId,
        confirm: stripePaymentMethodId ? true : false,
        off_session: stripePaymentMethodId ? true : false,
        description: `${service.name} - Premium Service`,
        metadata: {
          serviceId: service.id,
          seekerId: seeker.userId,
          userId,
          externalPaymentId: externalPayment.id,
          type: 'service_purchase',
        },
      })

      paymentIntentId = paymentIntent.id
      paymentStatus = paymentIntent.status

      if (stripePaymentMethodId && paymentIntent.status !== 'succeeded') {
        // Update externalPayment to failed
        await db.externalPayment.update({
          where: { id: externalPayment.id },
          data: {
            status: 'failed',
            authnetTransactionId: paymentIntent.id,
          },
        })
        return NextResponse.json(
          { error: `Payment failed: ${paymentIntent.status}` },
          { status: 400 }
        )
      }

      // Update external payment to completed
      await db.externalPayment.update({
        where: { id: externalPayment.id },
        data: {
          status: 'completed',
          authnetTransactionId: paymentIntent.id,
          webhookProcessedAt: new Date(),
        },
      })
    } catch (stripeErr: any) {
      console.error('❌ SERVICE-PURCHASE: Stripe payment intent failed:', stripeErr)
      await db.externalPayment.update({
        where: { id: externalPayment.id },
        data: {
          status: 'failed',
          errorMessage: stripeErr?.message?.slice(0, 500) || 'Stripe error',
        },
      })
      return NextResponse.json(
        { error: stripeErr?.message || 'Stripe payment failed' },
        { status: 400 }
      )
    }

    // Create the service purchase record (linked to the externalPayment via paymentId)
    const purchase = await db.additionalServicePurchase.create({
      data: {
        serviceId: service.id,
        userId: userProfile.id,
        seekerId: seeker.userId,
        paymentId: externalPayment.id,
        amountPaid: service.price,
        status: stripePaymentMethodId ? 'pending' : 'pending',
      },
    })

    console.log(`✅ SERVICE-PURCHASE: Created purchase ${purchase.id} for service ${serviceId} ($${service.price})`)

    // ── Notifications (non-blocking) ──────────────────────────────────────
    try {
      await inAppNotificationService.notifyServicePurchaseConfirmation(
        userProfile.id,
        service.name,
        service.price,
        purchase.id
      )
      await inAppNotificationService.notifyAdminServicePurchase(
        service.name,
        userProfile.name || 'Seeker',
        service.price,
        purchase.id
      )
    } catch (notifErr) {
      console.error('⚠️ SERVICE-PURCHASE: notification error (non-blocking):', notifErr)
    }

    try {
      const orderDate = new Date()
      const orderNumber = `SVC-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${purchase.id.slice(-6).toUpperCase()}`
      await NotificationService.sendAdminPaymentNotification({
        orderNumber,
        orderDate: orderDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        customerName: userProfile.name || 'Seeker',
        customerType: 'Seeker',
        customerId: userProfile.id,
        customerEmail: userProfile.email || '',
        productDescription: `${service.name} (One-time Service)`,
        quantity: 1,
        price: service.price,
        lineItems: [{ name: service.name, quantity: 1, price: service.price }],
        paymentType: 'card',
        isRenewal: false,
        transactionId: paymentIntentId,
      })
      await NotificationService.sendCustomerPaymentConfirmationEmail({
        email: userProfile.email || '',
        firstName: userProfile.name?.split(' ')[0] || 'there',
        amount: service.price,
        description: `${service.name} - Premium Service`,
        transactionId: paymentIntentId,
        lineItems: [{ name: service.name, amount: service.price }],
        isRecurring: false,
        paymentType: 'card',
      })
    } catch (emailErr) {
      console.error('⚠️ SERVICE-PURCHASE: email error (non-blocking):', emailErr)
    }

    return NextResponse.json(
      {
        success: true,
        purchase: {
          id: purchase.id,
          serviceId,
          serviceName: service.name,
          amount: service.price,
          currency: 'usd',
          status: paymentStatus,
          clientSecret: stripePaymentMethodId ? undefined : undefined,
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
