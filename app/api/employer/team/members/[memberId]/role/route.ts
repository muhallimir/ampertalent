import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

interface UpdateRoleRequest {
  role: 'admin' | 'member' | 'viewer'
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    // Await params for Next.js 16
    const { memberId } = await params

    // Get current user and verify they're an employer
    const currentUser = await getCurrentUser(request)

    // Verify employer role (allow impersonation of employer accounts)
    if (!currentUser?.profile?.role || currentUser.profile.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized - Employer access required' }, { status: 401 })
    }

    const body: UpdateRoleRequest = await request.json()
    const { role } = body

    if (!memberId) {
      return NextResponse.json({
        error: 'Member ID is required'
      }, { status: 400 })
    }

    if (!role) {
      return NextResponse.json({
        error: 'Role is required'
      }, { status: 400 })
    }

    // Validate role
    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({
        error: 'Invalid role specified. Must be admin, member, or viewer'
      }, { status: 400 })
    }

    // Verify the team member belongs to this employer
    const teamMember = await db.teamMember.findFirst({
      where: {
        id: memberId,
        employerId: currentUser.profile.id
      }
    })

    if (!teamMember) {
      return NextResponse.json({
        error: 'Team member not found or access denied'
      }, { status: 404 })
    }

    // Don't allow changing your own role
    if (teamMember.userId === currentUser.profile.id) {
      return NextResponse.json({
        error: 'You cannot change your own role'
      }, { status: 400 })
    }

    const oldRole = teamMember.role

    // Update the team member role
    const updatedMember = await db.teamMember.update({
      where: { id: memberId },
      data: {
        role,
        updatedAt: new Date()
      }
    })

    // Log the action
    await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'team_member_role_updated',
        targetEntity: 'team_member',
        targetId: memberId,
        details: {
          memberEmail: teamMember.email,
          oldRole,
          newRole: role,
          employerId: currentUser.profile.id
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Team member role updated successfully',
      teamMember: {
        id: updatedMember.id,
        email: updatedMember.email,
        role: updatedMember.role
      }
    })
  } catch (error) {
    console.error('Error updating team member role:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}