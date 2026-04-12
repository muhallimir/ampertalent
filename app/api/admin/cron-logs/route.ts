import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // format: YYYY-MM-DD
    const taskName = searchParams.get('taskName') || undefined
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = (page - 1) * limit

    // Build date range filter
    let dateFilter: { gte?: Date; lte?: Date } | undefined
    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`)
      const end = new Date(`${date}T23:59:59.999Z`)
      dateFilter = { gte: start, lte: end }
    }

    const where = {
      ...(taskName ? { taskName } : {}),
      ...(dateFilter ? { startedAt: dateFilter } : {}),
    }

    const [total, executions] = await Promise.all([
      db.executionLog.count({ where }),
      db.executionLog.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        include: {
          actions: {
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    ])

    // Get distinct task names for filter dropdown
    const taskNames = await db.executionLog.findMany({
      select: { taskName: true },
      distinct: ['taskName'],
      orderBy: { taskName: 'asc' },
    })

    // Summary stats for the selected filters
    const stats = await db.executionLog.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    })

    // Calculate total revenue for recurring billing jobs
    let totalRevenue = 0
    let successfulPayments = 0
    let canceledByUser = 0
    let totalProcessed = 0

    // Only calculate revenue for seeker-recurring-billing and employer-recurring-billing tasks
    if (!taskName || taskName === 'seeker-recurring-billing' || taskName === 'employer-recurring-billing') {
      const billingWhere = {
        ...where,
        taskName: taskName || { in: ['seeker-recurring-billing', 'employer-recurring-billing'] }
      }

      // Get execution IDs for billing tasks
      const billingExecutions = await db.executionLog.findMany({
        where: billingWhere,
        select: { id: true }
      })

      const executionIds = billingExecutions.map(e => e.id)

      if (executionIds.length > 0) {
        // Get all actions for billing tasks to count total processed
        const allBillingActions = await db.actionLog.findMany({
          where: {
            executionId: { in: executionIds },
            actionType: {
              in: [
                'seeker_renewal_success',
                'seeker_trial_converted',
                'seeker_pastdue_reactivated',
                'employer_renewal_success',
                'employer_trial_converted',
                'employer_pastdue_reactivated',
                'seeker_trial_canceled',
                'seeker_subscription_canceled',
                'employer_trial_canceled',
                'employer_subscription_canceled',
                'seeker_renewal_failed',
                'seeker_trial_conversion_failed',
                'employer_renewal_failed',
                'employer_trial_conversion_failed'
              ]
            }
          },
          select: {
            details: true,
            actionType: true,
            status: true
          }
        })

        // Count total processed (all billing attempts)
        totalProcessed = allBillingActions.length

        // Get successful payment actions
        const successfulActions = allBillingActions.filter(a => 
          a.status === 'success' && (
            a.actionType === 'seeker_renewal_success' ||
            a.actionType === 'seeker_trial_converted' ||
            a.actionType === 'seeker_pastdue_reactivated' ||
            a.actionType === 'employer_renewal_success' ||
            a.actionType === 'employer_trial_converted' ||
            a.actionType === 'employer_pastdue_reactivated'
          )
        )

        // Parse details to extract amounts
        // Details are stored as plain text: "Plan: ..., Amount: $34.99, ..."
        const amountRegex = /Amount:\s*\$(\d+(?:\.\d+)?)/i
        for (const action of successfulActions) {
          if (action.details) {
            const match = action.details.match(amountRegex)
            if (match) {
              totalRevenue += parseFloat(match[1])
              successfulPayments++
            }
          }
        }

        // Count canceled by user actions
        canceledByUser = allBillingActions.filter(a =>
          a.status === 'success' && (
            a.actionType === 'seeker_trial_canceled' ||
            a.actionType === 'seeker_subscription_canceled' ||
            a.actionType === 'employer_trial_canceled' ||
            a.actionType === 'employer_subscription_canceled'
          )
        ).length
      }
    }

    return NextResponse.json({
      executions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      taskNames: taskNames.map((t) => t.taskName),
      stats: stats.reduce(
        (acc, s) => ({ ...acc, [s.status]: s._count.id }),
        {} as Record<string, number>
      ),
      revenue: {
        total: totalRevenue,
        successfulPayments,
        canceledByUser,
        totalProcessed
      }
    })
  } catch (error) {
    console.error('Failed to fetch cron logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cron logs', message: String(error) },
      { status: 500 }
    )
  }
}
