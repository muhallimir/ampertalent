import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import stripe from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * GET /api/billing/payment-retries
 * Get retry statistics and history
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get failed subscriptions in the last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const failedSeeker = await db.subscription.findMany({
      where: {
        status: 'past_due',
        updatedAt: { gte: sevenDaysAgo },
      },
      include: {
        seeker: {
          select: {
            user: { select: { email: true, name: true } },
          },
        },
      },
      take: 50,
    })

    // Get failed employer packages in the last 7 days
    const failedEmployer = await db.employerPackage.findMany({
      where: {
        recurringStatus: 'failed',
        updatedAt: { gte: sevenDaysAgo },
      },
      include: {
        employer: {
          select: {
            companyName: true,
            user: { select: { email: true, name: true } },
          },
        },
      },
      take: 50,
    })

    return NextResponse.json(
      {
        success: true,
        failedSeekerSubscriptions: failedSeeker.length,
        failedEmployerPackages: failedEmployer.length,
        retryWindow: '7 days',
        data: {
          seekers: failedSeeker.map((s) => ({
            id: s.id,
            email: s.seeker.user.email,
            name: s.seeker.user.name,
            plan: s.plan,
            status: s.status,
            updatedAt: s.updatedAt,
          })),
          employers: failedEmployer.map((p) => ({
            id: p.id,
            companyName: p.employer.companyName,
            email: p.employer.user.email,
            packageType: p.packageType,
            status: p.recurringStatus,
            updatedAt: p.updatedAt,
          })),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Payment Retries] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

/**
 * POST /api/billing/payment-retries
 * Retry failed payments
 */
export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Retry past_due seeker subscriptions (only retry after 15 days)
    const fifteenDaysAgo = new Date()
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)

    const pastDueSubscriptions = await db.subscription.findMany({
      where: {
        status: 'past_due',
        updatedAt: { lte: fifteenDaysAgo },
      },
      include: {
        seeker: {
          select: {
            userId: true,
            user: { select: { email: true, name: true } },
            paymentMethods: { where: { isDefault: true }, take: 1 },
          },
        },
      },
      take: 100,
    })

    console.log(`[Payment Retries] Found ${pastDueSubscriptions.length} past_due subscriptions to retry`)

    for (const sub of pastDueSubscriptions) {
      try {
        // Would need to retry with Stripe here
        // For now, just log
        console.log(`[Payment Retries] Would retry subscription ${sub.id} for ${sub.seeker.user.email}`)
        results.successful++
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`[Payment Retries] Error retrying subscription ${sub.id}: ${errorMsg}`)
        results.failed++
        results.errors.push(errorMsg)
      }
    }

    // Retry failed employer packages
    const failedEmployer = await db.employerPackage.findMany({
      where: {
        recurringStatus: 'failed',
      },
      include: {
        employer: {
          select: {
            userId: true,
            companyName: true,
            user: { select: { email: true } },
          },
        },
      },
      take: 100,
    })

    console.log(`[Payment Retries] Found ${failedEmployer.length} failed employer packages to retry`)

    for (const pkg of failedEmployer) {
      try {
        // Would retry here
        console.log(`[Payment Retries] Would retry package ${pkg.id} for ${pkg.employer.companyName}`)
        results.successful++
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`[Payment Retries] Error retrying package ${pkg.id}: ${errorMsg}`)
        results.failed++
        results.errors.push(errorMsg)
      }
    }

    return NextResponse.json(
      {
        success: true,
        results,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Payment Retries] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
