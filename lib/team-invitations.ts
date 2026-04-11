import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { clerkClient } from '@clerk/nextjs/server'

/**
 * @deprecated This function used the old team system which has been removed.
 * Team management now happens through custom database records only.
 * The teamId field in the employer table is no longer used.
 *
 * Get or create a team for an employer (deprecated - teams are now managed via database only)
 * @param employerId - The employer's user ID (Clerk ID)
 * @param companyName - The employer's company name
 * @returns Null (team system deprecated)
 */
export async function getOrCreateEmployerTeam(employerId: string, companyName: string) {
  console.warn(`⚠️  getOrCreateEmployerTeam is deprecated. Team system has been migrated to custom database records.`);
  console.log(`🔍 Legacy call for employer ${employerId} (${companyName}) - returning null`);

  // Team management is now handled through database records only
  // The old team system has been removed
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
 * @param invitedByName - The name of the person sending the invitation (for Clerk email)
 * @param message - Personal message for the invitation (optional)
 * @param allowResend - Whether to allow resending invitations (default: false)
 * @returns The team invitation and member records
 */
export async function createTeamInvitation(
  employerId: string,
  companyName: string,
  email: string,
  invitedBy: string,
  role: string = 'member',
  invitedByName?: string,
  message?: string | null,
  allowResend: boolean = false
) {
  try {
    const clerk = await clerkClient();
    console.log(`📨 createTeamInvitation called:`, { employerId, companyName, email, invitedBy, role, message, allowResend });

    // Validate the role
    const validRoles = ['admin', 'member', 'viewer'];
    if (!validRoles.includes(role)) {
      console.error(`❌ Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
      throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
    }

    // If resending is allowed, we should remove any existing pending invitations from our database
    if (allowResend) {
      console.log(`🔄 Removing existing pending team invitations from database for ${email} (resend allowed)`);
      const existingInvitations = await db.teamInvitation.findMany({
        where: { 
          email: email.toLowerCase(),
          employerId: employerId,
          acceptedAt: null,
          expiresAt: { gte: new Date() }
        }
      });
      
      if (existingInvitations.length > 0) {
        console.log(`🔄 Found ${existingInvitations.length} existing pending team invitations, removing them`);
        if(existingInvitations[0].clerkInvitationId){
          // revoke pending request to send a new email invite
          await clerk.invitations.revokeInvitation(existingInvitations[0].clerkInvitationId)
          // Delete existing pending invitations
          await db.teamInvitation.deleteMany({
            where: { 
              email: email.toLowerCase(),
              employerId: employerId,
              acceptedAt: null,
              expiresAt: { gte: new Date() }
            }
          });
          // Also remove corresponding team member records
          await db.teamMember.deleteMany({
            where: {
              email: email.toLowerCase(),
              employerId: employerId,
              status: 'pending'
            }
          });
        }
      }
    }

    // Create invitation token and expiration
    const invitationToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Expires in 30 days
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
        expiresAt: expiresAt,
        message: message || null
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

    // Create Clerk invitation
    let clerkInvitationId: string | null = null;
    console.log(`📧 Attempting to create Clerk team invitation for ${email}`);
    try {
      console.log(`🔧 Clerk client initialized successfully for team invitation`);
      
      // Simplified params to avoid 422 errors
      const invitationParams = {
        emailAddress: email.toLowerCase(),
        redirectUrl: `${appUrl}/sign-up?token=${encodeURIComponent(invitationToken)}`
      };
      
      console.log(`📧 Clerk team invitation params:`, invitationParams);
      
      const invitation = await clerk.invitations.createInvitation(invitationParams);
      
      clerkInvitationId = invitation.id;
      console.log(`✅ Clerk team invitation created successfully`, {
        invitationId: invitation.id,
        email: invitation.emailAddress,
        status: invitation.status,
        createdAt: invitation.createdAt,
        updatedAt: invitation.updatedAt
      });
    } catch (clerkError: any) {
      console.error('❌ Failed to create Clerk invitation:', clerkError);
      console.error('❌ Clerk error details:', {
        message: clerkError?.message,
        code: clerkError?.code,
        meta: clerkError?.meta,
        name: clerkError?.name,
        status: clerkError?.status
      });
      
      // Handle specific Clerk error cases
      const isExistingUserError = clerkError?.code === 'form_identifier_exists' || 
                                clerkError?.message?.includes('already exists') ||
                                clerkError?.status === 422;
      
      const isPendingInvitationError = clerkError?.message?.includes('invitation');
      
      if (isExistingUserError) {
        console.log(`⚠️ User ${email} already exists in Clerk`);
        // Clean up our database records since we can't create a Clerk invitation
        await db.teamInvitation.delete({
          where: { id: teamInvitation.id }
        });
        await db.teamMember.delete({
          where: { id: teamMember.id }
        });
        console.log(`🗑️ Cleaned up database records for ${email}`);
        throw new Error(`A user with email ${email} already exists in the system. Please use a different email or ask them to sign in if they have an account.`);
      } else if (isPendingInvitationError) {
        console.log(`ℹ️ User ${email} already has pending invitation in Clerk`);
        // Clean up our database records
        await db.teamInvitation.delete({
          where: { id: teamInvitation.id }
        });
        await db.teamMember.delete({
          where: { id: teamMember.id }
        });
        console.log(`🗑️ Cleaned up database records for ${email}`);
        throw new Error('This email already has a pending invitation. Please check your inbox or contact support if you haven\'t received it.');
      } else {
        // For other errors, we should still allow the invitation to be created in our system
        console.warn('⚠️ Clerk invitation failed, but team invitation records created');
      }
    }

    // Update the team invitation record with the Clerk invitation ID
    if (clerkInvitationId) {
      console.log(`💾 Updating team invitation with Clerk invitation ID: ${clerkInvitationId}`);
      await db.teamInvitation.update({
        where: { id: teamInvitation.id },
        data: { clerkInvitationId }
      });
      console.log(`✅ Updated team invitation with Clerk invitation ID: ${clerkInvitationId}`);
    } else {
      console.warn(`⚠️ No Clerk invitation ID to store for ${email} - Clerk invitation may have failed`);
    }
  } catch (error) {
    console.error(`❌ Failed to send team invitation to ${email}:`, error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : 'No stack trace'
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
            userId: true,
            companyLogoUrl: true
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
 * @param userProfileId - The UserProfile ID (NOT Clerk user ID)
 * @param name - The user's name
 * @returns void
 */
export async function updateTeamMemberOnAccept(
  teamMemberId: string,
  userProfileId: string, // This should be the UserProfile.id, not Clerk userId
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