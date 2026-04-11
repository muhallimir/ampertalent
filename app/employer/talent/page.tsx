'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Filter, Users } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { VirtualizedTalentGrid, useInfiniteScroll, useDebouncedSearch } from '@/components/employer/VirtualizedTalentGrid'
import { TalentProfileModal } from '@/components/employer/TalentProfileModal'
import { JobInvitationModal } from '@/components/employer/JobInvitationModal'
import { useToast } from '@/hooks/use-toast'
import { getImpersonationSession } from '@/lib/admin-impersonation'
import { ClientOnly } from '@/components/common/ClientOnly'
import { usePerformanceMonitoring } from '@/lib/monitoring'

interface TalentProfile {
  id: string
  name: string
  firstName: string | null
  lastName: string | null
  headline: string | null
  aboutMe: string | null
  availability: string | null
  salaryExpectations: string | null
  showSalaryExpectations: boolean
  skills: string[]
  profilePictureUrl: string | null
  membershipPlan: string
  portfolioUrls: string[]
  hasResume: boolean
  joinedAt: string
  updatedAt: string
  applicationStatus: string | null
  jobStatus: string | null
  jobTitle: string | null
  // New ranking fields
  relevanceScore?: number
  membershipWeight?: number
  rankingScore?: number
}

interface PaginationInfo {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export default function BrowseTalentPage() {
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(searchParams?.get('search') || '')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [availabilityFilter, setAvailabilityFilter] = useState('')
  const [membershipFilter, setMembershipFilter] = useState('all')
  const [hasResumeFilter, setHasResumeFilter] = useState(false)
  const [sortBy, setSortBy] = useState('updated_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [selectedTalentId, setSelectedTalentId] = useState<string | null>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectedTalentForInvite, setSelectedTalentForInvite] = useState<{
    id: string
    name: string
    profilePictureUrl: string | null
    headline: string | null
  } | null>(null)
  const [invitedTalentIds, setInvitedTalentIds] = useState<Set<string>>(new Set())

  const debouncedSearchTerm = useDebouncedSearch(searchTerm, 150) // Faster response
  const { toast } = useToast()
  const { trackSearchPerformance, trackUserInteraction, trackPageLoad } = usePerformanceMonitoring()

  // Fetch talents with cursor-based pagination
  const fetchTalents = async (cursor?: string) => {
    const startTime = performance.now()
    
    const params = new URLSearchParams({
      limit: '20', // Increased for better infinite scroll experience
      sortBy,
      sortOrder
    })

    if (cursor) {
      params.append('cursor', cursor)
    }

    if (debouncedSearchTerm) {
      params.append('search', debouncedSearchTerm)
    }

    if (selectedSkills.length > 0) {
      params.append('skills', selectedSkills.join(','))
    }

    if (availabilityFilter) {
      params.append('availability', availabilityFilter)
    }

    if (membershipFilter && membershipFilter !== 'all') {
      params.append('membershipPlan', membershipFilter)
    }

    if (hasResumeFilter) {
      params.append('hasResume', 'true')
    }

    // Check for impersonation context only on client side
    const headers: HeadersInit = {}

    if (typeof window !== 'undefined') {
      const impersonationSession = getImpersonationSession()
      if (impersonationSession) {
        console.log('🎭 FRONTEND: Adding impersonation headers to talent request', {
          impersonatedUserId: impersonationSession.impersonatedUser.id,
          adminId: impersonationSession.adminId
        })
        headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
        headers['x-admin-user-id'] = impersonationSession.adminId
      }
    }

    const response = await fetch(`/api/employer/talent?${params}`, { headers })
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch talents')
    }

    // Track search performance
    const duration = performance.now() - startTime
    trackSearchPerformance(debouncedSearchTerm, data.data.length, duration)

    return {
      data: data.data,
      pagination: {
        hasNext: data.pagination.hasNext,
        nextCursor: data.pagination.nextCursor
      }
    }
  }

  // Initialize infinite scroll hook
  const {
    data: talents,
    loading,
    hasMore,
    error,
    loadMore,
    reset,
    refresh
  } = useInfiniteScroll([], fetchTalents)

  // Track initial load state
  const [initialLoading, setInitialLoading] = useState(true)

  // Effect to reset and fetch when filters change
  useEffect(() => {
    setInitialLoading(true)
    reset([])
    fetchTalents().then(result => {
      reset(result.data, result.pagination.hasNext)
      setInitialLoading(false)
    }).catch(err => {
      console.error('Error fetching talents:', err)
      setInitialLoading(false)
    })
  }, [debouncedSearchTerm, selectedSkills, availabilityFilter, membershipFilter, hasResumeFilter, sortBy, sortOrder])

  // Handle skill filter toggle
  const toggleSkillFilter = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    )
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setSelectedSkills([])
    setAvailabilityFilter('')
    setMembershipFilter('all')
    setHasResumeFilter(false)
    setSortBy('updated_at')
    setSortOrder('desc')
  }

  // Handle view profile
  const handleViewProfile = (talentId: string) => {
    const startTime = performance.now()
    setSelectedTalentId(talentId)
    setShowProfileModal(true)
    
    // Track user interaction
    const duration = performance.now() - startTime
    trackUserInteraction('view_profile', duration)
  }

  // Handle invite talent
  const handleInviteTalent = (talentId: string) => {
    if (invitedTalentIds.has(talentId)) {
      toast({
        title: 'Already invited',
        description: 'You have already invited this professional.',
        variant: 'default',
        duration: 3000
      })
      return
    }

    const startTime = performance.now()
    const talent = talents.find(t => t.id === talentId)
    if (talent) {
      setSelectedTalentForInvite({
        id: talent.id,
        name: talent.name,
        profilePictureUrl: talent.profilePictureUrl,
        headline: talent.headline
      })
      setShowInviteModal(true)
      
      // Track user interaction
      const duration = performance.now() - startTime
      trackUserInteraction('invite_talent', duration)
    }
  }

  // Handle invitation success
  const handleInvitationSuccess = () => {
    if (selectedTalentForInvite?.id) {
      setInvitedTalentIds(prev => {
        const next = new Set(prev)
        next.add(selectedTalentForInvite.id)
        return next
      })
    }
    toast({
      title: "Invitation Sent Successfully! ✉️",
      description: "The job seeker will be notified about your invitation.",
      variant: "default",
      duration: 4000
    })
  }

  // Common skills for quick filtering
  const commonSkills = [
    'Virtual Assistant', 'Customer Service', 'Data Entry', 'Social Media',
    'Content Writing', 'Bookkeeping', 'Project Management', 'Graphic Design',
    'Marketing', 'Administrative Support'
  ]

  // Track page load performance
  useEffect(() => {
    const startTime = performance.now()
    
    const handleLoad = () => {
      const loadTime = performance.now() - startTime
      trackPageLoad('talent_browse', loadTime)
    }

    if (document.readyState === 'complete') {
      handleLoad()
    } else {
      window.addEventListener('load', handleLoad)
      return () => window.removeEventListener('load', handleLoad)
    }
  }, [trackPageLoad])

  // Membership plan options
  const membershipPlans = [
    { value: 'trial_monthly', label: 'Trial' },
    { value: 'gold_bimonthly', label: 'Gold' },
    { value: 'vip_quarterly', label: 'VIP' },
    { value: 'annual_platinum', label: 'Platinum' },
    { value: 'none', label: 'Free' }
  ]

  // Sort options
  const sortOptions = [
    { value: 'updated_at', label: 'Recently Updated' },
    { value: 'created_at', label: 'Newest Members' },
    { value: 'name', label: 'Name' }
  ]

  return (
    <ClientOnly fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            {/* Header skeleton */}
            <div>
              <div className="h-8 bg-gray-200 rounded w-80 mb-3"></div>
              <div className="h-5 bg-gray-200 rounded w-96"></div>
            </div>
            
            {/* Search skeleton */}
            <div className="h-12 bg-gray-200 rounded"></div>
            
            {/* Filters skeleton */}
            <div className="flex space-x-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 bg-gray-200 rounded w-24"></div>
              ))}
            </div>
            
            {/* Grid skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white border rounded-lg p-4 space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    }>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6">
          {/* Compact Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Browse 100k+ Mom Professionals
                </h1>
                <p className="text-base text-gray-600 max-w-2xl">
                  Discover talented professionals ready for remote work. Use filters to find your perfect team member.
                </p>
              </div>
              <div className="hidden lg:block">
                <div className="bg-white rounded-lg p-3 shadow-sm border">
                  <div className="text-xs text-gray-500 mb-1">Showing</div>
                  <div className="text-xl font-bold text-brand-teal">
                    {loading && talents.length === 0 ? (
                      <div className="animate-pulse bg-gray-200 h-6 w-12 rounded"></div>
                    ) : (
                      `${talents.length}${hasMore ? '+' : ''}`
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Compact Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            {/* Main Search Row */}
            <div className="p-4 pb-3">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Bar - Takes most space */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search 100k+ professionals by name, skills, or keywords..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-10 pl-10 pr-10 w-full border-gray-300 focus:border-brand-teal focus:ring-brand-teal"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Filters Row */}
                <div className="flex items-center gap-3">
                  {/* Membership Quick Filter */}
                  <Select value={membershipFilter} onValueChange={setMembershipFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="All Plans" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plans</SelectItem>
                      {membershipPlans.map(plan => (
                        <SelectItem key={plan.value} value={plan.value}>{plan.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Resume Filter */}
                  <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasResumeFilter}
                      onChange={(e) => setHasResumeFilter(e.target.checked)}
                      className="rounded border-gray-300 text-brand-teal focus:ring-brand-teal"
                    />
                    <span>Has Resume</span>
                  </label>

                  {/* Sort */}
                  <Select
                    value={`${sortBy}-${sortOrder}`}
                    onValueChange={(value) => {
                      const [newSortBy, newSortOrder] = value.split('-')
                      setSortBy(newSortBy)
                      setSortOrder(newSortOrder as 'asc' | 'desc')
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="updated_at-desc">Recently Updated</SelectItem>
                      <SelectItem value="created_at-desc">Newest Members</SelectItem>
                      <SelectItem value="name-asc">Name A-Z</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Advanced Filters Toggle */}
                  <Button
                    variant="outline"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="h-10 flex items-center space-x-1"
                  >
                    <Filter className="h-4 w-4" />
                    <span>Filters</span>
                    {(selectedSkills.length > 0 || searchTerm || (membershipFilter && membershipFilter !== 'all') || hasResumeFilter) && (
                      <span className="bg-brand-teal text-white text-xs rounded-full px-1.5 py-0.5 ml-1">
                        {[searchTerm, ...selectedSkills, membershipFilter !== 'all' ? membershipFilter : null, hasResumeFilter].filter(Boolean).length}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Collapsible Advanced Filters */}
            {showAdvancedFilters && (
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                {/* Skills Filter */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Popular Skills</label>
                    {selectedSkills.length > 0 && (
                      <span className="text-xs text-brand-teal bg-brand-teal/10 px-2 py-1 rounded-full">
                        {selectedSkills.length} selected
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {commonSkills.map(skill => (
                      <Badge
                        key={skill}
                        variant={selectedSkills.includes(skill) ? "default" : "outline"}
                        className="cursor-pointer hover:bg-brand-teal hover:text-white transition-colors text-xs"
                        onClick={() => toggleSkillFilter(skill)}
                      >
                        {skill}
                        {selectedSkills.includes(skill) && <span className="ml-1">✓</span>}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                {(selectedSkills.length > 0 || searchTerm || (membershipFilter && membershipFilter !== 'all') || hasResumeFilter) && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">
                        {[
                          searchTerm && `"${searchTerm}"`,
                          selectedSkills.length > 0 && `${selectedSkills.length} skills`,
                          membershipFilter && membershipFilter !== 'all' && membershipPlans.find(p => p.value === membershipFilter)?.label,
                          hasResumeFilter && 'Has resume'
                        ].filter(Boolean).join(', ')}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Clear All
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Compact Results Summary */}
          <div className="mb-4 bg-white rounded-lg shadow-sm border p-3">
            <div className="text-sm text-gray-600">
              {initialLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-brand-teal"></div>
                  <span>Finding professionals...</span>
                </div>
              ) : (
                <span>
                  <span className="font-semibold text-gray-900">{talents.length}</span> professionals
                  {hasMore && <span className="text-brand-teal"> • Scroll for more</span>}
                </span>
              )}
            </div>
          </div>

          {/* Optimized Talent Grid for 100k+ profiles */}
          <VirtualizedTalentGrid
            talents={talents}
            loading={initialLoading || loading}
            onViewProfile={handleViewProfile}
            onInvite={handleInviteTalent}
            onLoadMore={loadMore}
            hasMore={hasMore}
            invitedTalentIds={invitedTalentIds}
          />

          {/* Error State */}
          {error && (
            <div className="mb-6 p-6 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">Something went wrong</h3>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Modals */}
          <TalentProfileModal
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            talentId={selectedTalentId}
            onInvite={handleInviteTalent}
            isInvited={selectedTalentId ? invitedTalentIds.has(selectedTalentId) : false}
          />

          <JobInvitationModal
            isOpen={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            talent={selectedTalentForInvite}
            onSuccess={handleInvitationSuccess}
          />
        </div>
      </div>
    </ClientOnly>
  )
}
