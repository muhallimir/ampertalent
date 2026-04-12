import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { Prisma, SubscriptionStatus, MembershipPlan } from '@prisma/client'
import {
  planDisplayName,
  planPrice,
  getPlanByMembershipPlan,
} from '@/lib/subscription-plans'

// Valid subscription statuses for type checking
const VALID_STATUSES: SubscriptionStatus[] = ['active', 'past_due', 'canceled', 'unpaid']

// Valid membership plans for search matching
const PLAN_SEARCH_MAP: Record<string, MembershipPlan[]> = {
  'trial': ['trial_monthly'],
  'gold': ['gold_bimonthly'],
  'vip': ['vip_quarterly'],
  'platinum': ['vip_quarterly', 'annual_platinum'],
  'annual': ['annual_platinum']
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse query parameters for pagination, filtering, and search
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const status = searchParams.get('status') || 'all'
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * limit

    // Build where clause for filtering
    const whereClause: Prisma.SubscriptionWhereInput = {}

    // Status filter - cast to SubscriptionStatus if valid
    if (status && status !== 'all' && VALID_STATUSES.includes(status as SubscriptionStatus)) {
      whereClause.status = status as SubscriptionStatus
    }

    // Search filter - search by user name, email, or plan
    if (search) {
      const searchLower = search.toLowerCase()

      // Find matching plans based on search term
      const matchingPlans: MembershipPlan[] = []
      for (const [keyword, plans] of Object.entries(PLAN_SEARCH_MAP)) {
        if (keyword.includes(searchLower) || searchLower.includes(keyword)) {
          matchingPlans.push(...plans)
        }
      }

      const orConditions: Prisma.SubscriptionWhereInput[] = [
        {
          seeker: {
            user: {
              name: { contains: search, mode: 'insensitive' }
            }
          }
        },
        {
          seeker: {
            user: {
              email: { contains: search, mode: 'insensitive' }
            }
          }
        }
      ]

      // Add plan filter if we found matching plans
      if (matchingPlans.length > 0) {
        orConditions.push({
          plan: { in: matchingPlans }
        })
      }

      whereClause.OR = orConditions
    }

    // Get total count for pagination
    const totalCount = await db.subscription.count({
      where: whereClause
    })

    // Get paginated subscriptions
    const subscriptions = await db.subscription.findMany({
      where: whereClause,
      include: {
        seeker: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })

    // Transform the data to match the expected format
    const transformedSubscriptions = subscriptions.map(sub => ({
      id: sub.id,
      userId: sub.seekerId,
      planId: sub.plan,
      status: sub.status,
      currentPeriodStart: sub.createdAt.toISOString(),
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() || new Date().toISOString(),
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
      user: {
        id: sub.seeker.user.id,
        name: sub.seeker.user.name,
        email: sub.seeker.user.email || 'No email',
        role: sub.seeker.user.role
      },
      plan: {
        id: sub.plan,
        name: getPlanName(sub.plan),
        price: getPlanPrice(sub.plan),
        billing: getPlanBilling(sub.plan)
      }
    }))

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      subscriptions: transformedSubscriptions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    )
  }
}

function getPlanName(plan: string): string {
  return planDisplayName(plan)
}

function getPlanPrice(plan: string): number {
  return planPrice(plan)
}

function getPlanBilling(plan: string): string {
  return getPlanByMembershipPlan(plan)?.billing ?? 'month'
}