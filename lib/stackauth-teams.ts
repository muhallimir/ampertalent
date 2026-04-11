import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

/**
 * @deprecated This function used Stack Auth's team system which has been removed.
 * Team management now happens through custom database records only.
 * The teamId field in the employer table is no longer used.
 *
 * Get or create a team for an employer (deprecated - teams are now managed via database only)
 * @param employerId - The employer's user ID (Clerk ID)
 * @param companyName - The employer's company name
 * @returns Null (team system deprecated)
 */
export async function getOrCreateEmployerTeam(employerId: string, companyName: string) {
  console.warn(`⚠️  getOrCreateEmployerTeam is deprecated. Team system has been migrated from Stack Auth.`);
  console.log(`🔍 Legacy call for employer ${employerId} (${companyName}) - returning null`);

  // Team management is now handled through database records only
  // The Stack Auth team system has been removed
  return null;
}

/**
 * Get invitation token by team member ID
 * @param teamMemberId - The team member record ID
 * @returns The invitation token or null if not found
 */
export async function getInvitationTokenByTeamMemberId(teamMemberId: string): Promise<string | null> {
  try {
    console.log(`🔍 Looking up invitation token for team member ${teamMemberId}`);

    // First get the team member to get employerId and email
    const teamMember = await db.teamMember.findUnique({
      where: { id: teamMemberId },
      select: {
        employerId: true,
        email: true
      }
    });

    if (!teamMember) {
      console.log(`❌ Team member not found: ${teamMemberId}`);
      return null;
    }

    console.log(`📋 Team member found:`, teamMember);

    // Find the corresponding team invitation by employerId and email
    const teamInvitation = await db.teamInvitation.findFirst({
      where: {
        employerId: teamMember.employerId,
        email: teamMember.email
      },
      select: {
        invitationToken: true
      },
      orderBy: {
        createdAt: 'desc' // Get the most recent invitation
      }
    });

    if (!teamInvitation) {
      console.log(`❌ No invitation found for team member: ${teamMemberId}`);
      return null;
    }

    console.log(`✅ Found invitation token for team member ${teamMemberId}: ${teamInvitation.invitationToken}`);
    return teamInvitation.invitationToken;
  } catch (error) {
    console.error(`❌ Failed to get invitation token for team member ${teamMemberId}:`, error);
    return null;
  }
}

/**
 * Create a team invitation using database records
 * @param employerId - The employer's user ID (Clerk ID)
 * @param companyName - The employer's company name
 * @param email - The email to invite
 * @param invitedBy - Who is sending the invitation (user profile ID)
 * @param role - The role to assign (default: member)
 * @returns The team invitation and member records
 */
export async function createTeamInvitation(
  employerId: string,
  companyName: string,
  email: string,
  invitedBy: string,
  role: string = 'member'
) {
  try {
    console.log(`📨 createStackAuthTeamInvitation called:`, { employerId, companyName, email, invitedBy, role });

    // Validate the role
    const validRoles = ['admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      console.error(`❌ Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
      throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
    }

    // Create invitation token and expiration
    const invitationToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days
    console.log(`🔑 Generated invitation token: ${invitationToken}`);

    // Create a team invitation record in our database
    console.log(`💾 Creating team invitation record for ${email}`);
    const teamInvitation = await db.teamInvitation.create({
      data: {
        employerId: employerId,
        email: email.toLowerCase(),
        role: role,
        invitedBy: invitedBy, // This is the UserProfile.id of the inviter
        invitationToken: invitationToken,
        expiresAt: expiresAt
      }
    })
    console.log(`✅ Team invitation record created:`, teamInvitation);

    // Create a team member record in our database
    console.log(`💾 Creating team member record for ${email}`);
    const teamMember = await db.teamMember.create({
      data: {
        employerId: employerId,
        email: email.toLowerCase(),
        name: null,
        role: role,
        status: 'pending',
        invitedBy: invitedBy,
        userId: null
      }
    })
    console.log(`✅ Team member record created:`, teamMember);

    // Verify NEXT_PUBLIC_APP_URL is available
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    console.log(`🌐 NEXT_PUBLIC_APP_URL from environment: ${appUrl}`);

    if (!appUrl) {
      console.error('❌ NEXT_PUBLIC_APP_URL is not set in environment variables');
      throw new Error('Application URL not configured - contact administrator');
    }

    // Generate callback URL for custom invitation email
    const callbackUrl = `${appUrl}/team-invite?token=${invitationToken}&teamMemberId=${teamMember.id}`;
    console.log(`🔗 Generated callback URL: ${callbackUrl}`);

    // TODO: Send custom invitation email with callbackUrl
    // This replaces the Stack Auth team.inviteUser() call
    console.log(`📧 Team invitation created for ${email} - custom email sending to be implemented`);
    console.log(`   Callback URL: ${callbackUrl}`);

    console.log(`✅ Team invitation created successfully for ${email} with role: ${role}`);
    return {
      teamInvitation,
      teamMember
    }
  } catch (error) {
    console.error(`❌ Failed to send team invitation to ${email}:`, error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown'
    });
    throw error;
  }
}

/**
 * Validate team invitation token and get invitation details
 * @param invitationToken - The invitation token
 * @returns The team invitation record or null if invalid
 */
export async function validateTeamInvitationToken(invitationToken: string) {
  try {
    console.log(`🔍 Validating team invitation token: ${invitationToken}`);

    const teamInvitation = await db.teamInvitation.findUnique({
      where: { invitationToken: invitationToken },
      include: {
        employer: {
          select: {
            companyName: true,
            userId: true
          }
        },
        inviter: {
          select: {
            name: true
          }
        }
      }
    });

    if (!teamInvitation) {
      console.log(`❌ Team invitation not found for token: ${invitationToken}`);
      return null;
    }

    // Check if invitation has expired
    if (teamInvitation.expiresAt < new Date()) {
      console.log(`❌ Team invitation expired: ${invitationToken}`);
      return null;
    }

    console.log(`✅ Team invitation validated for ${teamInvitation.email} with role: ${teamInvitation.role}`);
    return teamInvitation;
  } catch (error) {
    console.error(`❌ Failed to validate team invitation token:`, error);
    return null;
  }
}

/**
 * Update team member record when user accepts invitation
 * @param teamMemberId - The team member record ID
 * @param userProfileId - The UserProfile ID (NOT StackAuth user ID)
 * @param name - The user's name
 * @returns void
 */
export async function updateTeamMemberOnAccept(
  teamMemberId: string,
  userProfileId: string, // This should be the UserProfile.id, not StackAuth userId
  name?: string
) {
  try {
    console.log(`🔄 Updating team member record ${teamMemberId} for user profile ${userProfileId}`);

    // First verify the team member record exists
    const existingTeamMember = await db.teamMember.findUnique({
      where: { id: teamMemberId },
      select: {
        id: true,
        status: true,
        email: true
      }
    });

    if (!existingTeamMember) {
      console.log(`❌ Team member record not found: ${teamMemberId}`);
      throw new Error(`Team member record not found: ${teamMemberId}`);
    }

    console.log(`📋 Existing team member record:`, existingTeamMember);

    // Verify that the userProfileId exists
    const userProfile = await db.userProfile.findUnique({
      where: { id: userProfileId },
      select: { id: true, clerkUserId: true, email: true }
    });

    if (!userProfile) {
      console.log(`❌ User profile not found: ${userProfileId}`);
      throw new Error(`User profile not found: ${userProfileId}`);
    }

    console.log(`📋 Found user profile:`, userProfile);

    const updatedTeamMember = await db.teamMember.update({
      where: { id: teamMemberId },
      data: {
        userId: userProfileId, // This is the UserProfile.id, which satisfies the foreign key constraint
        name: name || null,
        status: 'active',
        joinedAt: new Date()
      },
      include: {
        employer: {
          select: {
            userId: true
          }
        }
      }
    })

    console.log(`✅ Team member record updated with userProfileId ${userProfileId}`);
    return updatedTeamMember
  } catch (error) {
    console.error(`❌ Failed to update team member record ${teamMemberId}:`, error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
    });
    throw new Error(`Failed to update team member: ${error instanceof Error ? error.message : 'Database error'}`)
  }
}

/**
 * Mark team invitation as accepted
 * @param invitationToken - The invitation token
 * @returns void
 */
export async function markTeamInvitationAsAccepted(invitationToken: string) {
  try {
    console.log(`✅ Marking team invitation as accepted: ${invitationToken}`);

    const updatedInvitation = await db.teamInvitation.update({
      where: { invitationToken: invitationToken },
      data: {
        acceptedAt: new Date()
      }
    });

    console.log(`✅ Team invitation marked as accepted for ${updatedInvitation.email}`);
    return updatedInvitation;
  } catch (error) {
    console.error(`❌ Failed to mark team invitation as accepted:`, error);
    throw error;
  }
}
