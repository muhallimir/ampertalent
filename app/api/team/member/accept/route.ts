import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { updateTeamMemberOnAccept } from '@/lib/team-invitations'

interface AcceptTeamMemberRequest {
  teamMemberId: string
  userId: string
  name?: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Team member acceptance request received');

    // Verify user is authenticated
    const currentUser = await getCurrentUser()
    if (!currentUser?.profile) {
      console.log('❌ Unauthorized: No user profile');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: AcceptTeamMemberRequest = await request.json()
    const { teamMemberId, userId, name } = body

    console.log('📋 Request data:', {
      teamMemberId,
      userId,
      name,
      currentUserEmail: currentUser.clerkUser?.primaryEmailAddress?.emailAddress,
      currentUserProfileId: currentUser.profile?.id,
      currentClerkUserId: currentUser.clerkUser?.id
    });

    // Validate required fields
    if (!teamMemberId || !userId) {
      console.log('❌ Missing required fields');
      return NextResponse.json({
        error: 'Team member ID and user ID are required'
      }, { status: 400 })
    }

    // Verify that the current user's Clerk ID matches the userId in the request
    if (currentUser.clerkUser.id !== userId) {
      console.log('❌ User mismatch', {
        currentClerkUserId: currentUser.clerkUser.id,
        requestedUserId: userId
      });
      return NextResponse.json({
        error: 'User mismatch: Current user ID does not match requested user ID'
      }, { status: 403 })
    }

    // Check if team member record exists
    console.log('🔍 Looking up team member record:', teamMemberId);
    const teamMemberRecord = await db.teamMember.findUnique({
      where: { id: teamMemberId },
      select: {
        id: true,
        email: true,
        userId: true,
        status: true,
        employerId: true
      }
    });

    if (!teamMemberRecord) {
      console.log('❌ Team member record not found:', teamMemberId);
      // Let's also check if ANY team member records exist for debugging
      try {
        const allTeamMembers = await db.teamMember.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, email: true, status: true, createdAt: true }
        });
        console.log('📋 Recent team member records:', allTeamMembers);
      } catch (dbError) {
        console.log('❌ Error fetching recent team members:', dbError.message);
      }
      return NextResponse.json({
        error: 'Team member invitation not found'
      }, { status: 404 });
    }

    console.log('📋 Found team member record:', teamMemberRecord);

    // Verify email matches
    if (teamMemberRecord.email !== currentUser.clerkUser.primaryEmailAddress?.emailAddress) {
      console.log('❌ Email mismatch', {
        recordEmail: teamMemberRecord.email,
        userEmail: currentUser.clerkUser.primaryEmailAddress?.emailAddress
      });
      return NextResponse.json({
        error: `This invitation is not for your email address. Expected: ${teamMemberRecord.email}, Got: ${currentUser.clerkUser.primaryEmailAddress?.emailAddress}`
      }, { status: 403 });
    }

    // Verify status is pending
    if (teamMemberRecord.status !== 'pending') {
      console.log('❌ Invalid status', {
        currentStatus: teamMemberRecord.status,
        teamMemberId: teamMemberId
      });
      return NextResponse.json({
        error: `This invitation has already been accepted or is no longer valid. Current status: ${teamMemberRecord.status}`
      }, { status: 400 });
    }

    // Update the team member record using the shared function
    // Pass the UserProfile.id, not the Clerk userId
    console.log('✅ Validating team member record, proceeding with update using userProfileId:', currentUser.profile.id);
    const updatedTeamMember = await updateTeamMemberOnAccept(teamMemberId, currentUser.profile.id, name)

    console.log(`✅ Team member record updated for user ${currentUser.profile.id} in employer ${updatedTeamMember.employerId}`)

    // Send notification to employer that team member joined
    try {
      await db.notification.create({
        data: {
          userId: updatedTeamMember.invitedBy,
          type: 'employer_invitation_accepted',
          title: 'Team Member Joined',
          message: `${name || 'A team member'} has accepted your team invitation and joined your team.`,
          actionUrl: `/employer/team`,
          priority: 'medium'
        }
      })
    } catch (notificationError) {
      console.warn('⚠️ Failed to send employer notification:', notificationError)
    }

    return NextResponse.json({
      success: true,
      message: 'Team member invitation accepted',
      teamMember: {
        id: updatedTeamMember.id,
        employerId: updatedTeamMember.employerId,
        email: updatedTeamMember.email,
        name: updatedTeamMember.name,
        role: updatedTeamMember.role,
        status: updatedTeamMember.status
      }
    })
  } catch (error) {
    console.error('🚨 Error accepting team member invitation:', error)
    console.error('🚨 Error details:', {
      message: error?.message,
      name: error?.name
    });
    return NextResponse.json({
      error: 'Failed to accept team member invitation: ' + (error.message || 'Unknown error')
    }, { status: 500 })
  }
}
