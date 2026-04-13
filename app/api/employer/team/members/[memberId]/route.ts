import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function DELETE(
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

    if (!memberId) {
      return NextResponse.json({
        error: 'Member ID is required'
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

    // Don't allow removing yourself
    if (teamMember.userId === currentUser.profile.id) {
      return NextResponse.json({
        error: 'You cannot remove yourself from the team'
      }, { status: 400 })
    }

    // Remove the team member
    await db.teamMember.delete({
      where: { id: memberId }
    })

    // Log the action
    await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'team_member_removed',
        targetEntity: 'team_member',
        targetId: memberId,
        details: {
          removedMemberEmail: teamMember.email,
          removedMemberRole: teamMember.role,
          employerId: currentUser.profile.id
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Team member removed successfully'
    })
  } catch (error) {
    console.error('Error removing team member:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}