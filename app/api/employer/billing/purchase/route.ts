import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import stripe from '@/lib/stripe'
import { getEmployerPackages } from '@/lib/stripe-products-config'

export const dynamic = 'force-dynamic'

const PACKAGE_ID_TO_TYPE_MAP: Record<string, any> = {
  'employer-standard': { type: 'standard', listings: 1, days: 30 },
  'employer-featured': { type: 'featured', listings: 1, days: 30, featured: 1 },
  'employer-email-blast': { type: 'email_blast', listings: 1, days: 7 },
  'employer-gold-plus': { type: 'gold_plus', listings: 1, days: 180, recurring: true },
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { packageType, paymentMethodId, billingEmail, addOns } = body

    if (!packageType) {
      return NextResponse.json(
        { error: 'Package type is required' },
        { status: 400 }
      )
    }

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

    let employer = await db.employer.findUnique({
      where: { userId: userProfile.id },
      select: {
        userId: true,
        companyName: true,
      },
    })

    if (!employer) {
      employer = await db.employer.create({
        data: {
          userId: userProfile.id,
          companyName: userProfile.name || 'Company',
        },
      })
    }

    const packages = getEmployerPackages()
    const pkg = packages.find((p) => p.id === packageType)

    if (!pkg) {
      return NextResponse.json({ error: 'Invalid package type' }, { status: 400 })
    }

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method is required' },
        { status: 400 }
      )
    }

    let stripeCustomerId: string
    const existingPackage = await db.employerPackage.findFirst({
      where: {
        employerId: employer.userId,
      },
    })

    if (existingPackage?.arbSubscriptionId) {
      // Reuse existing Stripe customer (stored in arbSubscriptionId field for now)
      stripeCustomerId = existingPackage.arbSubscriptionId
    } else {
      const customer = await stripe.customers.create({
        email: billingEmail || userProfile.email || userId,
        name: userProfile.name,
        metadata: {
          userId,
          employerId: employer.userId,
        },
      })
      stripeCustomerId = customer.id
    }

    console.log(`[Employer Package] Creating ${packageType} for employer ${employer.userId}`)

    const packageDetail = PACKAGE_ID_TO_TYPE_MAP[packageType]
    const now = new Date()
    const expiresAt = new Date(now.getTime() + packageDetail.days * 24 * 60 * 60 * 1000)

    const paymentIntent = await stripe.paymentIntents.create({
      customer: stripeCustomerId,
      amount: Math.round(pkg.monthlyPrice * 100),
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      metadata: {
        packageType,
        employerId: employer.userId,
        userId,
      },
    })

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Payment failed' },
        { status: 400 }
      )
    }

    const empPackage = await db.employerPackage.create({
      data: {
        employerId: employer.userId,
        packageType: packageDetail.type,
        purchasedAt: now,
        expiresAt: expiresAt,
        arbSubscriptionId: paymentMethodId,
        listingsRemaining: packageDetail.listings,
      },
    })

    console.log(`[Employer Package] Created package ${empPackage.id}`)

    return NextResponse.json(
      {
        success: true,
        packageId: empPackage.id,
        message: `Successfully purchased ${pkg.name}`,
        package: {
          type: packageDetail.type,
          expiresAt: expiresAt.toISOString(),
          listings: packageDetail.listings,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Employer Package] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to purchase package'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { status: 'ok', endpoint: 'employer-billing-purchase' },
    { status: 200 }
  )
}
