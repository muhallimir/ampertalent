'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { UserManagementCard } from '@/components/admin/UserManagementCard'
import { InviteUserModal } from '@/components/admin/InviteUserModal'
import { useToast } from '@/components/ui/toast'
import { useUserProfile } from '@/hooks/useUserProfile'
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Users,
  Building2,
  Shield,
  AlertTriangle,
  UserPlus
} from '@/components/icons'

interface UserData {
  id: string
  name: string
  email: string
  role: 'seeker' | 'employer' | 'admin' | 'super_admin'
  status: 'active' | 'suspended' | 'pending' | 'banned'
  joinedAt: string
  lastActive: string
  profilePictureUrl?: string
  jobsPosted?: number
  applicationsSubmitted?: number
  subscriptionStatus?: 'active' | 'expired' | 'trial'
  flaggedReports?: number
  verificationStatus: 'verified' | 'pending' | 'rejected'
}

interface PaginationData {
  currentPage: number
  totalPages: number
  totalUsers: number
  limit: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    limit: 50,
    hasNextPage: false,
    hasPreviousPage: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [lastActiveFilter, setLastActiveFilter] = useState<string>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const { addToast } = useToast()
  const { profile } = useUserProfile()

  useEffect(() => {
    loadUsers()
  }, [pagination.currentPage, searchTerm, roleFilter, statusFilter, lastActiveFilter])

  const loadUsers = async (page = pagination.currentPage) => {
    try {
      console.log('Loading users...')

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(lastActiveFilter !== 'all' && { lastActive: lastActiveFilter })
      })

      // Fetch real users data from API with pagination
      const response = await fetch(`/api/admin/users?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const text = await response.text()
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        // Session expired, redirect to sign-in
        window.location.href = '/sign-in'
        return
      }
      const data = JSON.parse(text)
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error loading users:', error)
      addToast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadUsers(pagination.currentPage)
    setIsRefreshing(false)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }))
      setIsLoading(true)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setPagination(prev => ({ ...prev, currentPage: 1 })) // Reset to first page
  }

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value)
    setPagination(prev => ({ ...prev, currentPage: 1 })) // Reset to first page
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    setPagination(prev => ({ ...prev, currentPage: 1 })) // Reset to first page
  }

  const handleLastActiveFilterChange = (value: string) => {
    setLastActiveFilter(value)
    setPagination(prev => ({ ...prev, currentPage: 1 })) // Reset to first page
  }

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      console.log(`Changing user ${userId} status to ${newStatus}`)

      // Update user status via API
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action: 'updateStatus',
          value: newStatus
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update user status')
      }

      // Update local state
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, status: newStatus as 'active' | 'suspended' | 'pending' | 'banned' } : user
      ))

      addToast({
        title: "Status Updated",
        description: `User status updated to ${newStatus}`,
        variant: "success"
      })
    } catch (error) {
      console.error('Error updating user status:', error)
      addToast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive"
      })
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      console.log(`Changing user ${userId} role to ${newRole}`)

      // Update user role via API
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action: 'updateRole',
          value: newRole
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update user role')
      }

      // Update local state
      setUsers(prev => prev.map(user =>
        user.id === userId ? { ...user, role: newRole as 'seeker' | 'employer' | 'admin' | 'super_admin' } : user
      ))

      addToast({
        title: "Role Updated",
        description: `User role updated to ${newRole}`,
        variant: "success"
      })
    } catch (error) {
      console.error('Error updating user role:', error)
      addToast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive"
      })
    }
  }

  const handleViewProfile = (userId: string) => {
    // TODO: Navigate to user profile or open modal
    console.log('Viewing profile for user:', userId)
    addToast({
      title: "Coming Soon",
      description: "Profile view functionality is coming soon!",
      variant: "default"
    })
  }

  const handleSendMessage = (userId: string) => {
    // TODO: Open message composer or navigate to messaging
    console.log('Sending message to user:', userId)
    addToast({
      title: "Coming Soon",
      description: "Messaging functionality is coming soon!",
      variant: "default"
    })
  }

  const handleExportUsers = () => {
    try {
      // Create CSV content
      const headers = ['Name', 'Email', 'Role', 'Status', 'Joined At', 'Last Active', 'Jobs Posted', 'Applications Submitted']
      const csvContent = [
        headers.join(','),
        ...filteredUsers.map(user => [
          `"${user.name}"`,
          `"${user.email}"`,
          user.role,
          user.status,
          new Date(user.joinedAt).toLocaleDateString(),
          new Date(user.lastActive).toLocaleDateString(),
          user.jobsPosted || 0,
          user.applicationsSubmitted || 0
        ].join(','))
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting users:', error)
      addToast({
        title: "Export Failed",
        description: "Failed to export users. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleInviteSuccess = () => {
    // Show success message
    addToast({
      title: "Invitation Sent!",
      description: "The invitation has been sent successfully.",
      variant: "success"
    })
    // Optionally refresh the user list
    loadUsers(pagination.currentPage)
  }

  // Since we're using server-side filtering, we don't need client-side filtering
  const filteredUsers = users

  const userStats = {
    total: pagination.totalUsers,
    seekers: users.filter(u => u.role === 'seeker').length,
    employers: users.filter(u => u.role === 'employer').length,
    admins: users.filter(u => u.role === 'admin').length,
    superAdmins: users.filter(u => u.role === 'super_admin').length,
    active: users.filter(u => u.status === 'active').length,
    pending: users.filter(u => u.status === 'pending').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    flagged: users.filter(u => u.flaggedReports && u.flaggedReports > 0).length,
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExportUsers}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.total.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Job Seekers</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.seekers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Employers</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.employers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Shield className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.admins}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Super Admins</p>
                <p className="text-2xl font-bold text-gray-900">{userStats.superAdmins}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{userStats.active}</div>
            <div className="text-sm text-gray-600">Active</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{userStats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{userStats.suspended}</div>
            <div className="text-sm text-gray-600">Suspended</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{userStats.flagged}</div>
            <div className="text-sm text-gray-600">Flagged</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
                <SelectTrigger className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="seeker">Job Seekers</SelectItem>
                  <SelectItem value="employer">Employers</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  {profile?.role === 'admin' || profile?.role === 'super_admin' ? (
                    <SelectItem value="super_admin">Super Admins</SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="banned">Banned</SelectItem>
                </SelectContent>
              </Select>
              <Select value={lastActiveFilter} onValueChange={handleLastActiveFilterChange}>
                <SelectTrigger className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500">
                  <SelectValue placeholder="All Activity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Activity</SelectItem>
                  <SelectItem value="today">Active Today</SelectItem>
                  <SelectItem value="week">Active This Week</SelectItem>
                  <SelectItem value="month">Active This Month</SelectItem>
                  <SelectItem value="3months">Active Last 3 Months</SelectItem>
                  <SelectItem value="6months">Active Last 6 Months</SelectItem>
                  <SelectItem value="inactive">Inactive 6+ Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Flagged Users Alert */}
      {userStats.flagged > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              <span>Flagged Users</span>
            </CardTitle>
            <CardDescription>
              {userStats.flagged} users have been reported and need attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                setRoleFilter('all')
                setStatusFilter('all')
                setSearchTerm('')
                // Filter to show only flagged users
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Review Flagged Users
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      <div className="space-y-4">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600">
                {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No users have been registered yet'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <UserManagementCard
              key={user.id}
              user={user}
              currentUserRole={profile?.role}
              onStatusChange={handleStatusChange}
              onRoleChange={handleRoleChange}
              onViewProfile={handleViewProfile}
              onSendMessage={handleSendMessage}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalUsers > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
              {Math.min(pagination.currentPage * pagination.limit, pagination.totalUsers)} of{' '}
              {pagination.totalUsers.toLocaleString()} users
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={!pagination.hasPreviousPage || isLoading}
              >
                Previous
              </Button>

              <div className="flex items-center space-x-1">
                {/* Show page numbers */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1
                  } else if (pagination.currentPage <= 3) {
                    pageNum = i + 1
                  } else if (pagination.currentPage >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i
                  } else {
                    pageNum = pagination.currentPage - 2 + i
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === pagination.currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      disabled={isLoading}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={!pagination.hasNextPage || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      <InviteUserModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={handleInviteSuccess}
      />
    </div>
  )
}
