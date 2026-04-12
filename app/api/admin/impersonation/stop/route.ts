import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, logAdminAction } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Verify admin access (both admin and super_admin can impersonate)
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.profile?.role || (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { targetUserId } = await request.json()

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 })
    }

    // Get target user details for logging
    const targetUser = await db.userProfile.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // Log the impersonation stop action
    await logAdminAction(
      currentUser.profile.id,
      'impersonation_stop',
      'user',
      targetUserId,
      {
        targetUserName: targetUser.name,
        targetUserRole: targetUser.role,
        targetUserEmail: targetUser.email,
        adminName: currentUser.profile.name,
        adminEmail: currentUser.profile.email,
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error stopping impersonation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}