import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get query parameters for filtering and pagination
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') // 'active', 'expired', 'all'
    const search = searchParams.get('search') // email search

    const skip = (page - 1) * limit

    // Build where clause for pending signups only (seeker subscriptions)
    const where: any = {}

    // Filter by status
    if (status === 'active') {
      where.expiresAt = { gte: new Date() }
    } else if (status === 'expired') {
      where.expiresAt = { lt: new Date() }
    }

    // Search by email
    if (search) {
      where.email = {
        contains: search,
        mode: 'insensitive'
      }
    }

    // Fetch ALL pending signups first (for deduplication)
    const allPendingSignups = await db.pendingSignup.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    // Deduplicate by email - keep only the most recent entry per email
    const deduplicatedMap = new Map<string, typeof allPendingSignups[0]>()
    allPendingSignups.forEach(signup => {
      const email = signup.email.toLowerCase()
      // Only keep if we haven't seen this email, or if this entry is newer
      if (!deduplicatedMap.has(email)) {
        deduplicatedMap.set(email, signup)
      }
    })

    const deduplicatedSignups = Array.from(deduplicatedMap.values())
    const totalCount = deduplicatedSignups.length

    // Apply pagination to deduplicated list
    const pendingSignups = deduplicatedSignups.slice(skip, skip + limit)

    // Parse onboarding data and add user type info
    const enrichedSignups = pendingSignups.map(signup => {
      let onboardingData = {}
      let userType = 'seeker'

      try {
        onboardingData = JSON.parse(signup.onboardingData)
        userType = (onboardingData as any).userType || 'seeker'
      } catch (error) {
        console.error('Error parsing onboarding data:', error)
      }

      return {
        ...signup,
        userType,
        onboardingData,
        isExpired: signup.expiresAt < new Date(),
        timeRemaining: signup.expiresAt.getTime() - Date.now()
      }
    })

    // Calculate stats - seeker pending signups only
    const stats = {
      total: totalCount,
      active: await db.pendingSignup.count({
        where: { expiresAt: { gte: new Date() } }
      }),
      expired: await db.pendingSignup.count({
        where: { expiresAt: { lt: new Date() } }
      })
    }

    return NextResponse.json({
      pendingSignups: enrichedSignups,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      stats
    })

  } catch (error) {
    console.error('Error fetching pending signups:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending signups' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin access
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'cleanup-expired') {
      // Delete all expired pending signups
      const result = await db.pendingSignup.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      })

      return NextResponse.json({
        message: `Deleted ${result.count} expired pending signups`,
        deletedCount: result.count
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error in pending signups DELETE:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}