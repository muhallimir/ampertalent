'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Users,
  Search,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Building,
  Mail,
  Calendar,
  Timer,
  Download
} from 'lucide-react'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useToast } from '@/hooks/use-toast'
// Simple date formatting function to replace date-fns
const formatDistanceToNow = (date: Date) => {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMinutes < 1) return 'just now'
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'}`
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? '' : 's'}`
  return `${diffInDays} day${diffInDays === 1 ? '' : 's'}`
}

// Helper function to truncate email addresses
const truncateEmail = (email: string, maxLength: number = 25) => {
  if (email.length <= maxLength) {
    return email;
  }

  const [localPart, domain] = email.split('@');

  // If domain is too long, truncate it
  if (domain.length > maxLength / 2) {
    const truncatedDomain = domain.slice(0, Math.floor(maxLength / 2) - 3) + '...';
    return `${localPart}@${truncatedDomain}`;
  }

  // If local part is too long, truncate it
  const availableLength = maxLength - domain.length - 1; // -1 for @ symbol
  if (localPart.length > availableLength) {
    const truncatedLocal = localPart.slice(0, availableLength - 3) + '...';
    return `${truncatedLocal}@${domain}`;
  }

  return email;
};

interface PendingSignup {
  id: string
  clerkUserId: string
  email: string
  selectedPlan: string
  sessionToken: string
  returnUrl: string
  createdAt: string
  expiresAt: string
  userType: 'seeker' | 'employer'
  onboardingData: any
  isExpired: boolean
  timeRemaining: number
  jobTitle?: string // For employers
  packageType?: string // For employers
}

interface PendingSignupStats {
  total: number
  active: number
  expired: number
  seekers: number
  employers: number
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
}

export default function PendingSignupsPage() {
  const { profile } = useUserProfile()
  const { toast } = useToast()
  const [pendingSignups, setPendingSignups] = useState<PendingSignup[]>([])
  const [stats, setStats] = useState<PendingSignupStats>({
    total: 0,
    active: 0,
    expired: 0,
    seekers: 0,
    employers: 0
  })
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [signupToDelete, setSignupToDelete] = useState<PendingSignup | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => {
      clearTimeout(timer)
    }
  }, [searchTerm])

  const loadPendingSignups = async (page = 1, search = '', status = 'all') => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(status !== 'all' && { status })
      })

      // Fetch seeker pending signups
      const seekerResponse = await fetch(`/api/admin/pending-signups?${params}`)
      if (!seekerResponse.ok) {
        throw new Error('Failed to fetch seeker pending signups')
      }

      const seekerText = await seekerResponse.text()
      if (seekerText.trim().startsWith('<!DOCTYPE') || seekerText.trim().startsWith('<html')) {
        // Session expired, redirect to sign-in
        window.location.href = '/sign-in'
        return
      }
      const seekerData = JSON.parse(seekerText)

      // Fetch employer pending job posts
      const employerResponse = await fetch(`/api/admin/pending-job-posts?${params}`)
      let employerData: any = { pendingJobPosts: [], stats: { total: 0, active: 0, expired: 0 }, pagination: { page: 1, limit: 20, total: 0, pages: 0 } }

      if (employerResponse.ok) {
        const employerText = await employerResponse.text()
        if (!employerText.trim().startsWith('<!DOCTYPE') && !employerText.trim().startsWith('<html')) {
          employerData = JSON.parse(employerText)
        }
      }

      // Merge both types of pending checkouts
      const mergedSignups = [
        ...(seekerData.pendingSignups || []),
        ...(employerData.pendingJobPosts || [])
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      // Merge stats
      const mergedStats = {
        total: (seekerData.stats?.total || 0) + (employerData.stats?.total || 0),
        active: (seekerData.stats?.active || 0) + (employerData.stats?.active || 0),
        expired: (seekerData.stats?.expired || 0) + (employerData.stats?.expired || 0),
        seekers: seekerData.stats?.total || 0,
        employers: employerData.stats?.total || 0
      }

      setPendingSignups(mergedSignups)
      setStats(mergedStats)
      setPagination({
        page: seekerData.pagination?.page || 1,
        limit: seekerData.pagination?.limit || 20,
        total: mergedSignups.length,
        pages: Math.ceil(mergedSignups.length / (seekerData.pagination?.limit || 20))
      })
    } catch (error) {
      console.error('Error loading pending checkouts:', error)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadPendingSignups(pagination.page, debouncedSearchTerm, statusFilter)
    setIsRefreshing(false)
  }

  const handleSearch = async () => {
    await loadPendingSignups(1, debouncedSearchTerm, statusFilter)
  }

  const handleStatusFilter = async (status: string) => {
    setStatusFilter(status)
    await loadPendingSignups(1, debouncedSearchTerm, status)
  }

  const handlePageChange = async (page: number) => {
    await loadPendingSignups(page, debouncedSearchTerm, statusFilter)
  }

  const handleDeleteSignup = async (signup: PendingSignup) => {
    setSignupToDelete(signup)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteSignup = async () => {
    if (!signupToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/pending-signups/${signupToDelete.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete pending signup')
      }

      // Refresh the data
      await loadPendingSignups(pagination.page, debouncedSearchTerm, statusFilter)

      // Close dialog and reset state
      setDeleteDialogOpen(false)
      setSignupToDelete(null)
    } catch (error) {
      console.error('Error deleting pending signup:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatTimeRemaining = (timeRemaining: number) => {
    if (timeRemaining <= 0) return 'Expired'

    const hours = Math.floor(timeRemaining / (1000 * 60 * 60))
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`
    } else {
      return `${minutes}m remaining`
    }
  }

  const getPlanDisplayName = (planId: string) => {
    const planNames: Record<string, string> = {
      // Seeker plans
      'trial': '3 Day Free Trial',
      'gold': 'Gold Professional',
      'vip-platinum': 'VIP Platinum',
      'annual-platinum': 'Annual Platinum',
      // Employer plans
      'standard': 'Standard Job Post ($97)',
      'featured': 'Featured Job Post ($127)',
      'email_blast': 'Email Blast ($249)',
      'gold_plus': 'Gold Plus Bundle ($97)',
      'concierge_lite': 'Concierge Lite ($795) - Legacy',
      'concierge_level_1': 'Concierge Level I ($1,695)',
      'concierge_level_2': 'Concierge Level II ($2,695)',
      'concierge_level_3': 'Concierge Level III ($3,995)',
      // Legacy employer packages
      'employer_basic': 'Basic Package',
      'employer_standard': 'Standard Package',
      'employer_premium': 'Premium Package'
    }
    return planNames[planId] || planId
  }

  // CSV Export Function
  const exportToCSV = () => {
    if (!pendingSignups || pendingSignups.length === 0) {
      toast({
        title: "No Data",
        description: "No abandoned checkouts available to export.",
        variant: "destructive"
      })
      return
    }

    try {
      // Helper function to escape CSV values
      const escapeCsvValue = (value: any): string => {
        if (value === null || value === undefined) return ''
        const stringValue = String(value)
        // Escape double quotes and wrap in quotes if contains comma, newline, or quote
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }

      // CSV Headers
      const headers = [
        'Email',
        'User Type',
        'Plan/Package',
        'Status',
        'Job Title',
        'Created At',
        'Expires At',
        'Time Remaining',
        'First Name',
        'Last Name',
        'Company Name',
        'Location',
        'Experience (Years)'
      ]

      // Build CSV content
      let csvContent = headers.join(',') + '\n'

      pendingSignups.forEach(signup => {
        const row = [
          escapeCsvValue(signup.email),
          escapeCsvValue(signup.userType === 'seeker' ? 'Seeker' : 'Employer'),
          escapeCsvValue(getPlanDisplayName(signup.selectedPlan)),
          escapeCsvValue(signup.isExpired ? 'Expired' : 'Active'),
          escapeCsvValue(signup.jobTitle || 'N/A'),
          escapeCsvValue(new Date(signup.createdAt).toLocaleString()),
          escapeCsvValue(new Date(signup.expiresAt).toLocaleString()),
          escapeCsvValue(formatTimeRemaining(signup.timeRemaining)),
          escapeCsvValue(signup.onboardingData?.firstName || ''),
          escapeCsvValue(signup.onboardingData?.lastName || ''),
          escapeCsvValue(signup.onboardingData?.companyName || ''),
          escapeCsvValue(signup.onboardingData?.location || ''),
          escapeCsvValue(signup.onboardingData?.experience || '')
        ]
        csvContent += row.join(',') + '\n'
      })

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `abandoned-checkouts-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Export Successful",
        description: `Exported ${pendingSignups.length} abandoned checkout${pendingSignups.length === 1 ? '' : 's'} to CSV.`,
      })
    } catch (error) {
      console.error('Error exporting CSV:', error)
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true)
      await loadPendingSignups()
      setIsLoading(false)
    }

    initializeData()
  }, [debouncedSearchTerm, statusFilter])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading pending checkouts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pending Checkouts</h1>
          <p className="text-gray-600">
            Monitor both seeker and employer checkout abandonments
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {profile?.role === 'super_admin' && (
            <>
              <Button
                variant="outline"
                onClick={exportToCSV}
                disabled={pendingSignups.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/admin/sales'}
              >
                View Sales
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Expired</p>
                <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Seekers</p>
                <p className="text-2xl font-bold text-purple-600">{stats.seekers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Employers</p>
                <p className="text-2xl font-bold text-orange-600">{stats.employers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Checkouts List */}
      <div className="space-y-4">
        {pendingSignups.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pending checkouts found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'There are currently no abandoned checkouts from seekers or employers.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          pendingSignups.map((signup) => (
            <Card key={signup.id} className={`${signup.isExpired ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-900" title={signup.email}>
                          {truncateEmail(signup.email)}
                        </span>
                      </div>
                      <Badge variant={signup.userType === 'seeker' ? 'default' : 'secondary'}>
                        {signup.userType === 'seeker' ? (
                          <><User className="h-3 w-3 mr-1" /> Seeker</>
                        ) : (
                          <><Building className="h-3 w-3 mr-1" /> Employer</>
                        )}
                      </Badge>
                      <Badge variant={signup.isExpired ? 'destructive' : 'default'}>
                        {signup.isExpired ? (
                          <><XCircle className="h-3 w-3 mr-1" /> Expired</>
                        ) : (
                          <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
                        )}
                      </Badge>
                    </div>

                    {signup.userType === 'employer' && signup.jobTitle && (
                      <div className="mb-3">
                        <span className="text-sm text-gray-600">Job Title: </span>
                        <span className="text-sm font-medium text-gray-900">{signup.jobTitle}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">Plan:</span>
                        <span>{getPlanDisplayName(signup.selectedPlan)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Created {formatDistanceToNow(new Date(signup.createdAt))} ago</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Timer className="h-4 w-4" />
                        <span className={signup.isExpired ? 'text-red-600 font-medium' : 'text-green-600'}>
                          {formatTimeRemaining(signup.timeRemaining)}
                        </span>
                      </div>
                    </div>

                    {signup.onboardingData && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-2">Onboarding Data:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                          {signup.onboardingData.firstName && (
                            <div>
                              <span className="font-medium">Name:</span> {signup.onboardingData.firstName} {signup.onboardingData.lastName}
                            </div>
                          )}
                          {signup.onboardingData.companyName && (
                            <div>
                              <span className="font-medium">Company:</span> {signup.onboardingData.companyName}
                            </div>
                          )}
                          {signup.onboardingData.location && (
                            <div>
                              <span className="font-medium">Location:</span> {signup.onboardingData.location}
                            </div>
                          )}
                          {signup.onboardingData.experience && (
                            <div>
                              <span className="font-medium">Experience:</span> {signup.onboardingData.experience} years
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSignup(signup)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                    {signup.isExpired && (
                      <AlertTriangle className="h-6 w-6 text-red-500" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-8">
          <p className="text-sm text-gray-600">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This will permanently delete the pending signup for{' '}
              <span className="font-medium">{signupToDelete?.email}</span>.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteSignup}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}