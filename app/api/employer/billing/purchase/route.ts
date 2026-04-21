import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import stripe from '@/lib/stripe'
import { getEmployerPackageById } from '@/lib/employer-packages'
import { PackageType } from '@prisma/client'

export const dynamic = 'force-dynamic'

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
    // Accept packageId (from modal's packageInfo.id) or legacy packageType
    const { packageId, packageType, paymentMethodId, selectedAddOns = [], totalPrice } = body
    const resolvedPackageId = packageId || packageType

    if (!resolvedPackageId) {
      return NextResponse.json({ error: 'Package ID is required' }, { status: 400 })
    }

    if (!paymentMethodId) {
      return NextResponse.json({ error: 'Payment method is required' }, { status: 400 })
    }

    // Resolve the package config
    const pkgConfig = getEmployerPackageById(resolvedPackageId)
    if (!pkgConfig) {
      return NextResponse.json({ error: `Invalid package: ${resolvedPackageId}` }, { status: 400 })
    }

    const userProfile = await db.userProfile.findUnique({
      where: { clerkUserId: currentUser.clerkUser.id },
      select: { id: true, email: true, name: true },
    })

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    let employer = await db.employer.findUnique({
      where: { userId: userProfile.id },
      select: { userId: true, companyName: true },
    })

    if (!employer) {
      employer = await db.employer.create({
        data: { userId: userProfile.id, companyName: userProfile.name || 'Company' },
      })
    }

    // Resolve the actual Stripe payment method ID from the DB payment_methods record
    // The modal sends the DB record UUID (not a Stripe pm_xxx id directly)
    let stripePaymentMethodId: string
    let stripeCustomerId: string | null = null

    const dbPaymentMethod = await db.paymentMethod.findFirst({
      where: { id: paymentMethodId, employerId: employer.userId },
    })

    if (dbPaymentMethod) {
      // Got a DB record — authnetPaymentProfileId holds the Stripe pm_xxx id
      if (!dbPaymentMethod.authnetPaymentProfileId || !dbPaymentMethod.authnetPaymentProfileId.startsWith('pm_')) {
        return NextResponse.json({ error: 'Invalid Stripe payment method on record. Please re-add your card.' }, { status: 400 })
      }
      stripePaymentMethodId = dbPaymentMethod.authnetPaymentProfileId
    } else if (paymentMethodId.startsWith('pm_')) {
      // Caller passed a raw Stripe pm_xxx directly
      stripePaymentMethodId = paymentMethodId
    } else {
      return NextResponse.json({ error: 'Payment method not found' }, { status: 404 })
    }

    // Get or create Stripe customer for this employer
    const existingCustomerPackage = await db.employerPackage.findFirst({
      where: { employerId: employer.userId, arbSubscriptionId: { startsWith: 'cus_' } },
      orderBy: { purchasedAt: 'desc' },
      select: { arbSubscriptionId: true },
    })

    if (existingCustomerPackage?.arbSubscriptionId) {
      stripeCustomerId = existingCustomerPackage.arbSubscriptionId
    } else {
      // Check payment_methods table for a cached customer id
      const existingPm = await db.paymentMethod.findFirst({
        where: { employerId: employer.userId, authnetPaymentProfileId: { startsWith: 'pm_' } },
        orderBy: { createdAt: 'asc' },
      })

      const customer = await stripe.customers.create({
        email: userProfile.email || '',
        name: userProfile.name || employer.companyName || '',
        metadata: { userId: currentUser.clerkUser.id, employerId: employer.userId },
      })
      stripeCustomerId = customer.id

      // Attach the payment method to the newly created customer
      try {
        await stripe.paymentMethods.attach(stripePaymentMethodId, { customer: stripeCustomerId })
      } catch (_) {
        // Already attached is fine
      }
    }

    const chargeAmount = totalPrice ?? pkgConfig.price
    console.log(`[Employer Purchase] Charging $${chargeAmount} for ${pkgConfig.id} (${pkgConfig.name})`)

    const paymentIntent = await stripe.paymentIntents.create({
      customer: stripeCustomerId,
      amount: Math.round(chargeAmount * 100),
      currency: 'usd',
      payment_method: stripePaymentMethodId,
      confirm: true,
      off_session: true,
      metadata: {
        packageId: pkgConfig.id,
        employerId: employer.userId,
        userId: currentUser.clerkUser.id,
      },
    })

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ error: 'Payment failed' }, { status: 400 })
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + pkgConfig.duration * 24 * 60 * 60 * 1000)

    const empPackage = await db.employerPackage.create({
      data: {
        employerId: employer.userId,
        packageType: pkgConfig.id as PackageType,
        purchasedAt: now,
        expiresAt,
        // Store stripe customer id for future recurring billing
        arbSubscriptionId: stripeCustomerId,
        listingsRemaining: pkgConfig.listings,
        featuredListingsRemaining: pkgConfig.featuredListings ?? 0,
      },
    })

    console.log(`[Employer Purchase] Created package ${empPackage.id}`)

    // Send purchase confirmation emails (best-effort)
    try {
      const { NotificationService } = await import('@/lib/notification-service')
      await NotificationService.sendPaymentConfirmation({
        userId: userProfile.id,
        userType: 'employer',
        firstName: userProfile.name?.split(' ')[0] || 'there',
        email: userProfile.email || '',
        amount: chargeAmount,
        description: `${pkgConfig.name} Package Purchase`,
        transactionId: paymentIntent.id,
        packageName: pkgConfig.name,
        creditsPurchased: pkgConfig.listings,
      })
    } catch (emailErr) {
      console.error('[Employer Purchase] Email notification failed:', emailErr)
    }

    return NextResponse.json(
      {
        success: true,
        packageId: empPackage.id,
        message: `Successfully purchased ${pkgConfig.name}`,
        package: {
          type: pkgConfig.id,
          name: pkgConfig.name,
          expiresAt: expiresAt.toISOString(),
          listings: pkgConfig.listings,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Employer Purchase] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to purchase package'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'ok', endpoint: 'employer-billing-purchase' }, { status: 200 })
}
