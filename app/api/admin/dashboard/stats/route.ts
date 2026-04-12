import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/dashboard/stats
 * Get admin dashboard statistics
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

    // Verify user is admin
    const user = await db.userProfile.findUnique({
      where: { clerkUserId: userId },
    })

    if (user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin only' },
        { status: 403 }
      )
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get key metrics
    const totalSeekers = await db.jobSeeker.count()
    const totalEmployers = await db.employer.count()
    const totalJobs = await db.job.count()
    const approvedJobs = await db.job.count({
      where: { status: 'approved' },
    })

    // Revenue metrics
    const recentInvoices = await db.invoice.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: 'paid',
      },
    })

    const totalRevenue = recentInvoices.reduce((sum, inv) => sum + inv.amountDue, 0)

    // Subscription metrics
    const activeSubscriptions = await db.subscription.count({
      where: { status: 'active' },
    })

    const pastDueSubscriptions = await db.subscription.count({
      where: { status: 'past_due' },
    })

    // Recent signups
    const recentSignups = await db.userProfile.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    })

    // Pending jobs
    const pendingJobs = await db.job.count({
      where: { status: 'pending_vetting' },
    })

    // Payment issues
    const failedPayments = await db.subscription.count({
      where: { status: 'past_due' },
    })

    return NextResponse.json(
      {
        success: true,
        dashboard: {
          users: {
            totalSeekers,
            totalEmployers,
            recentSignups,
          },
          jobs: {
            total: totalJobs,
            approved: approvedJobs,
            pendingVetting: pendingJobs,
          },
          revenue: {
            last30Days: totalRevenue / 100, // Convert from cents

            invoicesPaid: recentInvoices.length,
          },
          subscriptions: {
            active: activeSubscriptions,
            pastDue: pastDueSubscriptions,
          },
          alerts: {
            failedPayments,
            pendingVettingJobs: pendingJobs,
          },
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Admin Dashboard] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
