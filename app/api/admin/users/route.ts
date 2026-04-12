import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/users
 * List users with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.userProfile.findUnique({
      where: { clerkUserId: userId },
    })

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 20

    const users = await db.userProfile.findMany({
      where: role ? { role: role as any } : {},
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await db.userProfile.count({
      where: role ? { role: role as any } : {},
    })

    return NextResponse.json(
      {
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Admin Users] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/users/[id]/suspend
 * Suspend/unsuspend a user
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.userProfile.findUnique({
      where: { clerkUserId: userId },
    })

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userIdToModify, action } = await request.json()
    if (!userIdToModify || !action) {
      return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 })
    }

    const targetUser = await db.userProfile.findUnique({
      where: { id: userIdToModify },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let updateData: any = {}
    if (action === 'suspend') {
      updateData.isActive = false
    } else if (action === 'unsuspend') {
      updateData.isActive = true
    }

    const updated = await db.userProfile.update({
      where: { id: userIdToModify },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
    })

    console.log(`[Admin] User ${userIdToModify} ${action}d by admin ${userId}`)

    // If seeker, also suspend their membership
    if (action === 'suspend') {
      await db.jobSeeker.updateMany({
        where: { userId: userIdToModify },
        data: { isSuspended: true },
      })
    }

    return NextResponse.json(
      {
        success: true,
        data: updated,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Admin User Suspension] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
