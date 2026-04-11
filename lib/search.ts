// Advanced search and filtering system for the platform

export interface SearchFilters {
  keywords?: string
  category?: string
  jobType?: 'full-time' | 'part-time' | 'project'
  payRange?: {
    min: number
    max: number
  }
  location?: string
  skills?: string[]
  experience?: 'entry' | 'mid' | 'senior'
  remote?: boolean
  flexibleHours?: boolean
  datePosted?: 'today' | 'week' | 'month' | 'all'
  sortBy?: 'relevance' | 'date' | 'salary' | 'applications'
  sortOrder?: 'asc' | 'desc'
}

export interface SeekerFilters {
  skills?: string[]
  experience?: 'entry' | 'mid' | 'senior'
  availability?: 'full-time' | 'part-time' | 'flexible'
  location?: string
  subscriptionPlan?: 'free' | 'basic' | 'premium' | 'pro'
  joinedDate?: 'week' | 'month' | 'quarter' | 'year'
  lastActive?: 'today' | 'week' | 'month'
  sortBy?: 'relevance' | 'experience' | 'activity' | 'rating'
}

export interface SearchResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  filters: SearchFilters | SeekerFilters
  suggestions?: string[]
  facets?: SearchFacets
}

export interface SearchFacets {
  categories: Array<{ name: string; count: number }>
  skills: Array<{ name: string; count: number }>
  locations: Array<{ name: string; count: number }>
  payRanges: Array<{ range: string; count: number }>
  jobTypes: Array<{ name: string; count: number }>
}

export interface JobSearchItem {
  id: string
  title: string
  company: string
  category: string
  type: 'full-time' | 'part-time' | 'project'
  payRange?: {
    min: number
    max: number
    text: string
  }
  salaryType?: string
  location: string
  description: string
  skills: string[]
  postedDate: string
  expiresAt?: string
  applicationCount: number
  isRemote: boolean
  isFlexible: boolean
  isFeatured: boolean
  relevanceScore?: number
}

export interface SeekerSearchItem {
  id: string
  name: string
  headline: string
  skills: string[]
  experience: string
  availability: string
  location: string
  profileCompleteness: number
  lastActive: string
  subscriptionPlan: string
  rating?: number
  relevanceScore?: number
}

/**
 * Advanced search service with filtering, sorting, and faceted search
 */
export class SearchService {
  /**
   * Search jobs with advanced filtering and faceted results
   */
  static async searchJobs(
    filters: SearchFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<SearchResult<JobSearchItem>> {
    try {
      console.log('Searching jobs with filters:', filters)

      // In a real implementation, this would query the database with proper indexing
      // For now, return mock data that demonstrates the search functionality

      const mockJobs: JobSearchItem[] = [
        {
          id: 'job_1',
          title: 'Virtual Assistant - Customer Support',
          company: 'TechStart Inc.',
          category: 'Virtual Assistant',
          type: 'part-time',
          payRange: { min: 15, max: 20, text: '$15-20/hour' },
          location: 'Remote',
          description: 'Looking for a detail-oriented virtual assistant to handle customer inquiries and support tasks.',
          skills: ['Customer Service', 'Email Management', 'Data Entry'],
          postedDate: '2024-01-15T00:00:00Z',
          applicationCount: 23,
          isRemote: true,
          isFlexible: true,
          isFeatured: false,
          relevanceScore: 0.95
        },
        {
          id: 'job_2',
          title: 'Content Writer - Blog & Social Media',
          company: 'Digital Marketing Co.',
          category: 'Content Writing',
          type: 'project',
          payRange: { min: 25, max: 35, text: '$25-35/hour' },
          location: 'Remote',
          description: 'Seeking a creative content writer for blog posts and social media content.',
          skills: ['Content Writing', 'SEO', 'Social Media'],
          postedDate: '2024-01-14T00:00:00Z',
          applicationCount: 18,
          isRemote: true,
          isFlexible: true,
          isFeatured: true,
          relevanceScore: 0.88
        },
        {
          id: 'job_3',
          title: 'Data Entry Specialist',
          company: 'Business Solutions LLC',
          category: 'Data Entry',
          type: 'full-time',
          payRange: { min: 18, max: 22, text: '$18-22/hour' },
          location: 'Remote',
          description: 'Full-time data entry position with flexible hours and growth opportunities.',
          skills: ['Data Entry', 'Excel', 'Attention to Detail'],
          postedDate: '2024-01-13T00:00:00Z',
          applicationCount: 31,
          isRemote: true,
          isFlexible: false,
          isFeatured: false,
          relevanceScore: 0.82
        }
      ]

      // Apply filters
      let filteredJobs = mockJobs

      if (filters.keywords) {
        const keywords = filters.keywords.toLowerCase()
        filteredJobs = filteredJobs.filter(job => 
          job.title.toLowerCase().includes(keywords) ||
          job.description.toLowerCase().includes(keywords) ||
          job.skills.some(skill => skill.toLowerCase().includes(keywords))
        )
      }

      if (filters.category) {
        filteredJobs = filteredJobs.filter(job => job.category === filters.category)
      }

      if (filters.jobType) {
        filteredJobs = filteredJobs.filter(job => job.type === filters.jobType)
      }

      if (filters.payRange) {
        filteredJobs = filteredJobs.filter(job => {
          if (!job.payRange) return false
          return job.payRange.min >= filters.payRange!.min && 
                 job.payRange.max <= filters.payRange!.max
        })
      }

      if (filters.skills && filters.skills.length > 0) {
        filteredJobs = filteredJobs.filter(job =>
          filters.skills!.some(skill => 
            job.skills.some(jobSkill => 
              jobSkill.toLowerCase().includes(skill.toLowerCase())
            )
          )
        )
      }

      if (filters.remote !== undefined) {
        filteredJobs = filteredJobs.filter(job => job.isRemote === filters.remote)
      }

      if (filters.flexibleHours !== undefined) {
        filteredJobs = filteredJobs.filter(job => job.isFlexible === filters.flexibleHours)
      }

      // Apply sorting
      if (filters.sortBy) {
        filteredJobs.sort((a, b) => {
          let comparison = 0
          
          switch (filters.sortBy) {
            case 'relevance':
              comparison = (b.relevanceScore || 0) - (a.relevanceScore || 0)
              break
            case 'date':
              comparison = new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()
              break
            case 'salary':
              const aMax = a.payRange?.max || 0
              const bMax = b.payRange?.max || 0
              comparison = bMax - aMax
              break
            case 'applications':
              comparison = b.applicationCount - a.applicationCount
              break
          }
          
          return filters.sortOrder === 'asc' ? -comparison : comparison
        })
      }

      // Pagination
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      const paginatedJobs = filteredJobs.slice(startIndex, endIndex)

      // Generate facets
      const facets = this.generateJobFacets(mockJobs)

      // Generate search suggestions
      const suggestions = this.generateSearchSuggestions(filters.keywords || '', 'jobs')

      return {
        items: paginatedJobs,
        totalCount: filteredJobs.length,
        page,
        pageSize,
        totalPages: Math.ceil(filteredJobs.length / pageSize),
        filters,
        suggestions,
        facets
      }
    } catch (error) {
      console.error('Error searching jobs:', error)
      throw new Error('Failed to search jobs')
    }
  }

  /**
   * Search job seekers with advanced filtering
   */
  static async searchSeekers(
    filters: SeekerFilters,
    page: number = 1,
    pageSize: number = 20
  ): Promise<SearchResult<SeekerSearchItem>> {
    try {
      console.log('Searching seekers with filters:', filters)

      const mockSeekers: SeekerSearchItem[] = [
        {
          id: 'seeker_1',
          name: 'Sarah Johnson',
          headline: 'Experienced Virtual Assistant & Customer Service Specialist',
          skills: ['Customer Service', 'Virtual Assistant', 'Email Management', 'Data Entry'],
          experience: 'mid',
          availability: 'part-time',
          location: 'Remote',
          profileCompleteness: 95,
          lastActive: '2024-01-15T00:00:00Z',
          subscriptionPlan: 'premium',
          rating: 4.8,
          relevanceScore: 0.92
        },
        {
          id: 'seeker_2',
          name: 'Maria Rodriguez',
          headline: 'Creative Content Writer & Social Media Manager',
          skills: ['Content Writing', 'Social Media', 'SEO', 'Copywriting'],
          experience: 'senior',
          availability: 'flexible',
          location: 'Remote',
          profileCompleteness: 88,
          lastActive: '2024-01-14T00:00:00Z',
          subscriptionPlan: 'pro',
          rating: 4.9,
          relevanceScore: 0.89
        },
        {
          id: 'seeker_3',
          name: 'Jennifer Chen',
          headline: 'Detail-Oriented Data Entry & Administrative Support',
          skills: ['Data Entry', 'Excel', 'Administrative Support', 'Organization'],
          experience: 'entry',
          availability: 'full-time',
          location: 'Remote',
          profileCompleteness: 78,
          lastActive: '2024-01-13T00:00:00Z',
          subscriptionPlan: 'basic',
          rating: 4.6,
          relevanceScore: 0.85
        }
      ]

      // Apply filters (similar to job search)
      let filteredSeekers = mockSeekers

      if (filters.skills && filters.skills.length > 0) {
        filteredSeekers = filteredSeekers.filter(seeker =>
          filters.skills!.some(skill => 
            seeker.skills.some(seekerSkill => 
              seekerSkill.toLowerCase().includes(skill.toLowerCase())
            )
          )
        )
      }

      if (filters.experience) {
        filteredSeekers = filteredSeekers.filter(seeker => seeker.experience === filters.experience)
      }

      if (filters.availability) {
        filteredSeekers = filteredSeekers.filter(seeker => seeker.availability === filters.availability)
      }

      if (filters.subscriptionPlan) {
        filteredSeekers = filteredSeekers.filter(seeker => seeker.subscriptionPlan === filters.subscriptionPlan)
      }

      // Apply sorting
      if (filters.sortBy) {
        filteredSeekers.sort((a, b) => {
          switch (filters.sortBy) {
            case 'relevance':
              return (b.relevanceScore || 0) - (a.relevanceScore || 0)
            case 'experience':
              const expOrder = { 'entry': 1, 'mid': 2, 'senior': 3 }
              return expOrder[b.experience as keyof typeof expOrder] - expOrder[a.experience as keyof typeof expOrder]
            case 'activity':
              return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
            case 'rating':
              return (b.rating || 0) - (a.rating || 0)
            default:
              return 0
          }
        })
      }

      // Pagination
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      const paginatedSeekers = filteredSeekers.slice(startIndex, endIndex)

      return {
        items: paginatedSeekers,
        totalCount: filteredSeekers.length,
        page,
        pageSize,
        totalPages: Math.ceil(filteredSeekers.length / pageSize),
        filters
      }
    } catch (error) {
      console.error('Error searching seekers:', error)
      throw new Error('Failed to search seekers')
    }
  }

  /**
   * Get search suggestions based on query
   */
  static generateSearchSuggestions(query: string, type: 'jobs' | 'seekers'): string[] {
    const jobSuggestions = [
      'virtual assistant',
      'customer service',
      'content writing',
      'data entry',
      'social media',
      'email management',
      'administrative support',
      'bookkeeping',
      'graphic design',
      'project management'
    ]

    const seekerSuggestions = [
      'experienced virtual assistant',
      'customer service specialist',
      'content writer',
      'data entry expert',
      'social media manager',
      'administrative professional',
      'bookkeeper',
      'graphic designer',
      'project coordinator'
    ]

    const suggestions = type === 'jobs' ? jobSuggestions : seekerSuggestions
    
    if (!query) return suggestions.slice(0, 5)

    return suggestions
      .filter(suggestion => suggestion.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
  }

  /**
   * Generate facets for job search results
   */
  private static generateJobFacets(jobs: JobSearchItem[]): SearchFacets {
    const categories = this.generateFacetCounts(jobs, 'category')
    const skills = this.generateSkillFacets(jobs)
    const locations = this.generateFacetCounts(jobs, 'location')
    const jobTypes = this.generateFacetCounts(jobs, 'type')
    
    const payRanges = [
      { range: '$10-15/hour', count: jobs.filter(j => j.payRange && j.payRange.max <= 15).length },
      { range: '$15-25/hour', count: jobs.filter(j => j.payRange && j.payRange.min >= 15 && j.payRange.max <= 25).length },
      { range: '$25-35/hour', count: jobs.filter(j => j.payRange && j.payRange.min >= 25 && j.payRange.max <= 35).length },
      { range: '$35+/hour', count: jobs.filter(j => j.payRange && j.payRange.min >= 35).length }
    ]

    return {
      categories,
      skills,
      locations,
      payRanges,
      jobTypes
    }
  }

  /**
   * Generate facet counts for a specific field
   */
  private static generateFacetCounts(items: JobSearchItem[], field: keyof JobSearchItem): Array<{ name: string; count: number }> {
    const counts: Record<string, number> = {}
    
    items.forEach(item => {
      const value = item[field]
      if (value && typeof value === 'string') {
        counts[value] = (counts[value] || 0) + 1
      }
    })

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }

  /**
   * Generate skill facets from job skills arrays
   */
  private static generateSkillFacets(jobs: JobSearchItem[]): Array<{ name: string; count: number }> {
    const skillCounts: Record<string, number> = {}
    
    jobs.forEach(job => {
      job.skills.forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1
      })
    })

    return Object.entries(skillCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20) // Top 20 skills
  }

  /**
   * Save search query for analytics
   */
  static async saveSearchQuery(
    query: string,
    filters: SearchFilters | SeekerFilters,
    resultCount: number,
    userId?: string
  ): Promise<void> {
    try {
      console.log('Saving search query:', { query, filters, resultCount, userId })
      
      // In a real implementation, this would save to database for analytics
      // This data can be used to improve search relevance and understand user behavior
    } catch (error) {
      console.error('Error saving search query:', error)
    }
  }

  /**
   * Get popular search terms
   */
  static async getPopularSearchTerms(type: 'jobs' | 'seekers', limit: number = 10): Promise<string[]> {
    // Mock popular search terms
    const jobTerms = [
      'virtual assistant',
      'customer service',
      'data entry',
      'content writing',
      'social media',
      'administrative',
      'bookkeeping',
      'email management',
      'project management',
      'graphic design'
    ]

    const seekerTerms = [
      'experienced',
      'reliable',
      'detail-oriented',
      'customer service',
      'virtual assistant',
      'content writer',
      'data entry',
      'administrative',
      'social media',
      'organized'
    ]

    return (type === 'jobs' ? jobTerms : seekerTerms).slice(0, limit)
  }

  /**
   * Get search analytics
   */
  static async getSearchAnalytics(): Promise<{
    totalSearches: number
    topQueries: Array<{ query: string; count: number }>
    noResultQueries: Array<{ query: string; count: number }>
    averageResultsPerSearch: number
  }> {
    // Mock search analytics
    return {
      totalSearches: 1247,
      topQueries: [
        { query: 'virtual assistant', count: 156 },
        { query: 'customer service', count: 134 },
        { query: 'data entry', count: 98 },
        { query: 'content writing', count: 87 },
        { query: 'social media', count: 76 }
      ],
      noResultQueries: [
        { query: 'blockchain developer', count: 12 },
        { query: 'machine learning', count: 8 },
        { query: 'mobile app developer', count: 6 }
      ],
      averageResultsPerSearch: 8.3
    }
  }
}