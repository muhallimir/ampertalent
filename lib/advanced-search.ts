import { db } from './db';
import { S3Service } from './s3';

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'hire-my-mom-files';

// Helper function to generate presigned URL for company logo
async function generatePresignedLogoUrl(companyLogoUrl: string | null): Promise<string | null> {
  if (!companyLogoUrl || companyLogoUrl.trim() === '') {
    return null;
  }

  try {
    // Extract S3 key from the full URL
    const url = new URL(companyLogoUrl);
    const s3Key = url.pathname.substring(1); // Remove leading slash

    // Generate presigned URL for download (valid for 1 hour)
    const presignedUrl = await S3Service.generatePresignedDownloadUrl(
      BUCKET_NAME,
      s3Key,
      3600 // 1 hour
    );

    return presignedUrl;
  } catch (error) {
    console.error('Error generating presigned URL for company logo:', error);
    // Fall back to original URL if presigned URL generation fails
    return companyLogoUrl;
  }
}

/**
 * Advanced Search Service
 * Provides sophisticated search and filtering capabilities for jobs
 */
export class AdvancedSearchService {
  /**
   * Search jobs with advanced filters and faceted search
   */
  static async searchJobs(params: {
    // Text search
    query?: string;

    // Basic filters
    category?: string;
    type?: string[];
    location?: string;

    // Pay range
    payMin?: number;
    payMax?: number;

    // Skills and requirements
    skills?: string[];
    skillsMatchType?: 'any' | 'all';

    // Company filters
    companySize?: string;
    industry?: string;

    // Job characteristics
    isRemote?: boolean;
    isFlexibleHours?: boolean;
    hoursPerWeekMin?: number;
    hoursPerWeekMax?: number;

    // Date filters
    postedSince?: Date;
    expiresAfter?: Date;

    // Availability filter
    availableOnly?: boolean;

    // Sorting
    sortBy?: 'relevance' | 'date' | 'pay' | 'company';
    sortOrder?: 'asc' | 'desc';

    // Pagination
    page?: number;
    limit?: number;

    // User context for personalization
    seekerId?: string;
  }): Promise<{
    jobs: Array<{
      id: string;
      title: string;
      category: string;
      type: string;
      payRangeMin: number | null;
      payRangeMax: number | null;
      payRangeText: string | null;
      description: string;
      skillsRequired: string[];
      isFlexibleHours: boolean;
      hoursPerWeek: number | null;
      locationText: string | null;
      createdAt: Date;
      expiresAt: Date | null;
      employer: {
        companyName: string;
        companyLogoUrl: string | null;
      };
      relevanceScore?: number;
      matchingSkills?: string[];
    }>;
    totalCount: number;
    facets: {
      categories: Array<{ name: string; count: number }>;
      types: Array<{ name: string; count: number }>;
      skills: Array<{ name: string; count: number }>;
      payRanges: Array<{ range: string; count: number }>;
      companies: Array<{ name: string; count: number }>;
    };
    suggestions?: string[];
  }> {
    try {
      const {
        query = '',
        category,
        type = [],
        location,
        payMin,
        payMax,
        skills = [],
        skillsMatchType = 'any',
        isRemote,
        isFlexibleHours,
        hoursPerWeekMin,
        hoursPerWeekMax,
        postedSince,
        expiresAfter,
        availableOnly = false,
        sortBy = 'relevance',
        sortOrder = 'desc',
        page = 1,
        limit = 20,
        seekerId
      } = params;

      // Build where clause with proper filters
      const whereClause: Record<string, unknown> = {
        status: 'approved',
        expiresAt: {
          gte: new Date()
        },
        // Filter out archived jobs for seekers
        isArchived: false,
        // Filter out paused jobs for seekers
        isPaused: false
      };
      // Text search
      if (query.trim()) {
        whereClause.OR = [
          {
            title: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            description: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            employer: {
              companyName: {
                contains: query,
                mode: 'insensitive'
              }
            }
          }
        ];
      }

      // Category filter
      if (category) {
        whereClause.category = category;
      }

      // Job type filter
      if (type.length > 0) {
        whereClause.type = {
          in: type
        };
      }

      // Location filter
      if (location) {
        whereClause.locationText = {
          contains: location,
          mode: 'insensitive'
        };
      }

      // Pay range filter
      if (payMin !== undefined || payMax !== undefined) {
        const andConditions = Array.isArray(whereClause.AND) ? whereClause.AND : [];

        if (payMin !== undefined) {
          andConditions.push({
            OR: [
              { payRangeMin: { gte: payMin } },
              { payRangeMax: { gte: payMin } }
            ]
          });
        }

        if (payMax !== undefined) {
          andConditions.push({
            OR: [
              { payRangeMax: { lte: payMax } },
              { payRangeMin: { lte: payMax } }
            ]
          });
        }

        whereClause.AND = andConditions;
      }

      // Skills filter
      if (skills.length > 0) {
        if (skillsMatchType === 'all') {
          const andConditions = Array.isArray(whereClause.AND) ? whereClause.AND : [];
          skills.forEach((skill: string) => {
            andConditions.push({
              skillsRequired: {
                has: skill
              }
            });
          });
          whereClause.AND = andConditions;
        } else {
          whereClause.skillsRequired = {
            hasSome: skills
          };
        }
      }

      // Remote work filter
      if (isRemote !== undefined) {
        if (isRemote) {
          const orConditions = Array.isArray(whereClause.OR) ? whereClause.OR : [];
          orConditions.push(
            { locationText: { contains: 'remote', mode: 'insensitive' } },
            { locationText: { contains: 'anywhere', mode: 'insensitive' } },
            { locationText: null }
          );
          whereClause.OR = orConditions;
        }
      }

      // Flexible hours filter
      if (isFlexibleHours !== undefined) {
        whereClause.isFlexibleHours = isFlexibleHours;
      }

      // Hours per week filter
      if (hoursPerWeekMin !== undefined || hoursPerWeekMax !== undefined) {
        const andConditions = Array.isArray(whereClause.AND) ? whereClause.AND : [];

        if (hoursPerWeekMin !== undefined) {
          andConditions.push({
            hoursPerWeek: { gte: hoursPerWeekMin }
          });
        }

        if (hoursPerWeekMax !== undefined) {
          andConditions.push({
            hoursPerWeek: { lte: hoursPerWeekMax }
          });
        }

        whereClause.AND = andConditions;
      }

      // Date filters
      if (postedSince) {
        whereClause.createdAt = { gte: postedSince };
      }

      if (expiresAfter) {
        whereClause.expiresAt = { gte: expiresAfter };
      }

      // Filter out filled jobs if availableOnly is true
      if (availableOnly) {
        whereClause.applications = {
          none: {
            status: 'hired'
          }
        };
      }

      // Build order by clause
      let orderBy: Record<string, unknown>[] = [];

      switch (sortBy) {
        case 'date':
          orderBy = [{ createdAt: sortOrder }];
          break;
        case 'pay':
          orderBy = [
            { payRangeMax: sortOrder },
            { payRangeMin: sortOrder }
          ];
          break;
        case 'company':
          orderBy = [{ employer: { companyName: sortOrder } }];
          break;
        default: // relevance
          orderBy = [
            { createdAt: 'desc' }, // Recent jobs first for relevance
            { id: 'desc' }
          ];
      }

      // Use undefined if whereClause is empty, otherwise use the whereClause
      const finalWhereClause = Object.keys(whereClause).length === 0 ? undefined : whereClause;

      const [jobs, totalCount] = await Promise.all([
        db.job.findMany({
          where: finalWhereClause,
          select: {
            id: true,
            title: true,
            category: true,
            type: true,
            payRangeMin: true,
            payRangeMax: true,
            payRangeText: true,
            description: true,
            skillsRequired: true,
            isFlexibleHours: true,
            hoursPerWeek: true,
            locationText: true,
            createdAt: true,
            expiresAt: true,
            employerId: true,
            isCompanyPrivate: true, // Critical field for privacy functionality
            employer: {
              select: {
                companyName: true,
                companyLogoUrl: true
              }
            },
            applications: seekerId ? {
              where: {
                OR: [
                  { seekerId: seekerId },
                  { status: 'hired' }
                ]
              },
              select: {
                status: true,
                appliedAt: true,
                seekerId: true
              },
              take: 10 // Limit to reduce data transfer
            } : {
              where: {
                status: 'hired'
              },
              select: {
                status: true
              },
              take: 1 // Only need to know if any hired exists
            }
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit
        }),
        db.job.count({ where: finalWhereClause })
      ]);

      // Batch generate presigned URLs for all logos (more efficient)
      const uniqueLogoUrls = new Map<string, string | null>();
      const urlsToGenerate = new Set<string>();

      jobs.forEach((job: any) => {
        const employer = job.employer as { companyName: string; companyLogoUrl: string | null };
        const isCompanyPrivate = job.isCompanyPrivate || false;
        if (!isCompanyPrivate && employer.companyLogoUrl && employer.companyLogoUrl.trim() !== '') {
          urlsToGenerate.add(employer.companyLogoUrl);
        }
      });

      // Generate all presigned URLs in parallel
      const presignedUrlPromises = Array.from(urlsToGenerate).map(async (url) => {
        const presignedUrl = await generatePresignedLogoUrl(url);
        uniqueLogoUrls.set(url, presignedUrl);
      });

      await Promise.all(presignedUrlPromises);

      // Calculate relevance scores and matching skills
      const enhancedJobs = jobs.map((job: any) => {
        const relevanceScore = AdvancedSearchService.calculateRelevanceScore(job, query, skills);
        const matchingSkills = skills.filter(skill =>
          (job.skillsRequired as string[]).some((jobSkill: string) =>
            jobSkill.toLowerCase().includes(skill.toLowerCase())
          )
        );

        // Flatten employer data for frontend compatibility
        const employer = job.employer as { companyName: string; companyLogoUrl: string | null };

        // Check if company information should be private
        const isCompanyPrivate = job.isCompanyPrivate || false;

        // Get presigned URL from cache
        const presignedLogoUrl = isCompanyPrivate ? null :
          (employer.companyLogoUrl ? uniqueLogoUrls.get(employer.companyLogoUrl) || employer.companyLogoUrl : null);

        // Get application status if user is logged in
        const userApplication = seekerId ? job.applications?.find((app: any) => app.seekerId === seekerId) : null
        const applicationStatus = userApplication ? {
          hasApplied: true,
          status: userApplication.status,
          appliedAt: userApplication.appliedAt.toISOString()
        } : {
          hasApplied: false
        }

        // Check if job is filled by looking for hired applications
        const isFilled = job.applications && job.applications.some((app: any) => app.status === 'hired')

        // Apply privacy settings to company information
        const displayCompanyName = isCompanyPrivate ? 'Private Company' : employer.companyName;
        const displayCompanyLogoUrl = isCompanyPrivate ? null : presignedLogoUrl;

        return {
          id: job.id,
          title: job.title,
          category: job.category,
          type: job.type as string,
          payRangeMin: job.payRangeMin ? Number(job.payRangeMin) : null,
          payRangeMax: job.payRangeMax ? Number(job.payRangeMax) : null,
          payRangeText: job.payRangeText,
          description: job.description,
          skillsRequired: job.skillsRequired,
          isFlexibleHours: job.isFlexibleHours,
          hoursPerWeek: job.hoursPerWeek,
          locationText: job.locationText,
          createdAt: job.createdAt,
          expiresAt: job.expiresAt,
          companyName: displayCompanyName,
          companyLogoUrl: displayCompanyLogoUrl,
          relevanceScore,
          matchingSkills,
          employerId: job.employerId, // Add employer ID for admin context
          applicationStatus, // Add application status
          isFilled, // Add filled status
          employer: {
            companyName: displayCompanyName,
            companyLogoUrl: displayCompanyLogoUrl
          }
        };
      });

      // Generate facets and suggestions in parallel (optional - can be skipped for faster responses)
      const [facets, suggestions] = await Promise.all([
        // Skip facets if we have enough data already
        page === 1 ? AdvancedSearchService.generateFacets(whereClause) : Promise.resolve({
          categories: [],
          types: [],
          skills: [],
          payRanges: [],
          companies: []
        }),
        // Skip suggestions if query is too short
        query && query.length >= 3 ? AdvancedSearchService.generateSuggestions(query) : Promise.resolve([])
      ]);

      return {
        jobs: enhancedJobs,
        totalCount,
        facets,
        suggestions
      };
    } catch (error) {
      console.error('Error in advanced search:', error);
      throw new Error('Search failed');
    }
  }

  /**
   * Calculate relevance score for a job
   */
  private static calculateRelevanceScore(
    job: Record<string, unknown>,
    query: string,
    skills: string[]
  ): number {
    let score = 0;

    // Text relevance (40% of score)
    if (query.trim()) {
      const queryLower = query.toLowerCase();
      const titleMatch = (job.title as string).toLowerCase().includes(queryLower);
      const descriptionMatch = (job.description as string).toLowerCase().includes(queryLower);
      const companyMatch = ((job.employer as Record<string, unknown>).companyName as string).toLowerCase().includes(queryLower);

      if (titleMatch) score += 20;
      if (descriptionMatch) score += 15;
      if (companyMatch) score += 5;
    }

    // Skills matching (30% of score)
    if (skills.length > 0) {
      const matchingSkills = skills.filter(skill =>
        (job.skillsRequired as string[]).some((jobSkill: string) =>
          jobSkill.toLowerCase().includes(skill.toLowerCase())
        )
      );
      score += (matchingSkills.length / skills.length) * 30;
    }

    // Recency (20% of score)
    const daysSincePosted = Math.floor(
      (Date.now() - new Date(job.createdAt as Date).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSincePosted <= 7) score += 20;
    else if (daysSincePosted <= 30) score += 10;
    else if (daysSincePosted <= 60) score += 5;

    // Job completeness (10% of score)
    let completenessScore = 0;
    if (job.payRangeMin || job.payRangeMax || job.payRangeText) completenessScore += 3;
    if ((job.skillsRequired as string[]).length > 0) completenessScore += 3;
    if (job.hoursPerWeek) completenessScore += 2;
    if (job.locationText) completenessScore += 2;
    score += completenessScore;

    return Math.min(Math.round(score), 100);
  }

  /**
   * Generate facets for search results
   */
  private static async generateFacets(baseWhere: Record<string, unknown>) {
    try {
      // Get facet counts
      const [categoryFacets, typeFacets, skillsFacets, payRangeData, companyFacets] = await Promise.all([
        // Categories
        db.job.groupBy({
          by: ['category'],
          where: baseWhere,
          _count: true,
          orderBy: { _count: { category: 'desc' } },
          take: 10
        }),

        // Job types
        db.job.groupBy({
          by: ['type'],
          where: baseWhere,
          _count: true,
          orderBy: { _count: { type: 'desc' } }
        }),

        // Top skills (simplified - would need more complex aggregation for array fields)
        db.job.findMany({
          where: baseWhere,
          select: { skillsRequired: true },
          take: 1000
        }),

        // Pay ranges (simplified)
        db.job.findMany({
          where: {
            ...baseWhere,
            OR: [
              { payRangeMin: { not: null } },
              { payRangeMax: { not: null } }
            ]
          },
          select: { payRangeMin: true, payRangeMax: true },
          take: 1000
        }),

        // Companies
        db.job.groupBy({
          by: ['employerId'],
          where: baseWhere,
          _count: true,
          orderBy: { _count: { employerId: 'desc' } },
          take: 10
        })
      ]);

      // Process skills facets
      const skillsMap = new Map<string, number>();
      skillsFacets.forEach((job: Record<string, unknown>) => {
        (job.skillsRequired as string[]).forEach((skill: string) => {
          skillsMap.set(skill, (skillsMap.get(skill) || 0) + 1);
        });
      });
      const topSkills = Array.from(skillsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([name, count]) => ({ name, count }));

      // Process pay range facets
      const payRanges = [
        { range: '$0 - $25k', min: 0, max: 25000 },
        { range: '$25k - $50k', min: 25000, max: 50000 },
        { range: '$50k - $75k', min: 50000, max: 75000 },
        { range: '$75k - $100k', min: 75000, max: 100000 },
        { range: '$100k+', min: 100000, max: Infinity }
      ];

      const payRangeFacets = payRanges.map((range: { range: string; min: number; max: number }) => ({
        range: range.range,
        count: payRangeData.filter((job: Record<string, unknown>) => {
          const min = job.payRangeMin ? Number(job.payRangeMin) : 0;
          const max = job.payRangeMax ? Number(job.payRangeMax) : min;
          return (min >= range.min && min < range.max) ||
            (max >= range.min && max < range.max);
        }).length
      }));

      // Get company names for company facets
      const companyIds = companyFacets.map((c: Record<string, unknown>) => c.employerId as string);
      const companies = await db.employer.findMany({
        where: { userId: { in: companyIds } },
        select: { userId: true, companyName: true }
      });

      const companyFacetsWithNames = companyFacets.map((facet: Record<string, unknown>) => {
        const company = companies.find((c: Record<string, unknown>) => c.userId === facet.employerId);
        return {
          name: company?.companyName || 'Unknown Company',
          count: facet._count as number
        };
      });

      return {
        categories: categoryFacets.map((f: Record<string, unknown>) => ({ name: f.category as string, count: f._count as number })),
        types: typeFacets.map((f: Record<string, unknown>) => ({ name: f.type as string, count: f._count as number })),
        skills: topSkills,
        payRanges: payRangeFacets,
        companies: companyFacetsWithNames
      };
    } catch (error) {
      console.error('Error generating facets:', error);
      return {
        categories: [],
        types: [],
        skills: [],
        payRanges: [],
        companies: []
      };
    }
  }

  /**
   * Generate search suggestions based on query
   */
  private static async generateSuggestions(query: string): Promise<string[]> {
    try {
      const suggestions: string[] = [];

      // Get job titles that match the query
      const titleMatches = await db.job.findMany({
        where: {
          title: {
            contains: query,
            mode: 'insensitive'
          },
          status: 'approved'
        },
        select: { title: true },
        distinct: ['title'],
        take: 5
      });

      suggestions.push(...titleMatches.map((job: Record<string, unknown>) => job.title as string));

      // Get company names that match
      const companyMatches = await db.employer.findMany({
        where: {
          companyName: {
            contains: query,
            mode: 'insensitive'
          }
        },
        select: { companyName: true },
        take: 3
      });

      suggestions.push(...companyMatches.map((company: Record<string, unknown>) => company.companyName as string));

      // Get skills that match
      const skillMatches = await db.job.findMany({
        where: {
          skillsRequired: {
            hasSome: [query]
          },
          status: 'approved'
        },
        select: { skillsRequired: true },
        take: 100
      });

      const matchingSkills = new Set<string>();
      skillMatches.forEach((job: Record<string, unknown>) => {
        (job.skillsRequired as string[]).forEach((skill: string) => {
          if (skill.toLowerCase().includes(query.toLowerCase())) {
            matchingSkills.add(skill);
          }
        });
      });

      suggestions.push(...Array.from(matchingSkills).slice(0, 5));

      return [...new Set(suggestions)].slice(0, 8);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return [];
    }
  }

  /**
   * Get popular search terms
   */
  static async getPopularSearchTerms(): Promise<string[]> {
    try {
      // In a real implementation, you'd track search queries
      // For now, return common job-related terms
      return [
        'React Developer',
        'Marketing Manager',
        'Customer Service',
        'Data Analyst',
        'Content Writer',
        'Virtual Assistant',
        'Project Manager',
        'Graphic Designer'
      ];
    } catch (error) {
      console.error('Error getting popular search terms:', error);
      return [];
    }
  }

  /**
   * Get recommended jobs for a seeker
   */
  static async getRecommendedJobs(seekerId: string, limit: number = 10) {
    try {
      const seeker = await db.jobSeeker.findUnique({
        where: { userId: seekerId },
        select: { skills: true }
      });

      if (!seeker || !seeker.skills.length) {
        // Return recent jobs if no skills
        return AdvancedSearchService.searchJobs({
          sortBy: 'date',
          limit
        });
      }

      // Search for jobs matching seeker's skills
      return AdvancedSearchService.searchJobs({
        skills: seeker.skills,
        skillsMatchType: 'any',
        sortBy: 'relevance',
        limit,
        seekerId
      });
    } catch (error) {
      console.error('Error getting recommended jobs:', error);
      return {
        jobs: [],
        totalCount: 0,
        facets: {
          categories: [],
          types: [],
          skills: [],
          payRanges: [],
          companies: []
        }
      };
    }
  }
}

// Export singleton instance
export const advancedSearch = AdvancedSearchService;

// Export the main search function for direct use
export const searchJobs = AdvancedSearchService.searchJobs;