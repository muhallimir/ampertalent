import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get current user and verify they're an employer
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Employer team API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    // Verify user is an employer or admin impersonating an employer
    if (currentUser.profile.role !== 'employer' && !(currentUser.isImpersonating && currentUser.profile.role === 'employer')) {
      console.log('🚫 EMPLOYER TEAM: Access denied', {
        userRole: currentUser.profile.role,
        isImpersonating: currentUser.isImpersonating,
        userId: currentUser.profile.id,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined
      })
      return NextResponse.json({ error: 'Unauthorized - Employer access required' }, { status: 401 })
    }

    // Get employer details
    const employer = await db.employer.findUnique({
      where: { userId: currentUser.profile.id }
    })

    if (!employer) {
      return NextResponse.json({
        error: 'Employer profile not found'
      }, { status: 404 })
    }

    // Fetch team members for this employer
    const teamMembers = await db.teamMember.findMany({
      where: { employerId: currentUser.profile.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePictureUrl: true
          }
        },
        inviter: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Transform the data to match the frontend interface
    const transformedMembers = teamMembers.map(member => ({
      id: member.id,
      name: member.name || member.user?.name || 'Unknown',
      email: member.email,
      role: member.role as 'admin' | 'member' | 'viewer',
      status: member.status as 'active' | 'pending' | 'inactive',
      joinedAt: member.joinedAt?.toISOString() || member.invitedAt.toISOString(),
      profilePictureUrl: member.user?.profilePictureUrl,
      invitedBy: member.inviter.name
    }))

    return NextResponse.json({
      success: true,
      teamMembers: transformedMembers
    })
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}