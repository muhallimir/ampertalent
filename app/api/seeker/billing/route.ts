import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/seeker/billing
 * Get billing dashboard with subscriptions, invoices, and service purchases
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile
    const userProfile = await db.userProfile.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
        name: true,
        email: true,
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
        membershipPlan: true,
        membershipExpiresAt: true,
        isOnTrial: true,
        trialEndsAt: true,
        cancelledSeeker: true,
      },
    })

    if (!seeker) {
      return NextResponse.json({ error: 'Seeker profile not found' }, { status: 404 })
    }

    // Get active subscription
    const subscription = await db.subscription.findFirst({
      where: {
        seekerId: seeker.userId,
        status: { not: 'canceled' },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Get recent invoices (last 12 months)
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const invoices = await db.invoice.findMany({
      where: {
        createdAt: {
          gte: twelveMonthsAgo,
        },
      },
      select: {
        id: true,
        amountDue: true,
        status: true,
        description: true,
        packageName: true,
        createdAt: true,
        paidAt: true,
        dueDate: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    })

    // Get service purchases
    const servicePurchases = await db.additionalServicePurchase.findMany({
      where: {
        seekerId: seeker.userId,
      },
      select: {
        id: true,
        serviceId: true,
        status: true,
        amountPaid: true,
        createdAt: true,
        completedAt: true,
        service: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    })

    // Calculate stats
    const totalSpent = invoices.reduce((sum, inv) => sum + inv.amountDue, 0) +
      servicePurchases.reduce((sum, sp) => sum + parseFloat(sp.amountPaid.toString()), 0)

    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length
    const pendingInvoices = invoices.filter(inv => inv.status === 'draft').length

    return NextResponse.json(
      {
        success: true,
        billing: {
          subscription: subscription ? {
            id: subscription.id,
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
          } : null,
          membership: {
            plan: seeker.membershipPlan,
            expiresAt: seeker.membershipExpiresAt,
            isOnTrial: seeker.isOnTrial,
            trialEndsAt: seeker.trialEndsAt,
            isCancelled: seeker.cancelledSeeker,
          },
          stats: {
            totalSpent: totalSpent / 100, // Convert from cents to dollars
            paidInvoices,
            pendingInvoices,
            totalInvoices: invoices.length,
            totalServicePurchases: servicePurchases.length,
          },
          invoices: invoices.map(inv => ({
            id: inv.id,
            amount: inv.amountDue / 100,
            status: inv.status,
            description: inv.description,
            packageName: inv.packageName,
            createdAt: inv.createdAt,
            paidAt: inv.paidAt,
            dueDate: inv.dueDate,
          })),
          servicePurchases: servicePurchases.map(sp => ({
            id: sp.id,
            serviceName: sp.service.name,
            status: sp.status,
            amount: parseFloat(sp.amountPaid.toString()),
            createdAt: sp.createdAt,
            completedAt: sp.completedAt,
          })),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Billing Dashboard] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch billing dashboard'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
