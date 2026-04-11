'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Users, Plus, Mail, Shield, MoreVertical, UserCheck, Search, Filter, Edit, Trash2, UserMinus, Loader2, Construction } from 'lucide-react'

interface TeamMember {
  id: string
  name: string
  email: string
  role: 'admin' | 'member' | 'viewer'
  status: 'active' | 'pending' | 'inactive'
  joinedAt: string
}

interface TeamManagementProps {
  onInviteMember: (email: string, role: string) => Promise<void>
  onRemoveMember: (memberId: string) => Promise<void>
  onUpdateMemberRole: (memberId: string, newRole: string) => Promise<void>
}

// Feature flag - reads from environment variable
const TEAM_MEMBER_FEATURE_ENABLED = process.env.NEXT_PUBLIC_TEAM_MEMBER_INVITE_ENABLED === 'true'

export function TeamManagement({ onInviteMember, onRemoveMember, onUpdateMemberRole }: TeamManagementProps) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [isInviting, setIsInviting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  // Fetch team members from API (only when feature is enabled)
  const fetchTeamMembers = async () => {
    if (!TEAM_MEMBER_FEATURE_ENABLED) return
    // TODO: Re-enable when team member feature is ready
    // try {
    //   const response = await getWithImpersonation('/api/employer/team')
    //   if (!response.ok) {
    //     throw new Error('Failed to fetch team members')
    //   }
    //   const data = await response.json()
    //   setTeamMembers(data.teamMembers || [])
    // } catch (error) {
    //   console.error('Error fetching team members:', error)
    //   setMessage({ type: 'error', text: 'Failed to load team members' })
    // } finally {
    //   setIsLoading(false)
    //   setIsRefreshing(false)
    // }
  }

  // Only fetch team members if feature is enabled
  useEffect(() => {
    if (TEAM_MEMBER_FEATURE_ENABLED) {
      fetchTeamMembers()
    }
  }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!inviteEmail) {
      setMessage({ type: 'error', text: 'Please enter an email address' })
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' })
      return
    }

    setIsInviting(true)

    try {
      console.log('Inviting team member:', { email: inviteEmail, role: inviteRole })
      await onInviteMember(inviteEmail, inviteRole)
      setMessage({ type: 'success', text: 'Team member invited successfully!' })
      setInviteEmail('')
      setInviteRole('member')
      // Refresh team members list
      setIsRefreshing(true)
      await fetchTeamMembers()
    } catch (error) {
      console.error('Invite error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to invite team member. Please try again.'

      // Handle specific error cases
      if (errorMessage.includes('already a member')) {
        setMessage({ type: 'error', text: 'This user is already a member of your team or has a pending invitation.' })
      } else if (errorMessage.includes('Invalid email')) {
        setMessage({ type: 'error', text: 'Please enter a valid email address.' })
      } else if (errorMessage.includes('Unauthorized')) {
        setMessage({ type: 'error', text: 'You do not have permission to invite team members.' })
      } else {
        setMessage({ type: 'error', text: errorMessage })
      }
    } finally {
      setIsInviting(false)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'member': return 'bg-blue-100 text-blue-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (onRemoveMember) {
      setRemovingMemberId(memberId)
      try {
        await onRemoveMember(memberId)
        setMessage({ type: 'success', text: 'Team member removed successfully!' })
        // Refresh team members list
        setIsRefreshing(true)
        await fetchTeamMembers()
      } catch (error) {
        console.error('Remove member error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to remove team member. Please try again.'
        setMessage({ type: 'error', text: errorMessage })
      } finally {
        setRemovingMemberId(null)
      }
    }
  }

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (onUpdateMemberRole) {
      setUpdatingMemberId(memberId)
      try {
        await onUpdateMemberRole(memberId, newRole)
        setMessage({ type: 'success', text: 'Team member role updated successfully!' })
        // Refresh team members list
        setIsRefreshing(true)
        await fetchTeamMembers()
      } catch (error) {
        console.error('Update role error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to update team member role. Please try again.'
        setMessage({ type: 'error', text: errorMessage })
      } finally {
        setUpdatingMemberId(null)
      }
    }
  }

  // Filter team members based on search and filters
  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || member.role === roleFilter
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter
    return matchesSearch && matchesRole && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Coming Soon Banner */}
      {!TEAM_MEMBER_FEATURE_ENABLED && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <Construction className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-800">Coming Soon</h3>
              <p className="text-sm text-amber-700">
                Team member management is currently under development. This feature will allow you to invite team members,
                manage roles, and collaborate with your team. Stay tuned for updates!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Team Overview */}
      <Card className={!TEAM_MEMBER_FEATURE_ENABLED ? 'opacity-50 pointer-events-none' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Team Overview</span>
          </CardTitle>
          <CardDescription>
            Manage your team members and their access levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Active Members</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {teamMembers.filter(m => m.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">Pending Invites</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {teamMembers.filter(m => m.status === 'pending').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">Admins</p>
                  <p className="text-2xl font-bold text-green-600">
                    {teamMembers.filter(m => m.role === 'admin').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invite New Member */}
      <Card className={!TEAM_MEMBER_FEATURE_ENABLED ? 'opacity-50 pointer-events-none' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Invite Team Member</span>
          </CardTitle>
          <CardDescription>
            Send an invitation to add a new team member
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inviteEmail">Email Address</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  disabled={isInviting || !TEAM_MEMBER_FEATURE_ENABLED}
                  className="h-10"
                  required
                />
              </div>
              <div>
                <Label htmlFor="inviteRole">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole} disabled={isInviting || !TEAM_MEMBER_FEATURE_ENABLED}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer - Can view jobs and applications</SelectItem>
                    <SelectItem value="member">Member - Can manage jobs and applications</SelectItem>
                    <SelectItem value="admin">Admin - Full access including team management</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {message && (
              <div className={`p-3 rounded-md ${message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            <Button type="submit" disabled={isInviting || !inviteEmail || isRefreshing || !TEAM_MEMBER_FEATURE_ENABLED} className="h-10">
              {isInviting ? 'Sending Invite...' : 'Send Invitation'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Team Members List */}
      <Card className={!TEAM_MEMBER_FEATURE_ENABLED ? 'opacity-50 pointer-events-none' : ''}>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage existing team members and their permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 pl-10"
                  disabled={!TEAM_MEMBER_FEATURE_ENABLED}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2 text-gray-400" />
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading team members...</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
                <p className="text-gray-600">
                  {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Invite your first team member to get started'
                  }
                </p>
              </div>
            ) : (
              filteredMembers.map((member) => {
                const isUpdatingMember = updatingMemberId === member.id
                const isRemovingMember = removingMemberId === member.id
                const isActionDisabled = isRefreshing || isUpdatingMember || isRemovingMember

                return (
                  <div key={member.id} className={`flex items-center justify-between p-4 border rounded-lg ${isRefreshing ? 'opacity-50' : ''}`}>
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-600">{member.email}</p>
                        <p className="text-xs text-gray-500">Joined {new Date(member.joinedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(member.role)}`}>
                        {member.role}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(member.status)}`}>
                        {member.status}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild disabled={isActionDisabled}>
                          <Button variant="ghost" className="h-8 w-8 p-0" disabled={isActionDisabled}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleUpdateRole(member.id, member.role === 'admin' ? 'member' : 'admin')}
                            disabled={isActionDisabled}
                          >
                            {isUpdatingMember ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Edit className="mr-2 h-4 w-4" />
                            )}
                            {member.role === 'admin' ? 'Make Member' : 'Make Admin'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleUpdateRole(member.id, 'viewer')}
                            disabled={isActionDisabled}
                          >
                            {isUpdatingMember ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <UserMinus className="mr-2 h-4 w-4" />
                            )}
                            {isUpdatingMember ? 'Updating role...' : 'Make Viewer'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-red-600"
                            disabled={isActionDisabled}
                          >
                            {isRemovingMember ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            {isRemovingMember ? 'Removing...' : 'Remove Member'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
