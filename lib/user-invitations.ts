import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { clerkClient } from '@clerk/nextjs/server'
import { UserRole } from '@prisma/client'

/**
 * Package info for invitation-based package provisioning
 */
export interface InvitationPackageInfo {
  packageType: string;        // e.g., 'gold_plus_recurring_6mo'
  packageName: string;        // e.g., 'Gold Plus Small Business'
  billingCycles: number;      // e.g., 6 (months)
  amountCents: number;        // e.g., 9700 ($97.00)
}

/**
 * Create a user invitation using database records
 * @param email - The email to invite
 * @param role - The role to assign
 * @param invitedBy - Who is sending the invitation (user profile ID)
 * @param fullName - The full name of the invited user (optional)
 * @param message - Personal message for the invitation (optional)
 * @param allowResend - Whether to allow resending if invitation exists
 * @param packageInfo - Optional package info for employer invitations
 * @returns The user invitation record
 */
export async function createUserInvitation(
  email: string,
  role: UserRole,
  invitedBy: string,
  fullName?: string | null,
  message?: string | null,
  allowResend: boolean = false,
  packageInfo?: InvitationPackageInfo | null
) {
  try {
    const clerk = await clerkClient();
    console.log(`📨 createUserInvitation called:`, { email, role, invitedBy, fullName, message, allowResend, packageInfo });

    // Validate the role
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(role)) {
      console.error(`❌ Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
      throw new Error(`Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`);
    }

    // If resending is allowed, we should remove any existing pending invitations from our database
    if (allowResend) {
      console.log(`🔄 Removing existing pending invitations from database for ${email} (resend allowed)`);
      const existingInvitations = await db.userInvitation.findMany({
        where: {
          email: email.toLowerCase(),
          acceptedAt: null,
          expiresAt: { gte: new Date() }
        }
      });

      if (existingInvitations.length > 0) {
        console.log(`🔄 Found ${existingInvitations.length} existing pending invitations, removing them`);
        // Revoke each Clerk invitation if we have the ID
        for (const inv of existingInvitations) {
          if (inv.clerkInvitationId) {
            try {
              await clerk.invitations.revokeInvitation(inv.clerkInvitationId);
              console.log(`✅ Revoked Clerk invitation: ${inv.clerkInvitationId}`);
            } catch (revokeError) {
              console.warn(`⚠️ Failed to revoke Clerk invitation ${inv.clerkInvitationId}:`, revokeError);
            }
          }
        }
        // Delete existing pending invitations from our DB
        await db.userInvitation.deleteMany({
          where: {
            email: email.toLowerCase(),
            acceptedAt: null,
            expiresAt: { gte: new Date() }
          }
        });
      }

      // Also check Clerk directly for any orphaned pending invitations (not in our DB)
      try {
        const clerkInvitations = await clerk.invitations.getInvitationList({
          status: 'pending'
        });
        const matchingClerkInvites = clerkInvitations.data.filter(
          inv => inv.emailAddress.toLowerCase() === email.toLowerCase()
        );
        for (const clerkInv of matchingClerkInvites) {
          try {
            await clerk.invitations.revokeInvitation(clerkInv.id);
            console.log(`✅ Revoked orphaned Clerk invitation: ${clerkInv.id}`);
          } catch (revokeError) {
            console.warn(`⚠️ Failed to revoke orphaned Clerk invitation ${clerkInv.id}:`, revokeError);
          }
        }
      } catch (clerkListError) {
        console.warn(`⚠️ Failed to list Clerk invitations:`, clerkListError);
      }
    } else {
      // Check if there's already a pending invitation for this email (only if resending is not allowed)
      const existingInvitation = await db.userInvitation.findFirst({
        where: {
          email: email.toLowerCase(),
          acceptedAt: null,
          expiresAt: { gte: new Date() }
        }
      });

      if (existingInvitation) {
        console.log(`ℹ️ Pending invitation already exists for ${email}`);
        throw new Error('This email already has a pending invitation. Please check your inbox or contact support if you haven\'t received it.');
      }
    }

    // Create invitation token and expiration
    const invitationToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Expires in 30 days
    console.log(`🔑 Generated invitation token: ${invitationToken}`);

    // Create a user invitation record in our database
    console.log(`💾 Creating user invitation record for ${email}`);
    const userInvitation = await db.userInvitation.create({
      data: {
        email: email.toLowerCase(),
        role: role,
        fullName: fullName || null,
        message: message || null,
        invitedBy: invitedBy, // This is the UserProfile.id of the inviter
        invitationToken: invitationToken,
        expiresAt: expiresAt,
        // Include pending package info if provided (for employer package invitations)
        pendingPackageType: packageInfo?.packageType || null,
        pendingBillingCycles: packageInfo?.billingCycles || null,
        pendingAmountCents: packageInfo?.amountCents || null,
      }
    })
    console.log(`✅ User invitation record created:`, userInvitation);

    // Verify NEXT_PUBLIC_APP_URL is available
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    console.log(`🌐 NEXT_PUBLIC_APP_URL from environment: ${appUrl}`);

    if (!appUrl) {
      console.error('❌ NEXT_PUBLIC_APP_URL is not set in environment variables');
      throw new Error('Application URL not configured - contact administrator');
    }

    // Generate callback URL for custom invitation email
    const callbackUrl = `${appUrl}/sign-up?token=${encodeURIComponent(invitationToken)}`;
    console.log(`🔗 Generated callback URL: ${callbackUrl}`);

    // Create Clerk invitation
    let clerkInvitationId: string | null = null;
    console.log(`📧 Attempting to create Clerk invitation for ${email}`);
    try {
      console.log(`🔧 Clerk client initialized successfully`);

      // Build invitation params - include publicMetadata for package info if provided
      // This allows Clerk email templates to display conditional package info
      const invitationParams: {
        emailAddress: string;
        redirectUrl: string;
        publicMetadata?: Record<string, unknown>;
        ignoreExisting?: boolean;
      } = {
        emailAddress: email.toLowerCase(),
        redirectUrl: callbackUrl,
        ignoreExisting: allowResend // If resending is allowed, ignore existing invitations in Clerk
      };

      // Add publicMetadata for package invitations (used by Clerk email template)
      if (packageInfo) {
        invitationParams.publicMetadata = {
          pendingPackageType: packageInfo.packageType,
          pendingPackageName: packageInfo.packageName,
          pendingBillingCycles: String(packageInfo.billingCycles),
          pendingAmountDollars: String((packageInfo.amountCents / 100).toFixed(2)),
        };
        console.log(`📦 Including package info in Clerk publicMetadata:`, invitationParams.publicMetadata);
      }

      console.log(`📧 Clerk invitation params:`, invitationParams);

      const invitation = await clerk.invitations.createInvitation(invitationParams as any);

      clerkInvitationId = invitation.id;
      console.log(`✅ Clerk invitation created successfully`, {
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
        status: clerkError?.status,
        errors: JSON.stringify(clerkError?.errors, null, 2)
      });

      // Extract actual error details from Clerk's errors array
      const clerkErrors = clerkError?.errors || [];
      const firstError = clerkErrors[0] || {};
      const errorCode = firstError?.code || clerkError?.code;
      const errorMessage = firstError?.message || firstError?.longMessage || clerkError?.message || '';

      // Handle specific Clerk error cases
      const isExistingUserError = errorCode === 'form_identifier_exists' ||
        (errorMessage?.includes('already exists') && !errorMessage?.includes('invitation')) ||
        clerkError?.status === 422;

      const isPendingInvitationError = errorCode === 'duplicate_record' ||
        errorMessage?.includes('pending invitation') ||
        (errorMessage?.includes('duplicate') && errorMessage?.includes('invitation'));

      if (isExistingUserError) {
        console.log(`⚠️ User ${email} already exists in Clerk`);
        // Clean up our database record since we can't create a Clerk invitation
        await db.userInvitation.delete({
          where: { id: userInvitation.id }
        });
        console.log(`🗑️ Cleaned up database record for ${email}`);
        throw new Error(`A user with email ${email} already exists in the system. Please use a different email or ask them to sign in if they have an account.`);
      } else if (isPendingInvitationError && !allowResend) {
        // Only throw this error if resending is NOT allowed
        // When allowResend is true, we use ignoreExisting:true so this shouldn't happen
        console.log(`ℹ️ User ${email} already has pending invitation in Clerk (resend not allowed)`);
        await db.userInvitation.delete({
          where: { id: userInvitation.id }
        });
        console.log(`🗑️ Cleaned up database record for ${email}`);
        throw new Error('This email already has a pending invitation. Please check your inbox or contact support if you haven\'t received it.');
      } else if (isPendingInvitationError && allowResend) {
        // This shouldn't happen with ignoreExisting:true, but if it does, just log and continue
        console.warn(`⚠️ Clerk reported duplicate invitation for ${email} despite ignoreExisting:true - continuing anyway`);
      } else {
        // For rate limit errors (429) and other critical errors, we should fail
        // This ensures the admin knows the invitation wasn't sent
        const isRateLimitError = clerkError?.status === 429 ||
          errorCode === 'too_many_requests' ||
          errorMessage?.toLowerCase()?.includes('too many requests');

        if (isRateLimitError) {
          console.error(`❌ Clerk rate limit hit for ${email}`);
          // Clean up our database record since we can't create a Clerk invitation
          await db.userInvitation.delete({
            where: { id: userInvitation.id }
          });
          console.log(`🗑️ Cleaned up database record for ${email}`);
          throw new Error('Too many invitation requests. Please wait a few minutes and try again.');
        }

        // For other unexpected errors, also fail to ensure consistency
        console.error(`❌ Unexpected Clerk error for ${email}:`, errorMessage);
        await db.userInvitation.delete({
          where: { id: userInvitation.id }
        });
        console.log(`🗑️ Cleaned up database record for ${email}`);
        throw new Error(`Failed to send invitation: ${errorMessage || 'Unknown error occurred. Please try again.'}`);
      }
    }

    // Update the user invitation record with the Clerk invitation ID
    if (clerkInvitationId) {
      console.log(`💾 Updating user invitation with Clerk invitation ID: ${clerkInvitationId}`);
      await db.userInvitation.update({
        where: { id: userInvitation.id },
        data: { clerkInvitationId }
      });
      console.log(`✅ Updated user invitation with Clerk invitation ID: ${clerkInvitationId}`);
    } else {
      console.warn(`⚠️ No Clerk invitation ID to store for ${email} - Clerk invitation may have failed`);
    }

    return userInvitation;
  } catch (error) {
    console.error(`❌ Failed to send user invitation to ${email}:`, error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown'
    });
    throw error;
  }
}

/**
 * Validate user invitation token and get invitation details
 * @param invitationToken - The invitation token
 * @returns The user invitation record or null if invalid
 */
export async function validateUserInvitationToken(invitationToken: string) {
  try {
    console.log(`🔍 Validating user invitation token: ${invitationToken}`);

    const userInvitation = await db.userInvitation.findUnique({
      where: { invitationToken: invitationToken },
      include: {
        inviter: {
          select: {
            name: true
          }
        }
      }
    });

    if (!userInvitation) {
      console.log(`❌ User invitation not found for token: ${invitationToken}`);
      return null;
    }

    // Check if invitation has expired
    if (userInvitation.expiresAt < new Date()) {
      console.log(`❌ User invitation expired: ${invitationToken}`);
      return null;
    }

    console.log(`✅ User invitation validated for ${userInvitation.email} with role: ${userInvitation.role}`);
    return userInvitation;
  } catch (error) {
    console.error(`❌ Failed to validate user invitation token:`, error);
    return null;
  }
}

/**
 * Mark user invitation as accepted
 * @param invitationToken - The invitation token
 * @returns void
 */
export async function markUserInvitationAsAccepted(invitationToken: string) {
  try {
    console.log(`✅ Marking user invitation as accepted: ${invitationToken}`);

    const updatedInvitation = await db.userInvitation.update({
      where: { invitationToken: invitationToken },
      data: {
        acceptedAt: new Date()
      }
    });

    console.log(`✅ User invitation marked as accepted for ${updatedInvitation.email}`);
    return updatedInvitation;
  } catch (error) {
    console.error(`❌ Failed to mark user invitation as accepted:`, error);
    throw error;
  }
}
