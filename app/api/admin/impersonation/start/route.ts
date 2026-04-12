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

    // Get target user details
    const targetUser = await db.userProfile.findUnique({
      where: { id: targetUserId },
      include: {
        employer: {
          select: {
            companyName: true,
          },
        },
        jobSeeker: {
          select: {
            headline: true,
          },
        },
      },
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // Prevent impersonating other admins (super admins can impersonate admins for support)
    if (currentUser.profile.role === 'admin' && (targetUser.role === 'admin' || targetUser.role === 'super_admin')) {
      return NextResponse.json({ error: 'Cannot impersonate admin users' }, { status: 403 })
    }

    // Log the impersonation start action
    await logAdminAction(
      currentUser.profile.id,
      'impersonation_start',
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

    // Return success with user details
    return NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        clerkUserId: targetUser.clerkUserId,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        companyName: targetUser.employer?.companyName,
        headline: targetUser.jobSeeker?.headline,
      },
    })
  } catch (error) {
    console.error('Error starting impersonation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}