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

    // Get the Stripe customer that owns this PM.
    // IMPORTANT: Never look up the customer from an old EmployerPackage record —
    // that cus_xxx may be different from the one the PM was attached to when it
    // was saved.  The only source of truth is the PM itself on Stripe.
    const stripePMDetails = await stripe.paymentMethods.retrieve(stripePaymentMethodId)
    if (stripePMDetails.customer) {
      stripeCustomerId = stripePMDetails.customer as string
    } else {
      // PM has no customer yet (fresh token, never attached) → create one and attach
      const customer = await stripe.customers.create({
        email: userProfile.email || '',
        name: userProfile.name || employer.companyName || '',
        metadata: { userId: currentUser.clerkUser.id, employerId: employer.userId },
      })
      stripeCustomerId = customer.id
      await stripe.paymentMethods.attach(stripePaymentMethodId, { customer: stripeCustomerId })
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

    // ── In-app notification for the employer ──────────────────────────────────
    try {
      await db.notification.create({
        data: {
          userId: userProfile.id,
          type: 'employer_payment_confirmation',
          title: 'Package Purchase Successful',
          message: `Your ${pkgConfig.name} package has been activated. You have ${pkgConfig.listings} job listing${pkgConfig.listings !== 1 ? 's' : ''} available.`,
          data: {
            packageId: empPackage.id,
            packageType: pkgConfig.id,
            packageName: pkgConfig.name,
            amount: chargeAmount,
            transactionId: paymentIntent.id,
          },
          priority: 'high',
          actionUrl: '/employer/billing',
        },
      })
    } catch (notifErr) {
      console.error('[Employer Purchase] In-app notification failed:', notifErr)
    }

    // ── Customer confirmation email (via NotificationService) ─────────────────
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
      console.error('[Employer Purchase] Customer email failed:', emailErr)
    }

    // ── Admin notification email ───────────────────────────────────────────────
    try {
      const { sendEmail, getAdminNotificationRecipients, buildAdminEmailHtml } = await import('@/lib/resend')
      const adminEmails = getAdminNotificationRecipients()
      await sendEmail({
        to: adminEmails,
        subject: `[AmperTalent Admin] New Employer Package — ${pkgConfig.name}`,
        html: buildAdminEmailHtml({
          title: '🏢 New Employer Package Purchase',
          subtitle: `Purchased on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
          rows: [
            { label: 'Employer', value: `${userProfile.name} (${userProfile.email})` },
            { label: 'Package', value: pkgConfig.name },
            { label: 'Amount', value: `$${chargeAmount}` },
            { label: 'Job Listings', value: String(pkgConfig.listings) },
            { label: 'Transaction ID', value: paymentIntent.id },
            { label: 'Expires', value: expiresAt.toLocaleDateString() },
          ],
          footerNote: 'Review in the AmperTalent admin dashboard.',
        }),
      })
    } catch (adminEmailErr) {
      console.error('[Employer Purchase] Admin email failed:', adminEmailErr)
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
