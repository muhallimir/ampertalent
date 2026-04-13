import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { createTeamInvitation } from '@/lib/team-invitations'

// Feature flag - set to true when team member feature is ready
const TEAM_MEMBER_FEATURE_ENABLED = false

interface InviteTeamMemberRequest {
  email: string
  role: 'admin' | 'member' | 'viewer'
}

export async function POST(request: NextRequest) {
  try {
    // Check if feature is enabled
    if (!TEAM_MEMBER_FEATURE_ENABLED) {
      return NextResponse.json({ 
        error: 'Team member invitations are currently under development. This feature will be available soon.' 
      }, { status: 503 })
    }

    // Get current user and verify they're an employer
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Employer team invite API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    // Verify user is an employer or admin impersonating an employer
    if (currentUser.profile.role !== 'employer' && !(currentUser.isImpersonating && currentUser.profile.role === 'employer')) {
      console.log('🚫 EMPLOYER TEAM INVITE: Access denied', {
        userRole: currentUser.profile.role,
        isImpersonating: currentUser.isImpersonating,
        userId: currentUser.profile.id,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined
      })
      return NextResponse.json({ error: 'Unauthorized - Employer access required' }, { status: 401 })
    }

    const body: InviteTeamMemberRequest = await request.json()
    const { email, role } = body

    // Validate required fields
    if (!email || !role) {
      return NextResponse.json({ 
        error: 'Email and role are required' 
      }, { status: 400 })
    }

    // Validate role
    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role specified. Must be admin, member, or viewer' 
      }, { status: 400 })
    }

    // Get employer details
    const employer = await db.employer.findUnique({
      where: { userId: currentUser.profile.id },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (!employer) {
      return NextResponse.json({ 
        error: 'Employer profile not found' 
      }, { status: 404 })
    }

    // Check if user is already a team member for this employer
    const existingTeamMember = await db.teamMember.findFirst({
      where: {
        employerId: currentUser.profile.id,
        email: email.toLowerCase()
      }
    })

    if (existingTeamMember) {
      return NextResponse.json({
        error: 'User is already a member of this team or has a pending invitation'
      }, { status: 409 })
    }

    // Log the team invitation action
    await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'employer_team_invitation_sent',
        targetEntity: 'team_invitation',
        targetId: `${currentUser.profile.id}:${email.toLowerCase()}`,
        details: {
          email: email.toLowerCase(),
          teamRole: role,
          employerId: currentUser.profile.id,
          employerName: currentUser.profile.name,
          companyName: employer.companyName,
          invitationMethod: 'employer_team_invite'
        }
      }
    })

    // Create team invitation using the shared library function
    await createTeamInvitation(
      currentUser.profile.id,
      employer.companyName,
      email.toLowerCase(),
      currentUser.profile.id,
      role,
      currentUser.profile.name
    )

    console.log(`Team invitation sent by ${employer.companyName} (${currentUser.profile.name}) to ${email} with role ${role}`)
    return NextResponse.json({
      success: true,
      message: `Team invitation sent to ${email}`,
      invitation: {
        email: email.toLowerCase(),
        role,
        companyName: employer.companyName,
        invitedBy: currentUser.profile.name,
        invitedAt: new Date().toISOString(),
        type: 'employer_team_member'
      }
    })
  } catch (error) {
    console.error('Error creating team invitation:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}