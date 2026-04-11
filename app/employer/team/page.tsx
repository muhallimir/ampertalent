'use client'

import { TeamManagement } from '@/components/employer/TeamManagement'
import { deleteWithImpersonation, putWithImpersonation, postWithImpersonation } from '@/lib/api-client'

export default function EmployerTeamPage() {
  const handleInviteMember = async (email: string, role: string) => {
    try {
      console.log('📨 Inviting team member:', { email, role });

      // Use the correct endpoint for Clerk-based team invitations
      const response = await postWithImpersonation('/api/employer/team/invite', {
        email,
        role
      });

      const data = await response.json();
      console.log('📊 Team invite API response:', { status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send team invitation');
      }

      console.log('✅ Team member invitation successful:', data.message);

    } catch (err) {
      console.error('❌ Team invitation error:', err);
      throw err;
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      console.log('🗑️ Removing team member:', memberId)

      const response = await deleteWithImpersonation(`/api/employer/team/members/${memberId}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove team member')
      }

      const result = await response.json()
      console.log('✅ Team member removal successful:', result)

    } catch (error) {
      console.error('❌ Team member removal error:', error)
      throw error
    }
  }

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    try {
      console.log('🔄 Updating team member role:', { memberId, newRole })

      const response = await putWithImpersonation(`/api/employer/team/members/${memberId}/role`, {
        role: newRole
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update team member role')
      }

      const result = await response.json()
      console.log('✅ Team member role update successful:', result)

    } catch (error) {
      console.error('❌ Team member role update error:', error)
      throw error
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Team Management</h1>
        <p className="text-gray-600">
          Manage your team members, invite new collaborators, and control access levels for your organization.
        </p>
      </div>

      <TeamManagement
        onInviteMember={handleInviteMember}
        onRemoveMember={handleRemoveMember}
        onUpdateMemberRole={handleUpdateMemberRole}
      />
    </div>
  )
}
