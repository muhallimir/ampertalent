'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { Skeleton } from '@/components/ui/skeleton'
import { UserProfilePicture } from '@/components/common/UserProfilePicture'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Users,
  Building2,
  Clock,
  CheckCircle,
  Phone,
  FileText,
  UserCheck,
  Calendar,
  Star,
  Shield,
  MessageSquare,
  UserPlus,
  Eye,
  Edit,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  Calendar as CalendarIcon
} from '@/components/icons'
import { CompanyLogo } from '@/components/common/CompanyLogo'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ConciergeRequest {
  id: string
  jobId: string
  employerId: string
  status: 'pending' | 'discovery_call' | 'job_optimization' | 'candidate_screening' | 'interviews' | 'completed'
  assignedAdminId?: string
  discoveryCallNotes?: string
  optimizedJobDescription?: string
  shortlistedCandidates?: any
  createdAt: string
  updatedAt: string
  jobTitle?: string
  companyName?: string
  companyLogoUrl?: string | null
  employerName?: string
  employerProfilePictureUrl?: string | null
  isCompanyPrivate?: boolean
  unreadMessagesCount?: number
}

interface ConciergeProfile {
  id: string
  conciergeBio: string
  conciergeTitle: string
  conciergeSpecialties: string[]
  conciergeExperience: number
  isActiveConcierge: boolean
  name: string
  email: string
  profilePictureUrl?: string
}

interface ConciergeAdmin {
  id: string
  name: string
  email: string
  profilePictureUrl?: string
  isActiveConcierge: boolean
  assignedRequestsCount: number
}

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pending' },
  discovery_call: { color: 'bg-blue-100 text-blue-800', icon: Phone, label: 'Discovery Call' },
  job_optimization: { color: 'bg-purple-100 text-purple-800', icon: FileText, label: 'Job Optimization' },
  candidate_screening: { color: 'bg-orange-100 text-orange-800', icon: UserCheck, label: 'Screening' },
  interviews: { color: 'bg-indigo-100 text-indigo-800', icon: Calendar, label: 'Interviews' },
  completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Completed' }
}

function ConciergeCardSkeleton() {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4 flex-1">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="flex-1 space-y-3">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <Skeleton className="h-8 w-24 rounded" />
          <Skeleton className="h-8 w-32 rounded" />
        </div>
      </div>
    </div>
  )
}

function ConciergeListSkeletons() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <ConciergeCardSkeleton key={i} />
      ))}
    </div>
  )
}

export default function AdminConciergePage() {
  const [requests, setRequests] = useState<ConciergeRequest[]>([])
  const [profile, setProfile] = useState<ConciergeProfile | null>(null)
  const [availableAdmins, setAvailableAdmins] = useState<ConciergeAdmin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const hasLoadedOnce = useRef(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [isAssigning, setIsAssigning] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [assignedFilter, setAssignedFilter] = useState<string>('all')
  const [companyTypeFilter, setCompanyTypeFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [showFilters, setShowFilters] = useState(false)
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
    currentPage: 1,
    totalPages: 1
  })

  useEffect(() => {
    loadConciergeRequests(pagination.currentPage)
    loadConciergeProfile()
    loadAvailableAdmins()
  }, [selectedStatus, pagination.currentPage])

  const loadConciergeRequests = async (page: number = 1) => {
    try {
      if (hasLoadedOnce.current) {
        setIsSearching(true)
      } else {
        setIsLoading(true)
      }
      
      const offset = (page - 1) * pagination.limit
      const params = new URLSearchParams()
      params.append('limit', pagination.limit.toString())
      params.append('offset', offset.toString())
      if (selectedStatus !== 'all') params.append('status', selectedStatus)
      
      const response = await fetch(`/api/admin/concierge/requests?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch concierge requests')
      }

      const data = await response.json()
      setRequests(data.requests)

      // Update pagination data
      const totalCount = data.pagination?.total || data.requests?.length || 0
      const totalPages = Math.ceil(totalCount / pagination.limit)
      setPagination(prev => ({
        ...prev,
        total: totalCount,
        offset: data.pagination?.offset || 0,
        hasMore: data.pagination?.hasMore || false,
        currentPage: page,
        totalPages: totalPages || 1
      }))
    } catch (error) {
      console.error('Error loading concierge requests:', error)
    } finally {
      setIsLoading(false)
      setIsSearching(false)
      hasLoadedOnce.current = true
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }))
    }
  }

  const loadConciergeProfile = async () => {
    try {
      const response = await fetch('/api/admin/concierge/bio')

      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
      }
    } catch (error) {
      console.error('Error loading concierge profile:', error)
    }
  }

  const loadAvailableAdmins = async () => {
    try {
      const response = await fetch('/api/admin/concierge/assign')

      if (response.ok) {
        const data = await response.json()
        setAvailableAdmins(data.admins)
      }
    } catch (error) {
      console.error('Error loading available admins:', error)
    }
  }

  const assignAdminToRequest = async (requestId: string, adminId: string) => {
    setIsAssigning(requestId)
    try {
      const response = await fetch('/api/admin/concierge/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jobId: requests.find(r => r.id === requestId)?.jobId,
          adminId
        })
      })

      if (response.ok) {
        // Update the request with the assigned admin
        setRequests(prev => prev.map(req =>
          req.id === requestId
            ? { ...req, assignedAdminId: adminId }
            : req
        ))
        loadConciergeRequests() // Reload to get updated data
      } else {
        throw new Error('Failed to assign admin')
      }
    } catch (error) {
      console.error('Error assigning admin:', error)
      alert('Failed to assign admin. Please try again.')
    } finally {
      setIsAssigning(null)
    }
  }

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      // Find the request to get the jobId
      const request = requests.find(r => r.id === requestId)
      if (!request) {
        console.error('Request not found')
        return
      }

      const response = await fetch(`/api/admin/concierge/${request.jobId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        loadConciergeRequests() // Reload the list
      } else {
        throw new Error('Failed to update status')
      }
    } catch (error) {
      console.error('Error updating request status:', error)
      alert('Failed to update status. Please try again.')
    }
  }

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = ['pending', 'discovery_call', 'job_optimization', 'candidate_screening', 'interviews', 'completed']
    const currentIndex = statusFlow.indexOf(currentStatus)
    return currentIndex < statusFlow.length - 1 ? statusFlow[currentIndex + 1] : null
  }

  // Filter and search functionality
  const filteredRequests = requests.filter((request) => {
    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        request.jobTitle?.toLowerCase().includes(query) ||
        request.companyName?.toLowerCase().includes(query) ||
        request.employerName?.toLowerCase().includes(query) ||
        request.discoveryCallNotes?.toLowerCase().includes(query)

      if (!matchesSearch) return false
    }

    // Assignment filter
    if (assignedFilter !== 'all') {
      if (assignedFilter === 'assigned' && !request.assignedAdminId) return false
      if (assignedFilter === 'unassigned' && request.assignedAdminId) return false
    }

    // Company type filter
    if (companyTypeFilter !== 'all') {
      if (companyTypeFilter === 'private' && !request.isCompanyPrivate) return false
      if (companyTypeFilter === 'public' && request.isCompanyPrivate) return false
    }

    return true
  })

  // Sort functionality
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      case 'jobTitle':
        return (a.jobTitle || '').localeCompare(b.jobTitle || '')
      case 'company':
        return (a.companyName || '').localeCompare(b.companyName || '')
      case 'status':
        return a.status.localeCompare(b.status)
      default:
        return 0
    }
  })

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = setTimeout(() => {
      setSearchQuery(value)
    }, 300)
  }

  const clearAllFilters = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    setSearchQuery('')
    setAssignedFilter('all')
    setCompanyTypeFilter('all')
    setSortBy('newest')
    setSelectedStatus('all')
    const searchInput = document.querySelector<HTMLInputElement>('input[placeholder="Search by job title, company, employer, or notes..."]')
    if (searchInput) searchInput.value = ''
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Concierge Service Management</h1>
            <p className="text-gray-600">
              Manage premium concierge hiring services for employers
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button asChild className="bg-purple-600 hover:bg-purple-700">
              <a href="/admin/concierge/find-seekers">
                <Search className="h-4 w-4 mr-2" />
                Discover Seekers
              </a>
            </Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <a href="/admin/concierge/chat/employers">
                <Building2 className="h-4 w-4 mr-2" />
                Chat with Employers
              </a>
            </Button>
            <Button asChild className="bg-green-600 hover:bg-green-700">
              <a href="/admin/concierge/chat/seekers">
                <Users className="h-4 w-4 mr-2" />
                Chat with Seekers
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* My Concierge Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              My Concierge Profile
            </CardTitle>
            <Button asChild size="sm">
              <a href="/admin/concierge/bio">
                {profile ? 'Edit Profile' : 'Set up Profile'}
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {profile ? (
            <div className="flex items-start space-x-4">
              <UserProfilePicture
                userId={profile.id || 'concierge'}
                userName={profile.name}
                profilePictureUrl={profile.profilePictureUrl || 'placeholder'}
                size="lg"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h3 className="text-lg font-semibold">{profile.name}</h3>
                  {profile.conciergeTitle && (
                    <span className="text-gray-600">{profile.conciergeTitle}</span>
                  )}
                  <Badge className={profile.isActiveConcierge ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {profile.isActiveConcierge ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {profile.conciergeBio && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium">Bio</h4>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-auto p-1 text-xs text-blue-600 hover:text-blue-700">
                            <Eye className="h-3 w-3 mr-1" />
                            View More
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center">
                              <Shield className="h-5 w-5 mr-2" />
                              {profile.name}'s Concierge Bio
                            </DialogTitle>
                            <DialogDescription>
                              Full bio and professional background
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column */}
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2">Biography</h4>
                                <div className="p-4 bg-gray-50 rounded-lg max-h-48 overflow-y-auto">
                                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {profile.conciergeBio}
                                  </p>
                                </div>
                              </div>

                              {profile.conciergeSpecialties && profile.conciergeSpecialties.length > 0 && (
                                <div>
                                  <h4 className="font-medium mb-2">Specialties</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {profile.conciergeSpecialties.map((specialty) => (
                                      <span
                                        key={specialty}
                                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                                      >
                                        {specialty}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Right Column */}
                            <div className="space-y-4">
                              {profile.conciergeTitle && (
                                <div>
                                  <h4 className="font-medium mb-2">Title</h4>
                                  <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded">
                                    {profile.conciergeTitle}
                                  </p>
                                </div>
                              )}

                              {profile.conciergeExperience && (
                                <div>
                                  <h4 className="font-medium mb-2">Experience</h4>
                                  <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded flex items-center">
                                    <Clock className="h-4 w-4 mr-2" />
                                    {profile.conciergeExperience} years in recruiting
                                  </p>
                                </div>
                              )}

                              <div className="flex justify-end pt-4">
                                <Button asChild>
                                  <a href="/admin/concierge/bio">
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Profile
                                  </a>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <p className="text-sm text-gray-700">
                      {profile.conciergeBio.length > 80
                        ? `${profile.conciergeBio.substring(0, 80)}...`
                        : profile.conciergeBio
                      }
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  {profile.conciergeExperience && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{profile.conciergeExperience} yrs</span>
                    </div>
                  )}
                  {profile.conciergeSpecialties && profile.conciergeSpecialties.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3" />
                      <span>{profile.conciergeSpecialties.length} specialties</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="flex flex-col items-center space-y-3">
                <div className="p-3 bg-gray-100 rounded-full">
                  <Shield className="h-8 w-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Set up your concierge profile</h3>
                  <p className="text-gray-600 mb-4">
                    Create your bio and specialties to start accepting concierge assignments.
                  </p>
                  <Button asChild>
                    <a href="/admin/concierge/bio">
                      <UserCheck className="h-4 w-4 mr-2" />
                      Create Concierge Profile
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                {isSearching ? <Skeleton className="h-8 w-12 mt-1" /> : (
                  <p className="text-2xl font-bold text-gray-900">
                    {requests.filter(r => r.status === 'pending').length}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Phone className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                {isSearching ? <Skeleton className="h-8 w-12 mt-1" /> : (
                  <p className="text-2xl font-bold text-gray-900">
                    {requests.filter(r => ['discovery_call', 'job_optimization', 'candidate_screening', 'interviews'].includes(r.status)).length}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                {isSearching ? <Skeleton className="h-8 w-12 mt-1" /> : (
                  <p className="text-2xl font-bold text-gray-900">
                    {requests.filter(r => r.status === 'completed').length}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-brand-teal">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-brand-teal-light rounded-lg">
                <Star className="h-6 w-6 text-brand-teal" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                {isSearching ? <Skeleton className="h-8 w-12 mt-1" /> : (
                  <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-gray-200">
        {['all', 'pending', 'discovery_call', 'job_optimization', 'candidate_screening', 'interviews', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${selectedStatus === status
                ? 'border-brand-teal text-brand-teal'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            {status === 'all' ? 'All Requests' : statusConfig[status as keyof typeof statusConfig]?.label || status}
          </button>
        ))}
      </div>

      {/* Concierge Requests List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Concierge Requests</CardTitle>
              <CardDescription>
                Manage and track concierge service requests
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              {(searchQuery || assignedFilter !== 'all' || companyTypeFilter !== 'all' || sortBy !== 'newest') && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center space-x-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by job title, company, employer, or notes..."
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">
                  <div className="flex items-center">
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Newest First
                  </div>
                </SelectItem>
                <SelectItem value="oldest">
                  <div className="flex items-center">
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Oldest First
                  </div>
                </SelectItem>
                <SelectItem value="jobTitle">Job Title A-Z</SelectItem>
                <SelectItem value="company">Company A-Z</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Assignment Status</Label>
                <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Requests</SelectItem>
                    <SelectItem value="assigned">
                      <div className="flex items-center">
                        <UserCheck className="h-4 w-4 mr-2 text-blue-600" />
                        Assigned
                      </div>
                    </SelectItem>
                    <SelectItem value="unassigned">
                      <div className="flex items-center">
                        <UserPlus className="h-4 w-4 mr-2 text-yellow-600" />
                        Unassigned
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Company Type</Label>
                <Select value={companyTypeFilter} onValueChange={setCompanyTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    <SelectItem value="private">
                      <div className="flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-orange-600" />
                        Private Companies
                      </div>
                    </SelectItem>
                    <SelectItem value="public">
                      <div className="flex items-center">
                        <Building2 className="h-4 w-4 mr-2 text-blue-600" />
                        Public Companies
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Results</Label>
                <div className="text-sm text-gray-600 bg-white p-2 rounded border">
                  Showing {sortedRequests.length} of {requests.length} requests
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isSearching ? (
            <ConciergeListSkeletons />
          ) : (
          <div className="space-y-4">
            {sortedRequests.map((request) => {
              const statusInfo = statusConfig[request.status]
              const StatusIcon = statusInfo.icon
              const nextStatus = getNextStatus(request.status)

              return (
                <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        <CompanyLogo
                          companyName={request.companyName || 'Company'}
                          companyLogoUrl={request.companyLogoUrl}
                          size="md"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{request.jobTitle}</h3>
                          <Badge className={statusInfo.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                          {request.isCompanyPrivate && (
                            <Badge className="bg-orange-100 text-orange-800">
                              <Shield className="h-3 w-3 mr-1" />
                              Private
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-2">
                          <span className="flex items-center">
                            <Building2 className="h-4 w-4 mr-1" />
                            {request.isCompanyPrivate ? 'Private Company' : request.companyName}
                          </span>
                          <span>Employer: {request.employerName}</span>
                          <span>Requested: {new Date(request.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}</span>
                        </div>

                        {request.discoveryCallNotes && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                            <strong>Discovery Notes:</strong> {request.discoveryCallNotes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <div className="relative">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/admin/concierge/${request.jobId}`}>
                            <MessageSquare className="h-4 w-4 mr-1" />
                            View & Chat
                          </a>
                        </Button>
                        {request.unreadMessagesCount != null && request.unreadMessagesCount > 0 && (
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                            {request.unreadMessagesCount > 99 ? '99+' : request.unreadMessagesCount}
                          </div>
                        )}
                      </div>

                      {!request.assignedAdminId && availableAdmins.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <Select onValueChange={(adminId) => assignAdminToRequest(request.id, adminId)}>
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder={
                                isAssigning === request.id ? "Assigning..." : "Assign Admin"
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {availableAdmins.filter(admin => admin.isActiveConcierge).map((admin) => (
                                <SelectItem key={admin.id} value={admin.id}>
                                  <div className="flex items-center space-x-2">
                                    <span>{admin.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {admin.assignedRequestsCount} active
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {request.assignedAdminId && (
                        <Badge className="bg-blue-100 text-blue-800">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Assigned
                        </Badge>
                      )}

                      {nextStatus && (
                        <Button
                          size="sm"
                          onClick={() => updateRequestStatus(request.id, nextStatus)}
                          className="bg-brand-teal hover:bg-brand-teal-dark"
                        >
                          Move to {statusConfig[nextStatus as keyof typeof statusConfig]?.label}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          )}

          {sortedRequests.length === 0 && requests.length > 0 && (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No matching requests found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your search criteria or filters to find what you're looking for.
              </p>
              <Button variant="outline" onClick={clearAllFilters}>
                Clear All Filters
              </Button>
            </div>
          )}

          {requests.length === 0 && (
            <div className="text-center py-8">
              <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No concierge requests</h3>
              <p className="text-gray-600">
                {selectedStatus === 'all'
                  ? 'No concierge service requests have been made yet.'
                  : `No requests with status "${selectedStatus}" found.`
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.currentPage === 1}
          onClick={() => handlePageChange(pagination.currentPage - 1)}
        >
          Previous
        </Button>
        <div className="text-sm text-gray-600">
          Page {pagination.currentPage} of {pagination.totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!pagination.hasMore}
          onClick={() => handlePageChange(pagination.currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}