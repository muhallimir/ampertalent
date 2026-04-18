import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { notificationService } from '@/lib/notification-service'
import { createUserInvitation, InvitationPackageInfo } from '@/lib/user-invitations'
import { UserRole } from '@prisma/client'

interface InviteUserRequest {
  email: string
  role: string
  name?: string
  message?: string
  allowResend?: boolean
  packageInfo?: InvitationPackageInfo | null
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access - both admin and super_admin can invite users
    const currentUser = await getCurrentUser()
    if (!currentUser?.profile?.role || (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: InviteUserRequest = await request.json()
    const { email, role, name, message, allowResend = true, packageInfo } = body

    console.log('📨 Admin invitation request received:', { email, role, name, allowResend, packageInfo });

    // Validate required fields
    if (!email || !role) {
      return NextResponse.json({
        error: 'Email and role are required'
      }, { status: 400 })
    }

    // Validate role
    const validRoleStrings = Object.values(UserRole).map(role => role.toString());
    if (!validRoleStrings.includes(role)) {
      return NextResponse.json({
        error: 'Invalid role specified'
      }, { status: 400 })
    }

    // Validate packageInfo if provided (only valid for employer role)
    if (packageInfo && role !== 'employer') {
      return NextResponse.json({
        error: 'Package assignment is only valid for employer invitations'
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

    // Log admin action for the invitation
    await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'user_invitation_sent',
        targetEntity: 'user_invitation',
        targetId: email.toLowerCase(),
        details: {
          email: email.toLowerCase(),
          role,
          invitedUserName: name,
          message: message || null,
          invitationMethod: 'manual_admin_invite',
          packageInfo: packageInfo ? JSON.parse(JSON.stringify(packageInfo)) : null,
        }
      }
    })

    // Create user invitation using the user invitations library
    // Pass packageInfo for employer invitations with packages
    const userInvitation = await createUserInvitation(
      email.toLowerCase(),
      role as UserRole,
      currentUser.profile.id,
      name || null,
      message || null,
      allowResend,
      packageInfo || null
    );

    // Generate invitation URL with the new invitation token
    const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/sign-up?token=${encodeURIComponent(userInvitation.invitationToken)}&email=${encodeURIComponent(email)}&role=${role}`

    // Send invitation email using the existing notification service
    try {
      // For platform invitations, we can use a generic team invitation template
      // but with platform-specific details
      await notificationService.sendTeamInvitation({
        firstName: name || 'there',
        email: email.toLowerCase(),
        companyName: 'ampertalent Platform',
        inviterName: currentUser.profile.name || 'Admin',
        role: role,
        acceptUrl: invitationUrl,
        employerId: currentUser.profile.id // Using admin ID for platform invitations
      })

      console.log(`✅ Invitation email sent to ${email}`)
    } catch (emailError) {
      console.error('❌ Failed to send invitation email:', emailError)
      // Don't fail the whole request if email fails, just log it
    }

    // Log success
    console.log(`✅ Invitation process completed for ${email} with role ${role}`)
    console.log(`Admin ${currentUser.profile.name} invited ${name || email} as ${role}`)

    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}`,
      invitation: {
        email: email.toLowerCase(),
        role,
        name: name || null,
        invitedBy: currentUser.profile.name,
        invitedAt: new Date().toISOString()
      }
    })
  } catch (error: any) {
    console.error('💥 Error creating user invitation:', error)

    // Check if this is a Clerk error about pending invitations or existing users
    if (error?.message?.includes('invitation') ||
      error?.code === 'form_identifier_exists' ||
      error?.message?.includes('already exists in the system')) {
      console.log(`⚠️ User or invitation conflict for email: ${error?.message}`);
      return NextResponse.json({
        error: error.message
      }, { status: 409 })
    }

    console.error('💥 Unexpected error in invitation creation:', {
      message: error.message,
      stack: error.stack
    });

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}