import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { S3Service } from '@/lib/s3'
import { TalentCacheService } from '@/lib/redis'
import { PerformanceMonitor } from '@/lib/monitoring'

// Add relevance scoring functions
function calculateRelevanceScore(
  talentSkills: string[],
  talentCategory: string | null,
  activeJobPosts: Array<{
    skillsRequired: string[]
    category: string
  }>
): number {
  if (activeJobPosts.length === 0) return 0;

  let maxScore = 0;

  for (const job of activeJobPosts) {
    let jobScore = 0;

    // Category match bonus (30% weight)
    if (talentCategory && job.category === talentCategory) {
      jobScore += 0.3;
    }

    // Skills matching (70% weight)
    const jobSkills = job.skillsRequired || [];
    if (jobSkills.length > 0 && talentSkills.length > 0) {
      const matchingSkills = talentSkills.filter(talentSkill =>
        jobSkills.some(jobSkill =>
          jobSkill.toLowerCase().includes(talentSkill.toLowerCase()) ||
          talentSkill.toLowerCase().includes(jobSkill.toLowerCase())
        )
      );

      const skillMatchRatio = matchingSkills.length / Math.max(jobSkills.length, talentSkills.length);
      jobScore += skillMatchRatio * 0.7;
    }

    maxScore = Math.max(maxScore, jobScore);
  }

  return Math.min(maxScore, 1.0); // Cap at 1.0
}

function getMembershipTierWeight(membershipPlan: string): number {
  const weights = {
    'annual_platinum': 4,
    'vip_quarterly': 3,
    'gold_bimonthly': 2,
    'trial_monthly': 1,
    'none': 0
  };
  return weights[membershipPlan as keyof typeof weights] || 0;
}

export async function GET(request: NextRequest) {
  return PerformanceMonitor.trackApiCall('talent_search', async () => {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Employer talent API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    // Verify user is an employer or admin impersonating an employer
    if (currentUser.profile.role !== 'employer' && !(currentUser.isImpersonating && currentUser.profile.role === 'employer')) {
      console.log('🚫 EMPLOYER TALENT: Access denied', {
        userRole: currentUser.profile.role,
        isImpersonating: currentUser.isImpersonating,
        userId: currentUser.profile.id,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined
      })
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const skills = searchParams.get('skills')?.split(',').filter(Boolean) || []
    const availability = searchParams.get('availability') || ''
    const membershipPlan = searchParams.get('membershipPlan') || ''
    const hasResume = searchParams.get('hasResume') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 50) // Max 50 per page
    const cursor = searchParams.get('cursor') // For cursor-based pagination
    const sortBy = searchParams.get('sortBy') || 'updated_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Create cache key from search parameters
    const cacheParams = {
      search,
      skills: skills.sort(),
      availability,
      membershipPlan,
      hasResume,
      page,
      limit,
      cursor,
      sortBy,
      sortOrder,
    }

    // Try to get cached results first
    const cachedResults = await TalentCacheService.getCachedSearchResults(cacheParams)
    if (cachedResults) {
      await PerformanceMonitor.trackCacheOperation('hit', 'talent_search')
      return NextResponse.json({
        success: true,
        data: cachedResults.results,
        pagination: cachedResults.pagination,
        cached: true,
      })
    }

    await PerformanceMonitor.trackCacheOperation('miss', 'talent_search')

    // Fetch employer's active job posts for relevance scoring
    const activeJobPosts = await db.job.findMany({
      where: {
        employerId: currentUser.profile.employer?.userId,
        status: 'approved',
        expiresAt: {
          gt: new Date()
        }
      },
      select: {
        skillsRequired: true,
        category: true
      }
    });

    console.log('📊 TALENT API: Found active job posts for relevance:', activeJobPosts.length);

    // Build optimized where clause for filtering
    const whereClause: any = {
      isSuspended: false,
      profileVisibility: 'employers_only',
      // Require active subscription
      membershipPlan: {
        not: 'none'
      },
      membershipExpiresAt: {
        gt: new Date() // Must have non-expired subscription
      }
    }

    // Add cursor-based pagination based on the selected sort field
    if (cursor) {
      if (sortBy === 'updated_at') {
        whereClause.updatedAt = {
          [sortOrder === 'desc' ? 'lt' : 'gt']: new Date(cursor)
        }
      } else if (sortBy === 'created_at') {
        whereClause.user = {
          ...(whereClause.user || {}),
          createdAt: {
            [sortOrder === 'desc' ? 'lt' : 'gt']: new Date(cursor)
          }
        }
      } else if (sortBy === 'name') {
        whereClause.user = {
          ...(whereClause.user || {}),
          name: {
            [sortOrder === 'desc' ? 'lt' : 'gt']: cursor
          }
        }
      }
    }

    // Enhanced search functionality for fluid, case-insensitive search
    if (search) {
      const searchLower = search.toLowerCase().trim()

      // Enhanced skill search with multiple approaches
      try {
        // Method 1: Direct case-insensitive skill search using raw SQL
        const skillMatches = await db.$queryRaw<{ userId: string }[]>`
          SELECT DISTINCT "userId" FROM "job_seekers"
          WHERE EXISTS (
            SELECT 1 FROM unnest(skills) AS skill
            WHERE LOWER(skill) LIKE LOWER(${'%${searchLower}%'})
          )
          AND "isSuspended" = false
          AND "profileVisibility" = 'employers_only'
        `

        // Method 2: Also try exact skill matches with different cases
        const skillVariations = [
          search,
          searchLower,
          search.toUpperCase(),
          // Capitalize first letter
          search.charAt(0).toUpperCase() + search.slice(1).toLowerCase()
        ]

        // Add split terms for multi-word searches
        if (search.includes(' ')) {
          const splitTerms = search.split(' ').filter(term => term.length > 1)
          splitTerms.forEach(term => {
            skillVariations.push(
              term,
              term.toLowerCase(),
              term.toUpperCase(),
              term.charAt(0).toUpperCase() + term.slice(1).toLowerCase()
            )
          })
        }

        // Remove duplicates
        const uniqueSkillVariations = [...new Set(skillVariations)]

        // Build comprehensive search conditions
        const searchConditions: any[] = [
          // Search in user names (case-insensitive)
          {
            user: {
              name: {
                contains: search,
                mode: 'insensitive'
              }
            }
          },
          // Search in headlines (case-insensitive)
          {
            headline: {
              contains: search,
              mode: 'insensitive'
            }
          },
          // Search in about me (case-insensitive)
          {
            aboutMe: {
              contains: search,
              mode: 'insensitive'
            }
          },
          // Exact skill matches
          {
            skills: {
              hasSome: uniqueSkillVariations
            }
          }
        ]

        // Add skill matches from raw SQL if found
        if (skillMatches.length > 0) {
          const userIds = skillMatches.map(row => row.userId)
          searchConditions.push({
            userId: {
              in: userIds
            }
          })
        }

        whereClause.OR = searchConditions

      } catch (error) {
        console.error('❌ TALENT API: Error in enhanced skill search:', error)

        // Fallback: Basic search without raw SQL
        const basicSkillVariations = [
          search,
          search.toLowerCase(),
          search.toUpperCase(),
          search.charAt(0).toUpperCase() + search.slice(1).toLowerCase()
        ]

        whereClause.OR = [
          {
            user: {
              name: {
                contains: search,
                mode: 'insensitive'
              }
            }
          },
          {
            headline: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            aboutMe: {
              contains: search,
              mode: 'insensitive'
            }
          },
          {
            skills: {
              hasSome: basicSkillVariations
            }
          }
        ]
      }
    }

    // Add skills filter with optimized array operations
    if (skills.length > 0) {
      whereClause.skills = {
        hasSome: skills
      }
    }

    // Add availability filter
    if (availability) {
      whereClause.availability = {
        equals: availability
      }
    }

    // Add membership plan filter
    if (membershipPlan) {
      whereClause.membershipPlan = {
        equals: membershipPlan
      }
    }

    // Add resume filter - check for non-null and non-empty resumeUrl
    if (hasResume) {
      if (!whereClause.AND) {
        whereClause.AND = []
      }
      whereClause.AND.push(
        { resumeUrl: { not: null } },
        { resumeUrl: { not: '' } }
      )
      console.log('📊 TALENT API: Resume filter applied (checking resume_url field)')
    }

    console.log('📊 TALENT API: Final whereClause:', JSON.stringify(whereClause, null, 2))

    // Get cached count first
    let totalCount = await TalentCacheService.getCachedCount(cacheParams)

    if (totalCount === null) {
      // Get total count for pagination (only if not cached)
      totalCount = await PerformanceMonitor.trackDbQuery('talent_count', async () => {
        const count = await db.jobSeeker.count({
          where: whereClause
        })
        console.log('📊 TALENT API: Total count from DB:', count)
        return count
      })

      // Cache the count
      await TalentCacheService.cacheCount(cacheParams, totalCount)
    }

    // Build optimized query with proper ordering
    const orderBy: any = {}
    if (sortBy === 'updated_at') {
      orderBy.updatedAt = sortOrder
    } else if (sortBy === 'created_at') {
      orderBy.user = { createdAt: sortOrder }
    } else if (sortBy === 'name') {
      orderBy.user = { name: sortOrder }
    } else {
      orderBy.updatedAt = 'desc' // Default fallback
    }

    // Fetch job seekers with optimized query
    const jobSeekers = await PerformanceMonitor.trackDbQuery('talent_search', async () => {
      return db.jobSeeker.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
              profilePictureUrl: true,
              createdAt: true
            }
          }
        },
        skip: cursor ? 0 : (page - 1) * limit, // Skip offset when using cursor
        take: limit + 1, // Take one extra to determine if there are more results
        orderBy
      })
    })

    // Handle cursor pagination
    const hasMore = jobSeekers.length > limit
    const results = hasMore ? jobSeekers.slice(0, limit) : jobSeekers
    const nextCursor = hasMore && results.length > 0 ? (() => {
      if (sortBy === 'created_at') {
        return results[results.length - 1].user.createdAt.toISOString()
      } else if (sortBy === 'name') {
        return results[results.length - 1].user.name
      } else {
        // Default to updated_at
        return results[results.length - 1].updatedAt.toISOString()
      }
    })() : null

    // Check cache for profile pictures first
    const userIds = results.map((seeker: any) => seeker.userId)
    const cachedPictures = await TalentCacheService.getCachedProfilePictures(userIds)

    let presignedUrls: Record<string, string> = {}

    if (cachedPictures) {
      presignedUrls = cachedPictures
    } else {
      // Extract all profile picture URLs and their corresponding file keys
      const profilePictureKeys: string[] = []
      const seekerToKeyMap: Record<string, string> = {}

      results.forEach((seeker: any) => {
        if (seeker.user.profilePictureUrl) {
          try {
            const url = new URL(seeker.user.profilePictureUrl)
            const pathParts = url.pathname.split('/').filter(Boolean)
            const fileKey = pathParts.slice(-3).join('/') // Get avatars/userId/filename

            profilePictureKeys.push(fileKey)
            seekerToKeyMap[seeker.userId] = fileKey
          } catch (error) {
            console.error('Error parsing profile picture URL:', error)
          }
        }
      })

      // Generate presigned URLs in batch for better performance
      const batchPresignedUrls = profilePictureKeys.length > 0
        ? await S3Service.generateBatchPresignedDownloadUrls(
          process.env.AWS_S3_BUCKET || 'hire-my-mom-files',
          profilePictureKeys,
          24 * 60 * 60 // 24 hours
        )
        : {}

      // Map file keys back to user IDs
      Object.entries(seekerToKeyMap).forEach(([userId, fileKey]) => {
        if (batchPresignedUrls[fileKey]) {
          presignedUrls[userId] = batchPresignedUrls[fileKey]
        }
      })

      // Cache the profile pictures
      if (Object.keys(presignedUrls).length > 0) {
        await TalentCacheService.cacheProfilePictures(presignedUrls)
      }
    }

    // Get application status information for each seeker with this employer
    const seekerIds = results.map((seeker: any) => seeker.userId)
    const applicationStatuses = await db.application.findMany({
      where: {
        seeker: {
          userId: {
            in: seekerIds
          }
        },
        job: {
          employerId: currentUser.profile.employer?.userId
        }
      },
      select: {
        seeker: {
          select: {
            userId: true
          }
        },
        status: true,
        job: {
          select: {
            status: true,
            title: true
          }
        }
      },
      orderBy: {
        appliedAt: 'desc' // Get most recent application first
      }
    })

    // Create a map of seeker ID to their application status with this employer
    const seekerApplicationMap = new Map()
    applicationStatuses.forEach(app => {
      const seekerId = app.seeker.userId
      if (!seekerApplicationMap.has(seekerId)) {
        seekerApplicationMap.set(seekerId, {
          status: app.status,
          jobStatus: app.job.status,
          jobTitle: app.job.title
        })
      }
    })

    // Transform data for frontend with optimized profile pictures and application status
    const transformedData = results.map((seeker: any) => {
      let profilePictureUrl = seeker.user.profilePictureUrl

      // Use cached presigned URL if available
      if (presignedUrls[seeker.userId]) {
        profilePictureUrl = presignedUrls[seeker.userId]
      }

      // Get application status with this employer
      const seekerId = seeker.userId;
      const applicationInfo = seekerApplicationMap.get(seekerId)

      // Calculate relevance score
      const relevanceScore = calculateRelevanceScore(
        seeker.skills || [],
        seeker.category || null,
        activeJobPosts
      );

      // Calculate membership tier weight
      const membershipWeight = getMembershipTierWeight(seeker.membershipPlan);

      // Calculate final ranking score
      const rankingScore = (relevanceScore * 100) + (membershipWeight * 10);

      return {
        id: seeker.userId,
        name: seeker.user.name,
        firstName: seeker.user.firstName || null,
        lastName: seeker.user.lastName || null,
        headline: seeker.headline,
        aboutMe: seeker.aboutMe ? seeker.aboutMe.substring(0, 150) + (seeker.aboutMe.length > 150 ? '...' : '') : null,
        availability: seeker.availability,
        salaryExpectations: seeker.salaryExpectations,
        showSalaryExpectations: seeker.showSalaryExpectations,
        skills: seeker.skills.slice(0, 4), // Show first 4 skills
        profilePictureUrl,
        membershipPlan: seeker.membershipPlan,
        portfolioUrls: seeker.portfolioUrls,
        hasResume: !!seeker.resumeUrl,
        joinedAt: seeker.user.createdAt,
        updatedAt: seeker.updatedAt, // Include for cursor pagination
        // Application status with this employer
        applicationStatus: applicationInfo?.status || null,
        jobStatus: applicationInfo?.jobStatus || null,
        jobTitle: applicationInfo?.jobTitle || null,
        // New ranking fields
        relevanceScore,
        membershipWeight,
        rankingScore
      }
    })

    const totalPages = Math.ceil(totalCount / limit)

    const paginationData = {
      page,
      limit,
      totalCount,
      totalPages,
      hasNext: cursor ? hasMore : page < totalPages,
      hasPrev: cursor ? !!cursor : page > 1,
      nextCursor,
      sortBy,
      sortOrder
    }

    // Add debug logging
    console.log('📊 TALENT API: Ranking summary:', {
      totalTalents: transformedData.length,
      withRelevance: transformedData.filter(t => t.relevanceScore > 0).length,
      topRankingScores: transformedData.slice(0, 5).map(t => ({
        name: t.name,
        membershipPlan: t.membershipPlan,
        relevanceScore: t.relevanceScore,
        rankingScore: t.rankingScore
      }))
    });

    // Cache the results
    await TalentCacheService.cacheSearchResults(cacheParams, transformedData, paginationData)

    return NextResponse.json({
      success: true,
      data: transformedData,
      pagination: paginationData,
      cached: false,
    })
  })
}
