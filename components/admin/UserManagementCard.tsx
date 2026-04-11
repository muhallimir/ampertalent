'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserProfilePicture } from '@/components/common/UserProfilePicture'
import { CompanyLogo } from '@/components/common/CompanyLogo'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useImpersonation } from '@/hooks/useImpersonation'
import {
  User,
  Mail,
  Calendar,
  Shield,
  Ban,
  CheckCircle,
  AlertTriangle,
  MoreHorizontal,
  Eye,
  Trash2,
  UserCheck,
  ShieldPlus
} from 'lucide-react'

interface UserData {
  id: string
  name: string
  firstName?: string
  lastName?: string
  email: string
  role: 'seeker' | 'employer' | 'admin' | 'super_admin' | 'team_member'
  status: 'active' | 'suspended' | 'pending' | 'banned'
  joinedAt: string
  lastActive: string
  profilePictureUrl?: string
  companyName?: string
  companyLogoUrl?: string
  jobsPosted?: number
  applicationsSubmitted?: number
  subscriptionStatus?: 'active' | 'expired' | 'trial'
  flaggedReports?: number
  verificationStatus: 'verified' | 'pending' | 'rejected'
  clerkUserId?: string
}

interface UserManagementCardProps {
  user: UserData
  currentUserRole?: string
  onStatusChange: (userId: string, newStatus: string) => Promise<void>
  onRoleChange: (userId: string, newRole: string) => Promise<void>
  onViewProfile: (userId: string) => void
  onSendMessage: (userId: string) => void
}

export function UserManagementCard({
  user,
  currentUserRole,
  onStatusChange,
  onRoleChange,
  onViewProfile,
  onSendMessage
}: UserManagementCardProps) {
  const router = useRouter()
  const currentUser = useUser()
  const { startImpersonation } = useImpersonation()
  const { profile } = useUserProfile()
  const [isLoading, setIsLoading] = useState(false)
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true)
    try {
      await onStatusChange(user.id, newStatus)
    } catch (error) {
      console.error('Error updating user status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRoleChange = async (newRole: string) => {
    if (!confirm(`Are you sure you want to change ${user.name}'s role to ${newRole}?`)) {
      return
    }

    setIsLoading(true)
    try {
      await onRoleChange(user.id, newRole)
    } catch (error) {
      console.error('Error updating user role:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImpersonation = async () => {
    // Get current user's role from profile
    const currentUserRole = profile?.role

    // Prevent regular admins from impersonating super_admins
    // Only super_admins can impersonate other super_admins
    if (!currentUser?.user?.id ||
      (currentUserRole === 'admin' && user.role === 'super_admin')) return

    setIsImpersonating(true)
    setShowActions(false)

    try {
      const result = await startImpersonation(currentUser.user.id, {
        id: user.id,
        clerkUserId: user.clerkUserId || user.id,
        name: user.name,
        email: user.email,
        role: user.role as 'employer' | 'seeker' | 'team_member',
        companyName: undefined,
        headline: undefined,
      })

      if (!result.success) {
        console.error('Failed to start impersonation:', result.error)
        return
      }

      // Navigate to the appropriate dashboard based on user role
      if (user.role === 'employer') {
        router.push('/employer/dashboard')
      } else if (user.role === 'seeker') {
        router.push('/seeker/dashboard')
      } else if (user.role === 'team_member') {
        router.push('/employer/dashboard') // Team members work with employers
      }
    } catch (error) {
      console.error('Impersonation error:', error)
    } finally {
      setIsImpersonating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'suspended': return 'bg-yellow-100 text-yellow-800'
      case 'pending': return 'bg-blue-100 text-blue-800'
      case 'banned': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800'
      case 'super_admin': return 'bg-red-100 text-red-800'
      case 'employer': return 'bg-blue-100 text-blue-800'
      case 'seeker': return 'bg-green-100 text-green-800'
      case 'team_member': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleDisplayName = (role: string, email: string) => {
    // Special case for owner
    if (email === 'lesley@hiremymom.com' && role === 'admin') {
      return 'owner'
    }
    if (role === 'super_admin') {
      return 'super admin'
    }
    if (role === 'team_member') {
      return 'team member'
    }
    return role
  }

  const isOwner = (email: string) => {
    return email === 'lesley@hiremymom.com'
  }

  const getVerificationColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getActivityStatus = (lastActive: string) => {
    const now = new Date()
    const lastActiveDate = new Date(lastActive)
    const diffInDays = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    if (diffInDays < 7) return `${diffInDays} days ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`
    return `${Math.floor(diffInDays / 30)} months ago`
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className="flex items-center space-x-3">
              <UserProfilePicture
                userId={user.id}
                userName={user.name}
                profilePictureUrl={user.profilePictureUrl || null}
                size="lg"
              />
              {user.role === 'employer' && user.companyLogoUrl && (
                <CompanyLogo
                  companyLogoUrl={user.companyLogoUrl}
                  companyName={user.companyName || 'Company'}
                  size="lg"
                />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="font-semibold text-lg">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.name
                  }
                  {user.role === 'employer' && user.companyName && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      ({user.companyName})
                    </span>
                  )}
                </h3>
                <Badge className={getStatusColor(user.status)}>
                  {user.status}
                </Badge>
                <Badge className={getRoleColor(user.role)}>
                  {getRoleDisplayName(user.role, user.email)}
                </Badge>
                {user.verificationStatus === 'verified' && (
                  <Badge className={getVerificationColor(user.verificationStatus)}>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
                {user.flaggedReports && user.flaggedReports > 0 && (
                  <Badge variant="outline" className="text-orange-600 border-orange-200">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {user.flaggedReports} reports
                  </Badge>
                )}
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                <span className="flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  {user.email}
                </span>
                <span className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Joined {formatDate(user.joinedAt)}
                </span>
                <span className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  Last active {getActivityStatus(user.lastActive)}
                </span>
              </div>

              {/* Role-specific stats */}
              <div className="flex items-center space-x-6 text-sm">
                {user.role === 'employer' && (
                  <>
                    <div>
                      <span className="font-medium text-gray-700">Jobs Posted: </span>
                      <span className="text-gray-600">{user.jobsPosted || 0}</span>
                    </div>
                    {user.subscriptionStatus && (
                      <div>
                        <span className="font-medium text-gray-700">Subscription: </span>
                        <Badge
                          variant="outline"
                          className={user.subscriptionStatus === 'active' ? 'text-green-600' : 'text-orange-600'}
                        >
                          {user.subscriptionStatus}
                        </Badge>
                      </div>
                    )}
                  </>
                )}

                {user.role === 'seeker' && (
                  <>
                    <div>
                      <span className="font-medium text-gray-700">Applications: </span>
                      <span className="text-gray-600">{user.applicationsSubmitted || 0}</span>
                    </div>
                    {user.subscriptionStatus && (
                      <div>
                        <span className="font-medium text-gray-700">Subscription: </span>
                        <Badge
                          variant="outline"
                          className={user.subscriptionStatus === 'active' ? 'text-green-600' : 'text-orange-600'}
                        >
                          {user.subscriptionStatus}
                        </Badge>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewProfile(user.id)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onSendMessage(user.id)}
            >
              <Mail className="h-4 w-4 mr-2" />
              Message
            </Button>

            {!isOwner(user.email) && (
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowActions(!showActions)}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>

                {showActions && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    <div className="py-1">
                      {/* Status Actions */}
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Status
                      </div>

                      {user.status !== 'active' && (
                        <button
                          onClick={() => handleStatusChange('active')}
                          disabled={isLoading || (user.role === 'super_admin' && currentUserRole !== 'super_admin')}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center ${user.role === 'super_admin' && currentUserRole !== 'super_admin' ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                          Activate
                        </button>
                      )}

                      {user.status !== 'suspended' && user.status !== 'banned' && (
                        <button
                          onClick={() => handleStatusChange('suspended')}
                          disabled={isLoading || (user.role === 'super_admin' && currentUserRole !== 'super_admin')}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center ${user.role === 'super_admin' && currentUserRole !== 'super_admin' ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                          <Ban className="h-4 w-4 mr-2 text-yellow-600" />
                          Suspend
                        </button>
                      )}

                      {user.status !== 'banned' && (
                        <button
                          onClick={() => handleStatusChange('banned')}
                          disabled={isLoading || (user.role === 'super_admin' && currentUserRole !== 'super_admin')}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center text-red-600 ${user.role === 'super_admin' && currentUserRole !== 'super_admin' ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Ban User
                        </button>
                      )}

                      {/* Role Actions */}
                      {profile?.role === 'super_admin' && user.role !== 'super_admin' && (
                        <>
                          <div className="border-t border-gray-100 my-1"></div>
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Role
                          </div>

                          {user.role !== 'seeker' && (
                            <button
                              onClick={() => handleRoleChange('seeker')}
                              disabled={isLoading}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
                            >
                              <User className="h-4 w-4 mr-2 text-green-600" />
                              Make Job Seeker
                            </button>
                          )}

                          {user.role !== 'team_member' && (
                            <button
                              onClick={() => handleRoleChange('team_member')}
                              disabled={isLoading}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
                            >
                              <User className="h-4 w-4 mr-2 text-gray-600" />
                              Make Team Member
                            </button>
                          )}

                          {user.role !== 'admin' && user.role !== 'team_member' && (
                            <button
                              onClick={() => handleRoleChange('admin')}
                              disabled={isLoading}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
                            >
                              <Shield className="h-4 w-4 mr-2 text-purple-600" />
                              Make Admin
                            </button>
                          )}

                          {user.role !== 'team_member' && (
                            <button
                              onClick={() => handleRoleChange('super_admin')}
                              disabled={isLoading}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center"
                            >
                              <ShieldPlus className="h-4 w-4 mr-2 text-red-800" />
                              Make Super Admin
                            </button>
                          )}
                        </>
                      )}

                      {/* Impersonation */}
                      {user.role !== 'admin' && user.role !== 'super_admin' && user.status === 'active' && (
                        <>
                          <div className="border-t border-gray-100 my-1"></div>
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Impersonation
                          </div>
                          <button
                            onClick={handleImpersonation}
                            disabled={isImpersonating}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center text-blue-600"
                          >
                            {isImpersonating ? (
                              <LoadingSpinner size="sm" className="mr-2" />
                            ) : (
                              <UserCheck className="h-4 w-4 mr-2" />
                            )}
                            {isImpersonating ? 'Starting...' : 'Login as User'}
                          </button>
                        </>
                      )}

                      {/* Danger Zone */}
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${user.name}'s account? This action cannot be undone.`)) {
                            // TODO: Implement delete user
                            console.log('Delete user:', user.id)
                          }
                        }}
                        disabled={user.role === 'super_admin' && currentUserRole !== 'super_admin'}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center text-red-600 ${user.role === 'super_admin' && currentUserRole !== 'super_admin' ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="mt-4 flex items-center justify-center">
            <LoadingSpinner size="sm" />
            <span className="ml-2 text-sm text-gray-600">Updating...</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}