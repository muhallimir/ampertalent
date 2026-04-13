import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser || !currentUser.clerkUser) {
      console.log('Account deletion attempt: Unauthorized - no user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Account deletion API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
      // Don't allow impersonated users to delete accounts
      return NextResponse.json({ error: 'Cannot delete account while impersonating' }, { status: 403 })
    }

    // Verify user is an employer
    if (!currentUser.profile || currentUser.profile.role !== 'employer') {
      console.log('🚫 EMPLOYER ACCOUNT DELETION: Access denied', {
        userId: currentUser.clerkUser.id,
        role: currentUser.profile?.role,
        isImpersonating: currentUser.isImpersonating
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('Processing account deletion request', {
      userId: currentUser.clerkUser.id,
      email: currentUser.clerkUser.primaryEmailAddress?.emailAddress,
      timestamp: new Date().toISOString()
    })

    try {
      // First, delete associated database records
      const userId = currentUser.profile.id;

      // Delete related records in proper order to avoid foreign key constraints
      console.log('Deleting related records for employer:', userId);

      // Delete job applications first (cascade should handle this, but explicit is safer)
      try {
        const appResult = await db.application.deleteMany({
          where: { job: { employerId: userId } }
        });
        console.log('Successfully deleted job applications', { count: appResult.count });
      } catch (dbError) {
        console.warn('Warning: Could not delete job applications', dbError);
      }

      // Delete saved jobs
      try {
        const savedJobResult = await db.savedJob.deleteMany({
          where: { job: { employerId: userId } }
        });
        console.log('Successfully deleted saved jobs', { count: savedJobResult.count });
      } catch (dbError) {
        console.warn('Warning: Could not delete saved jobs', dbError);
      }

      // Delete employer packages
      try {
        const packageResult = await db.employerPackage.deleteMany({
          where: { employerId: userId }
        });
        console.log('Successfully deleted employer packages', { count: packageResult.count });
      } catch (dbError) {
        console.warn('Warning: Could not delete employer packages', dbError);
      }

      // Delete employer job posts
      try {
        const jobResult = await db.job.deleteMany({
          where: { employerId: userId }
        });
        console.log('Successfully deleted employer jobs', { count: jobResult.count });
      } catch (dbError) {
        console.warn('Warning: Could not delete employer jobs', dbError);
      }

      // Delete employer team members
      try {
        const teamMemberResult = await db.teamMember.deleteMany({
          where: { employerId: userId }
        });
        console.log('Successfully deleted team members', { count: teamMemberResult.count });
      } catch (dbError) {
        console.warn('Warning: Could not delete team members', dbError);
      }

      // Delete employer team invitations
      try {
        const teamInvitationResult = await db.teamInvitation.deleteMany({
          where: { employerId: userId }
        });
        console.log('Successfully deleted team invitations', { count: teamInvitationResult.count });
      } catch (dbError) {
        console.warn('Warning: Could not delete team invitations', dbError);
      }

      // Delete employer data (this should cascade delete related records)
      try {
        // Check if employer record exists first
        const employerExists = await db.employer.findUnique({
          where: { userId: userId }
        });

        if (employerExists) {
          await db.employer.delete({
            where: { userId: userId }
          });
          console.log('Successfully deleted employer data');
        } else {
          console.log('No employer data found to delete');
        }
      } catch (dbError) {
        console.warn('Warning: Could not delete employer data', dbError);
      }

      // Delete user profile (this is the main record)
      try {
        await db.userProfile.delete({
          where: { id: userId }
        });
        console.log('Successfully deleted user profile');
      } catch (dbError) {
        console.error('Error deleting user profile', dbError);
        throw new Error('Failed to delete user profile data');
      }

      // IMPORTANT: For security reasons, Clerk requires client-side authentication 
      // to delete a user account. We've deleted all associated database records,
      // and the frontend should now sign out the user and optionally delete the
      // Clerk account through the client SDK.
      //
      // Note: For complete account deletion from Clerk, the client should call
      // clerk.user.deleteUser() after successful deletion of local records.

      console.log('Account deletion successful - database records removed', {
        userId: currentUser.clerkUser.id,
        email: currentUser.clerkUser.primaryEmailAddress?.emailAddress,
        timestamp: new Date().toISOString()
      })

      return NextResponse.json({
        success: true,
        message: 'Account data deleted successfully. Redirecting to home page.'
      })

    } catch (error: unknown) {
      console.error('Account deletion error:', {
        userId: currentUser.clerkUser.id,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      })

      return NextResponse.json({
        error: 'Failed to delete account. Please try again.'
      }, { status: 500 })
    }

  } catch (error: unknown) {
    console.error('Account deletion endpoint error:', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
