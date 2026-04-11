'use server'

import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

/**
 * Simple function to revoke pending Clerk invitations for an email
 */
export async function revokeClerkInvitation(email: string) {
  console.log('🔧 revokeClerkInvitation called with email:', email)
  
  try {
    const clerk = await clerkClient()
    console.log('🔧 Clerk client initialized')
    
    // List all pending invitations for this specific email
    const invitations = await clerk.invitations.getInvitationList({
      status: 'pending'
    })
    
    console.log('🔧 Found pending invitations for email:', invitations.data.length)
    
    // Revoke each one
    let count = 0
    for (const invitation of invitations.data) {
      console.log('🔧 Revoking invitation:', invitation.id)
      try {
        if(email.toLocaleLowerCase() === invitation.emailAddress){
          await clerk.invitations.revokeInvitation(invitation.id)
          console.log('✅ Revoked invitation:', invitation.id)
          return
        }
        count++
      } catch (error) {
        console.error('❌ Failed to revoke invitation:', invitation.id, error)
      }
    }
    
    console.log('🔧 Revocation completed. Count:', count)
    return { success: true, count }
  } catch (error) {
    console.error('💥 Error in revokeClerkInvitation:', error)
    return { success: false, error: String(error) }
  }
}

/**
 * Revoke pending Clerk invitations for an email and clear the reference in our database
 */
export async function revokeClerkInvitationAndClearReference(email: string) {
  console.log('🔧 revokeClerkInvitationAndClearReference called with email:', email)
  
  try {
    // First revoke the Clerk invitations
    const revokeResult = await revokeClerkInvitation(email.toLowerCase());
    
    if (revokeResult.success) {
      console.log(`✅ Revoked ${revokeResult.count} Clerk invitations for ${email}`);
      
      // Clear the clerkInvitationId from user invitations
      const updatedUserInvitations = await db.userInvitation.updateMany({
        where: { 
          email: email.toLowerCase(),
          clerkInvitationId: { not: null }
        },
        data: { clerkInvitationId: null }
      });
      
      console.log(`✅ Cleared clerkInvitationId from ${updatedUserInvitations.count} user invitations`);
      
      // Clear the clerkInvitationId from team invitations
      const updatedTeamInvitations = await db.teamInvitation.updateMany({
        where: { 
          email: email.toLowerCase(),
          clerkInvitationId: { not: null }
        },
        data: { clerkInvitationId: null }
      });
      
      console.log(`✅ Cleared clerkInvitationId from ${updatedTeamInvitations.count} team invitations`);
      
      return { 
        success: true, 
        count: revokeResult.count,
        userInvitationsUpdated: updatedUserInvitations.count,
        teamInvitationsUpdated: updatedTeamInvitations.count
      };
    } else {
      console.error('❌ Failed to revoke Clerk invitations:', revokeResult.error);
      return { success: false, error: revokeResult.error };
    }
  } catch (error) {
    console.error('💥 Error in revokeClerkInvitationAndClearReference:', error);
    return { success: false, error: String(error) };
  }
}
