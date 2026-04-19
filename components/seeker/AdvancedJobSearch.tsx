'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  Filter,
  MapPin,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { JobCard } from './JobCard'
import { useDebounce } from '@/hooks/useDebounce'
import { JobSearchItem } from '@/lib/search'
import { getWithImpersonation } from '@/lib/api-client'
import { getCategoryLabel, JOB_TYPES } from '@/lib/job-constants'
import { useSavedJobs } from '@/components/providers/SavedJobsProvider'

interface SearchFilters {
  query: string
  category: string
  type: string[]
  location: string
  payMin: number
  payMax: number
  skills: string[]
  skillsMatchType: 'any' | 'all'
  isRemote: boolean
  isFlexibleHours: boolean
  hoursPerWeekMin: number
  hoursPerWeekMax: number
  postedSince: string
  sortBy: 'relevance' | 'date' | 'pay' | 'company'
  sortOrder: 'asc' | 'desc'
}

interface SearchResults {
  jobs: JobSearchItem[]
  totalCount: number
  facets: {
    categories: Array<{ name: string; count: number }>
    types: Array<{ name: string; count: number }>
    skills: Array<{ name: string; count: number }>
    payRanges: Array<{ range: string; count: number }>
    companies: Array<{ name: string; count: number }>
  }
  suggestions: string[]
}

interface AdvancedJobSearchProps {
  onJobSelect?: (job: JobSearchItem) => void;
}

// Helper function to get job type label
function getJobTypeLabel(type: string): string {
  if (!type) return 'Not specified';
  const jobType = JOB_TYPES.find(t => t.value.toLocaleLowerCase() === type.replace('_', '-').toLocaleLowerCase());
  return jobType ? jobType.label : type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Skeleton component for loading state
function JobCardSkeleton() {
  return (
    <Card className="border border-gray-200 bg-white">
      <CardHeader className="pb-2 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            {/* Company Logo Skeleton */}
            <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />

            {/* Job Info Skeleton */}
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>

              {/* Job Meta Skeleton */}
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>

            {/* Action Buttons Skeleton */}
            <div className="flex items-start space-x-1 ml-2 flex-shrink-0 mt-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        {/* Description Skeleton */}
        <Skeleton className="h-4 w-full mb-3" />

        {/* Tags Skeleton */}
        <div className="flex flex-wrap gap-2 mb-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>

        {/* Skills Skeleton */}
        <div className="flex flex-wrap gap-1 mb-2">
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-5 w-20 rounded" />
          <Skeleton className="h-5 w-18 rounded" />
        </div>

        {/* Action Buttons Skeleton */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <Skeleton className="h-8 w-32 rounded" />
          <Skeleton className="h-8 w-28 rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdvancedJobSearch({ onJobSelect }: AdvancedJobSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: 'all-categories',
    type: [],
    location: '',
    payMin: 0,
    payMax: 200000,
    skills: [],
    skillsMatchType: 'any',
    isRemote: false,
    isFlexibleHours: false,
    hoursPerWeekMin: 0,
    hoursPerWeekMax: 40,
    postedSince: 'any-time',
    sortBy: 'relevance',
    sortOrder: 'desc'
  })

  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [popularTerms, setPopularTerms] = useState<string[]>([])

  // Use shared saved jobs context instead of local state
  const { savedJobs, toggleSaveJob } = useSavedJobs()
  const [savingJobIds, setSavingJobIds] = useState<Set<string>>(new Set())

  const debouncedQuery = useDebounce(filters.query, 300)

  // Transform search API response to JobSearchItem format
  const transformSearchResults = (data: any): SearchResults => {
    return {
      ...data,
      jobs: (data.jobs || []).map((job: any): JobSearchItem & { companyLogoUrl?: string; employerId?: string; applicationStatus?: any } => {
        // Generate proper salary text based on salary type
        const salaryType = job.salaryType || 'yearly'
        const salaryTypeText = salaryType === 'yearly' ? '/yr' :
          salaryType === 'monthly' ? '/mo' :
            salaryType === 'hourly' ? '/hr' : '/yr'

        return {
          id: job.id,
          title: job.title,
          company: job.companyName || job.employer?.companyName,
          category: job.category,
          type: job.type,
          payRange: job.payRangeMin && job.payRangeMax ? {
            min: job.payRangeMin,
            max: job.payRangeMax,
            text: job.payRangeText || `$${job.payRangeMin.toLocaleString()}-${job.payRangeMax.toLocaleString()}${salaryTypeText}`
          } : undefined,
          salaryType: job.salaryType,
          location: job.locationText || 'Remote',
          description: job.description,
          skills: Array.isArray(job.skillsRequired) ? job.skillsRequired : [],
          postedDate: job.createdAt, // Convert createdAt to postedDate
          expiresAt: job.expiresAt,
          applicationCount: 0, // Not available in search format
          isRemote: true, // Assume remote for now
          isFlexible: job.isFlexibleHours || false,
          isFeatured: false, // Not available in search format
          relevanceScore: job.relevanceScore || 1.0,
          // Add additional properties for JobCard
          companyLogoUrl: job.companyLogoUrl || job.employer?.companyLogoUrl,
          employerId: job.employerId,
          applicationStatus: job.applicationStatus
        }
      })
    }
  }

  const performSearch = useCallback(async (searchFilters: SearchFilters, pageNum: number = 1) => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        query: searchFilters.query,
        page: pageNum.toString(),
        limit: '20',
        sortBy: searchFilters.sortBy,
        sortOrder: searchFilters.sortOrder,
        availableOnly: 'true' // Only show available jobs by default
      })

      // Add filters to params
      if (searchFilters.category && searchFilters.category !== 'all-categories') params.append('category', searchFilters.category)
      if (searchFilters.location) params.append('location', searchFilters.location)
      if (searchFilters.payMin > 0) params.append('payMin', searchFilters.payMin.toString())
      if (searchFilters.payMax < 200000) params.append('payMax', searchFilters.payMax.toString())
      if (searchFilters.isRemote) params.append('isRemote', 'true')
      if (searchFilters.isFlexibleHours) params.append('isFlexibleHours', 'true')
      if (searchFilters.postedSince && searchFilters.postedSince !== 'any-time') params.append('postedSince', searchFilters.postedSince)

      searchFilters.type.forEach(t => params.append('type', t))
      searchFilters.skills.forEach(s => params.append('skills', s))

      if (searchFilters.skills.length > 0) {
        params.append('skillsMatchType', searchFilters.skillsMatchType)
      }

      const response = await fetch(`/api/jobs/search?${params}`)
      if (!response.ok) throw new Error('Search failed')

      const data = await response.json()
      const transformedData = transformSearchResults(data)
      setResults(transformedData)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial search on mount (load all jobs) and when query changes (debounced)
  useEffect(() => {
    setPage(1)
    performSearch(filters, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery])

  // Load popular search terms
  useEffect(() => {
    getWithImpersonation('/api/jobs/popular-terms')
      .then(res => res.json())
      .then(terms => setPopularTerms(terms))
      .catch(console.error)
  }, [])

  const handleFilterChange = (key: keyof SearchFilters, value: string | number | boolean | string[]) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    setPage(1)
    performSearch(newFilters, 1)
  }

  const handleSkillToggle = (skill: string) => {
    const newSkills = filters.skills.includes(skill)
      ? filters.skills.filter(s => s !== skill)
      : [...filters.skills, skill]

    handleFilterChange('skills', newSkills)
  }

  const handleTypeToggle = (type: string) => {
    const newTypes = filters.type.includes(type)
      ? filters.type.filter(t => t !== type)
      : [...filters.type, type]

    handleFilterChange('type', newTypes)
  }

  const clearFilters = () => {
    const clearedFilters: SearchFilters = {
      query: filters.query, // Keep the search query
      category: 'all-categories',
      type: [],
      location: '',
      payMin: 0,
      payMax: 200000,
      skills: [],
      skillsMatchType: 'any',
      isRemote: false,
      isFlexibleHours: false,
      hoursPerWeekMin: 0,
      hoursPerWeekMax: 40,
      postedSince: 'any-time',
      sortBy: 'relevance',
      sortOrder: 'desc'
    }
    setFilters(clearedFilters)
    performSearch(clearedFilters, 1)
  }

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    performSearch(filters, nextPage)
  }

  const handleSaveJob = async (jobId: string) => {
    if (savingJobIds.has(jobId)) return
    setSavingJobIds((prev) => {
      const next = new Set(prev)
      next.add(jobId)
      return next
    })

    try {
      await toggleSaveJob(jobId)
    } catch (error) {
      console.error('Error saving/unsaving job:', error)
    } finally {
      setSavingJobIds((prev) => {
        const next = new Set(prev)
        next.delete(jobId)
        return next
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardHeader>
          <CardTitle>Available Remote Jobs</CardTitle>
          <CardDescription>
            Search through available mom-friendly remote opportunities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Search Bar */}
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs, companies, or skills..."
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                className="pl-10 pr-10"
              />
              {loading && (
                <div className="absolute right-3 top-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-teal"></div>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </Button>
          </div>

          {/* Popular Search Terms */}
          {!filters.query && popularTerms.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Popular Searches:</Label>
              <div className="flex flex-wrap gap-2">
                {popularTerms.map((term, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, query: term }))}
                    className="text-xs"
                  >
                    {term}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Search Suggestions */}
          {results?.suggestions && results.suggestions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Did you mean:</Label>
              <div className="flex flex-wrap gap-2">
                {results.suggestions.map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, query: suggestion }))}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Advanced Filters</CardTitle>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList>
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="skills">Skills</TabsTrigger>
                <TabsTrigger value="compensation">Compensation</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all-categories">All categories</SelectItem>
                        {results?.facets.categories.map((cat) => (
                          <SelectItem key={cat.name} value={cat.name}>
                            {getCategoryLabel(cat.name)} ({cat.count})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="City, state, or remote"
                        value={filters.location}
                        onChange={(e) => handleFilterChange('location', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Posted</Label>
                    <Select value={filters.postedSince} onValueChange={(value) => handleFilterChange('postedSince', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Any time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any-time">Any time</SelectItem>
                        <SelectItem value="1">Last 24 hours</SelectItem>
                        <SelectItem value="7">Last week</SelectItem>
                        <SelectItem value="30">Last month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Job Type</Label>
                  <div className="flex flex-wrap gap-2">
                    {results?.facets.types.map((type) => (
                      <div key={type.name} className="flex items-center space-x-2">
                        <Checkbox
                          id={`type-${type.name}`}
                          checked={filters.type.includes(type.name)}
                          onCheckedChange={() => handleTypeToggle(type.name)}
                        />
                        <Label htmlFor={`type-${type.name}`} className="text-sm">
                          {getJobTypeLabel(type.name)} ({type.count})
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remote"
                      checked={filters.isRemote}
                      onCheckedChange={(checked) => handleFilterChange('isRemote', checked)}
                    />
                    <Label htmlFor="remote">Remote work</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="flexible"
                      checked={filters.isFlexibleHours}
                      onCheckedChange={(checked) => handleFilterChange('isFlexibleHours', checked)}
                    />
                    <Label htmlFor="flexible">Flexible hours</Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="skills" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Skills</Label>
                    <Select
                      value={filters.skillsMatchType}
                      onValueChange={(value: 'any' | 'all') => handleFilterChange('skillsMatchType', value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any skill</SelectItem>
                        <SelectItem value="all">All skills</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {results?.facets.skills && (
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {results.facets.skills.map((skill) => (
                        <div key={skill.name} className="flex items-center space-x-2">
                          <Checkbox
                            id={`skill-${skill.name}`}
                            checked={filters.skills.includes(skill.name)}
                            onCheckedChange={() => handleSkillToggle(skill.name)}
                          />
                          <Label htmlFor={`skill-${skill.name}`} className="text-sm">
                            {skill.name} ({skill.count})
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="compensation" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label>Salary Range</Label>
                    <div className="px-3">
                      <Slider
                        value={[filters.payMin, filters.payMax]}
                        onValueChange={(values: number[]) => {
                          const [min, max] = values
                          setFilters(prev => ({ ...prev, payMin: min, payMax: max }))
                        }}
                        onValueCommit={(values: number[]) => {
                          const [min, max] = values
                          handleFilterChange('payMin', min)
                          handleFilterChange('payMax', max)
                        }}
                        max={200000}
                        min={0}
                        step={5000}
                        className="w-full"
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>${filters.payMin.toLocaleString()}</span>
                      <span>${filters.payMax.toLocaleString()}+</span>
                    </div>
                  </div>

                  {results?.facets.payRanges && (
                    <div className="space-y-2">
                      <Label>Common Ranges</Label>
                      <div className="grid gap-2 md:grid-cols-2">
                        {results.facets.payRanges.map((range) => (
                          <div key={range.range} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm">{range.range}</span>
                            <Badge variant="secondary">{range.count} jobs</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label>Hours per Week</Label>
                    <div className="px-3">
                      <Slider
                        value={[filters.hoursPerWeekMin, filters.hoursPerWeekMax]}
                        onValueChange={(values: number[]) => {
                          const [min, max] = values
                          setFilters(prev => ({ ...prev, hoursPerWeekMin: min, hoursPerWeekMax: max }))
                        }}
                        onValueCommit={(values: number[]) => {
                          const [min, max] = values
                          handleFilterChange('hoursPerWeekMin', min)
                          handleFilterChange('hoursPerWeekMax', max)
                        }}
                        max={40}
                        min={0}
                        step={5}
                        className="w-full"
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{filters.hoursPerWeekMin} hours</span>
                      <span>{filters.hoursPerWeekMax} hours</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <div className="space-y-4">
        {/* Results Header - Hidden during loading */}
        {!loading && (
          <div className="flex items-center justify-between">
            <div>
              {/* Job Count Display
               * FEATURE FLAG: NEXT_PUBLIC_SHOW_JOB_COUNTS
               * When false: Shows "Jobs Found" without the count
               * When true: Shows "XX Jobs Found" with the count
               * To re-enable: Set NEXT_PUBLIC_SHOW_JOB_COUNTS="true" in .env
               * Related: Also controls "Available Jobs" tile in seeker dashboard
               */}
              <h2 className="text-xl font-semibold">
                {results
                  ? (process.env.NEXT_PUBLIC_SHOW_JOB_COUNTS === 'true'
                    ? `${results.totalCount} Jobs Found`
                    : 'Jobs Found')
                  : 'Search Results'}
              </h2>
              {filters.query && (
                <p className="text-muted-foreground">
                  Results for &quot;{filters.query}&quot;
                </p>
              )}
            </div>

            <Select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onValueChange={(value) => {
                const [sortBy, sortOrder] = value.split('-') as [typeof filters.sortBy, typeof filters.sortOrder]
                handleFilterChange('sortBy', sortBy)
                handleFilterChange('sortOrder', sortOrder)
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance-desc">Most Relevant</SelectItem>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="pay-desc">Highest Pay</SelectItem>
                <SelectItem value="pay-asc">Lowest Pay</SelectItem>
                <SelectItem value="company-asc">Company A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Active Filters */}
        {(filters.category && filters.category !== 'all-categories' || filters.type.length > 0 || filters.skills.length > 0 || filters.location || filters.isRemote || filters.isFlexibleHours) && (
          <div className="flex flex-wrap gap-2">
            {filters.category && filters.category !== 'all-categories' && (
              <Badge variant="secondary" className="flex items-center">
                {getCategoryLabel(filters.category)}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => handleFilterChange('category', 'all-categories')}
                />
              </Badge>
            )}
            {filters.type.map(type => (
              <Badge key={type} variant="secondary" className="flex items-center">
                {getJobTypeLabel(type)}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => handleTypeToggle(type)}
                />
              </Badge>
            ))}
            {filters.skills.map(skill => (
              <Badge key={skill} variant="secondary" className="flex items-center">
                {skill}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => handleSkillToggle(skill)}
                />
              </Badge>
            ))}
            {filters.location && (
              <Badge variant="secondary" className="flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                {filters.location}
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => handleFilterChange('location', '')}
                />
              </Badge>
            )}
            {filters.isRemote && (
              <Badge variant="secondary" className="flex items-center">
                Remote
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => handleFilterChange('isRemote', false)}
                />
              </Badge>
            )}
            {filters.isFlexibleHours && (
              <Badge variant="secondary" className="flex items-center">
                Flexible Hours
                <X
                  className="h-3 w-3 ml-1 cursor-pointer"
                  onClick={() => handleFilterChange('isFlexibleHours', false)}
                />
              </Badge>
            )}
          </div>
        )}

        {/* Job Results */}
        {loading ? (
          <div className="space-y-4">
            {/* Loading message */}
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal"></div>
                <p className="text-lg font-medium text-gray-700">Searching for jobs...</p>
              </div>
            </div>
            {/* Show skeleton loaders while loading */}
            {[1, 2, 3].map((i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        ) : results && (
          <div className="space-y-4">
            {results.jobs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No jobs found</h3>
                  <p className="text-muted-foreground text-center">
                    Try adjusting your search criteria or removing some filters
                  </p>
                  <Button variant="outline" className="mt-4" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {results.jobs.map((job) => (
                  <div key={job.id}>
                    <JobCard
                      job={job}
                      onSave={handleSaveJob}
                      isSaved={savedJobs.has(job.id)}
                      isSaving={savingJobIds.has(job.id)}
                      onJobSelect={onJobSelect}
                    />
                  </div>
                ))}

                {results.jobs.length < results.totalCount && (
                  <div className="flex justify-center pt-6">
                    <Button
                      variant="outline"
                      onClick={loadMore}
                      disabled={loading}
                    >
                      {loading ? 'Loading...' : 'Load More Jobs'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
