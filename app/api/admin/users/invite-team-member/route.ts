import { NextResponse, NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { createTeamInvitation } from '@/lib/team-invitations'

// Feature flag - set to true when team member feature is ready
const TEAM_MEMBER_FEATURE_ENABLED = false

interface InviteTeamMemberRequest {
  email: string
  employerId: string
  name?: string
  message?: string
  role?: string
  allowResend?: boolean
}

export async function POST(request: NextRequest) {
  try {
    // Check if feature is enabled
    if (!TEAM_MEMBER_FEATURE_ENABLED) {
      return NextResponse.json({ 
        error: 'Team member invitations are currently under development. This feature will be available soon.' 
      }, { status: 503 })
    }

    // Verify admin access
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: InviteTeamMemberRequest = await request.json()
    const { email, employerId, name, message, role: rawRole, allowResend = true } = body
    // Default to 'member' if role is empty or not provided
    const role = rawRole || 'member'

    console.log('📨 Admin team member invitation request received:', { email, employerId, name, role, allowResend });

    // Validate required fields
    if (!email || !employerId) {
      return NextResponse.json({
        error: 'Email and employer are required'
      }, { status: 400 })
    }

    // Verify the employer exists
    const employer = await db.userProfile.findUnique({
      where: { id: employerId },
      include: {
        employer: {
          select: {
            companyName: true
          }
        }
      }
    })

    if (!employer || employer.role !== 'employer') {
      console.log(`❌ Invalid employer selected: ${employerId}`);
      return NextResponse.json({
        error: 'Invalid employer selected'
      }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await db.userProfile.findFirst({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      console.log(`❌ User already exists with email: ${email}`);
      return NextResponse.json({
        error: 'User with this email already exists'
      }, { status: 409 })
    }

    console.log(`🔧 Creating team member invitation for ${email} under employer ${employerId}`);

    // Use team invitation system
    await createTeamInvitation(
      employerId,
      employer.employer?.companyName || employer.name,
      email,
      currentUser.profile.id,
      role,
      currentUser.profile.name,
      message,
      allowResend
    );

    console.log(`✅ Team member invitation created successfully for ${email}`);

    // Log admin action for the team member invitation
    await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'team_member_invitation_sent',
        targetEntity: 'team_invitation',
        targetId: `${employerId}:${email.toLowerCase()}`,
        details: {
          email: email.toLowerCase(),
          employerId,
          employerName: employer.name,
          companyName: employer.employer?.companyName,
          invitedUserName: name,
          message: message || null,
          invitationMethod: 'admin_team_invite',
          role: role
        }
      }
    })

    console.log(`✅ Team member invitation process completed for ${email}`);

    return NextResponse.json({
      success: true,
      message: `Team member invitation sent to ${email}`,
      invitation: {
        email: email.toLowerCase(),
        employerId,
        employerName: employer.name,
        companyName: employer.employer?.companyName,
        name: name || null,
        invitedBy: currentUser.profile.name,
        invitedAt: new Date().toISOString(),
        type: 'team_member',
        role: role
      }
    })
  } catch (error: any) {
    console.error('💥 Error creating team member invitation:', error)

    // Check if this is a Clerk error about pending invitations or existing users
    if (error?.message?.includes('invitation') ||
      error?.code === 'form_identifier_exists' ||
      error?.message?.includes('already exists in the system')) {
      console.log(`⚠️ User or invitation conflict for email: ${error?.message}`);
      return NextResponse.json({
        error: error.message
      }, { status: 409 })
    }

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}