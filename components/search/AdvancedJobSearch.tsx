'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { SearchService, SearchFilters, SearchResult, JobSearchItem } from '@/lib/search'
import {
  Search,
  MapPin,
  DollarSign,
  Clock,
  Users,
  Star,
  Bookmark,
  ExternalLink,
  X,
  SlidersHorizontal
} from 'lucide-react'

const ALL_CATEGORIES_VALUE = '__all_categories__'
const ANY_JOB_TYPE_VALUE = '__any_job_type__'

interface AdvancedJobSearchProps {
  onJobSelect?: (job: JobSearchItem) => void
  initialFilters?: Partial<SearchFilters>
}

export function AdvancedJobSearch({ onJobSelect, initialFilters = {} }: AdvancedJobSearchProps) {
  const [searchResults, setSearchResults] = useState<SearchResult<JobSearchItem> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set())

  const [filters, setFilters] = useState<SearchFilters>({
    keywords: '',
    category: '',
    jobType: undefined,
    payRange: { min: 0, max: 100 },
    location: '',
    skills: [],
    remote: undefined,
    flexibleHours: undefined,
    datePosted: 'all',
    sortBy: 'relevance',
    sortOrder: 'desc',
    ...initialFilters
  })

  const [skillInput, setSkillInput] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    handleSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage])

  useEffect(() => {
    if (filters.keywords) {
      const suggestions = SearchService.generateSearchSuggestions(filters.keywords, 'jobs')
      setSuggestions(suggestions)
    } else {
      setSuggestions([])
    }
  }, [filters.keywords])

  const handleSearch = async () => {
    try {
      setIsLoading(true)
      const results = await SearchService.searchJobs(filters, currentPage, 20)
      setSearchResults(results)
      
      // Save search query for analytics
      await SearchService.saveSearchQuery(
        filters.keywords || '',
        filters,
        results.totalCount
      )
    } catch (error) {
      console.error('Error searching jobs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (key: keyof SearchFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const handleAddSkill = (skill: string) => {
    if (skill && !filters.skills?.includes(skill)) {
      setFilters(prev => ({
        ...prev,
        skills: [...(prev.skills || []), skill]
      }))
      setSkillInput('')
    }
  }

  const handleRemoveSkill = (skill: string) => {
    setFilters(prev => ({
      ...prev,
      skills: prev.skills?.filter(s => s !== skill) || []
    }))
  }

  const handleSaveJob = (jobId: string) => {
    setSavedJobs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(jobId)) {
        newSet.delete(jobId)
      } else {
        newSet.add(jobId)
      }
      return newSet
    })
  }

  const clearFilters = () => {
    setFilters({
      keywords: '',
      category: '',
      jobType: undefined,
      payRange: { min: 0, max: 100 },
      location: '',
      skills: [],
      remote: undefined,
      flexibleHours: undefined,
      datePosted: 'all',
      sortBy: 'relevance',
      sortOrder: 'desc'
    })
    setCurrentPage(1)
  }

  const formatSalary = (payRange: { min: number; max: number; text: string }) => {
    return payRange.text
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Today'
    if (diffDays === 2) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays} days ago`
    if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    return `${Math.ceil(diffDays / 30)} months ago`
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.keywords) count++
    if (filters.category) count++
    if (filters.jobType) count++
    if (filters.location) count++
    if (filters.skills && filters.skills.length > 0) count++
    if (filters.remote !== undefined) count++
    if (filters.flexibleHours !== undefined) count++
    if (filters.datePosted !== 'all') count++
    return count
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Main Search */}
            <div className="flex-1 relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search jobs by title, company, or keywords..."
                  value={filters.keywords}
                  onChange={(e) => handleFilterChange('keywords', e.target.value)}
                  className="pl-10 pr-4"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              
              {/* Search Suggestions */}
              {suggestions.length > 0 && filters.keywords && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 mt-1">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                      onClick={() => {
                        handleFilterChange('keywords', suggestion)
                        setSuggestions([])
                      }}
                    >
                      <Search className="inline h-3 w-3 mr-2 text-gray-400" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex gap-2">
              <Select
                value={filters.category || ALL_CATEGORIES_VALUE}
                onValueChange={(value) =>
                  handleFilterChange('category', value === ALL_CATEGORIES_VALUE ? '' : value)
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CATEGORIES_VALUE}>All Categories</SelectItem>
                  <SelectItem value="Virtual Assistant">Virtual Assistant</SelectItem>
                  <SelectItem value="Customer Service">Customer Service</SelectItem>
                  <SelectItem value="Content Writing">Content Writing</SelectItem>
                  <SelectItem value="Data Entry">Data Entry</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Design">Design</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="relative"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
                {getActiveFilterCount() > 0 && (
                  <Badge className="ml-2 h-5 w-5 p-0 text-xs">
                    {getActiveFilterCount()}
                  </Badge>
                )}
              </Button>

              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? <LoadingSpinner size="sm" /> : 'Search'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Advanced Filters</CardTitle>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Job Type */}
              <div>
                <Label>Job Type</Label>
                <Select
                  value={filters.jobType || ANY_JOB_TYPE_VALUE}
                  onValueChange={(value) =>
                    handleFilterChange('jobType', value === ANY_JOB_TYPE_VALUE ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ANY_JOB_TYPE_VALUE}>Any Type</SelectItem>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div>
                <Label>Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="City, state, or remote"
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Date Posted */}
              <div>
                <Label>Date Posted</Label>
                <Select
                  value={filters.datePosted}
                  onValueChange={(value) => handleFilterChange('datePosted', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Past week</SelectItem>
                    <SelectItem value="month">Past month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pay Range */}
            <div>
              <Label>Pay Range (per hour)</Label>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.payRange?.min || ''}
                    onChange={(e) => handleFilterChange('payRange', {
                      ...filters.payRange,
                      min: parseInt(e.target.value) || 0
                    })}
                    className="w-20"
                  />
                </div>
                <span className="text-gray-400">to</span>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.payRange?.max || ''}
                    onChange={(e) => handleFilterChange('payRange', {
                      ...filters.payRange,
                      max: parseInt(e.target.value) || 100
                    })}
                    className="w-20"
                  />
                </div>
              </div>
            </div>

            {/* Skills */}
            <div>
              <Label>Required Skills</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a skill..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddSkill(skillInput)
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleAddSkill(skillInput)}
                  >
                    Add
                  </Button>
                </div>
                {filters.skills && filters.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {filters.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                        {skill}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleRemoveSkill(skill)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remote"
                  checked={filters.remote === true}
                  onCheckedChange={(checked) => 
                    handleFilterChange('remote', checked ? true : undefined)
                  }
                />
                <Label htmlFor="remote">Remote work</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="flexible"
                  checked={filters.flexibleHours === true}
                  onCheckedChange={(checked) => 
                    handleFilterChange('flexibleHours', checked ? true : undefined)
                  }
                />
                <Label htmlFor="flexible">Flexible hours</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {searchResults && (
        <div className="space-y-4">
          {/* Results Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">
                {searchResults.totalCount.toLocaleString()} jobs found
              </h2>
              {filters.keywords && (
                <p className="text-sm text-gray-600">
                  Results for &quot;{filters.keywords}&quot;
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Label className="text-sm">Sort by:</Label>
              <Select
                value={filters.sortBy}
                onValueChange={(value) => handleFilterChange('sortBy', value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="applications">Applications</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Job Cards */}
          <div className="space-y-4">
            {searchResults.items.map((job) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-blue-600 hover:text-blue-700">
                            {job.title}
                          </h3>
                          <p className="text-gray-600">{job.company}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {job.isFeatured && (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Star className="h-3 w-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSaveJob(job.id)}
                            className={savedJobs.has(job.id) ? 'text-blue-600' : 'text-gray-400'}
                          >
                            <Bookmark className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {job.location}
                        </div>
                        {job.payRange && (
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {formatSalary(job.payRange)}
                          </div>
                        )}
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {job.type.replace('-', ' ')}
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {job.applicationCount} applications
                        </div>
                      </div>

                      <p className="text-gray-700 mb-3 line-clamp-2">
                        {job.description}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {job.skills.slice(0, 5).map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {job.skills.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{job.skills.length - 5} more
                          </Badge>
                        )}
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Posted {formatDate(job.postedDate)}</span>
                          {job.isRemote && <Badge variant="outline">Remote</Badge>}
                          {job.isFlexible && <Badge variant="outline">Flexible</Badge>}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          <Button size="sm" onClick={() => onJobSelect?.(job)}>
                            Apply Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {searchResults.totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-8">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                Previous
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, searchResults.totalPages) }, (_, i) => {
                  const page = i + 1
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                disabled={currentPage === searchResults.totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {searchResults && searchResults.items.length === 0 && !isLoading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search criteria or removing some filters
            </p>
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}
    </div>
  )
}
