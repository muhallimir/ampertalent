import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { S3Service } from '@/lib/s3'
import { decodeHtmlEntities } from '@/lib/utils'

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'hire-my-mom-files'

// Helper function to generate presigned URLs for company logos
async function generatePresignedLogoUrl(companyLogoUrl: string | null): Promise<string | null> {
  if (!companyLogoUrl || companyLogoUrl.trim() === '') {
    return null
  }

  try {
    // Extract S3 key from the full URL
    const url = new URL(companyLogoUrl)
    const s3Key = url.pathname.substring(1) // Remove leading slash

    // Generate presigned URL for download (valid for 1 hour)
    const presignedUrl = await S3Service.generatePresignedDownloadUrl(
      BUCKET_NAME,
      s3Key,
      3600 // 1 hour
    )

    return presignedUrl
  } catch (error) {
    console.error('Error generating presigned URL for company logo:', error)
    // Fall back to original URL if presigned URL generation fails
    return companyLogoUrl
  }
}

// Helper function to generate presigned URLs for profile pictures
async function generatePresignedProfileUrl(profilePictureUrl: string | null): Promise<string | null> {
  if (!profilePictureUrl || profilePictureUrl.trim() === '') {
    return null
  }

  try {
    // Extract S3 key from the full URL
    const url = new URL(profilePictureUrl)
    const s3Key = url.pathname.substring(1) // Remove leading slash

    // Generate presigned URL for download (valid for 1 hour)
    const presignedUrl = await S3Service.generatePresignedDownloadUrl(
      BUCKET_NAME,
      s3Key,
      3600 // 1 hour
    )

    return presignedUrl
  } catch (error) {
    console.error('Error generating presigned URL for profile picture:', error)
    // Fall back to original URL if presigned URL generation fails
    return profilePictureUrl
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an admin or super admin
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const packageType = searchParams.get('packageType')
    const employerType = searchParams.get('employerType')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { employer: { companyName: { contains: search, mode: 'insensitive' } } },
        { employer: { user: { name: { contains: search, mode: 'insensitive' } } } }
      ]
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (packageType && packageType !== 'all') {
      switch (packageType) {
        case 'featured':
          where.OR = [
            { isFeatured: true },
            { featuredJobRequests: { some: {} } }
          ]
          break
        case 'email_blast':
          where.OR = [
            { isEmailBlast: true },
            { emailBlastRequests: { some: {} } }
          ]
          break
        case 'concierge':
          where.OR = [
            { conciergeRequested: true },
            { conciergeStatus: { not: 'not_requested' } }
          ]
          break
        case 'standard':
          where.AND = [
            { isFeatured: false },
            { isEmailBlast: false },
            { conciergeRequested: false },
            { conciergeStatus: 'not_requested' },
            { featuredJobRequests: { none: {} } },
            { emailBlastRequests: { none: {} } }
          ]
          break
      }
    }

    if (employerType && employerType !== 'all') {
      if (employerType === 'vetted') {
        where.employer = { isVetted: true }
      } else if (employerType === 'not_vetted') {
        where.employer = { isVetted: false }
      }
    }

    // Get jobs with all related data
    const jobs = await db.job.findMany({
      where,
      include: {
        employer: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                profilePictureUrl: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        _count: {
          select: {
            applications: true
          }
        },
        applications: {
          select: {
            id: true,
            status: true,
            updatedAt: true
          },
          where: {
            status: 'hired'
          },
          take: 1 // We only need to know if there's at least one hire
        },
        featuredJobRequests: {
          select: {
            id: true,
            status: true,
            requestedAt: true
          },
          orderBy: { requestedAt: 'desc' }
        },
        emailBlastRequests: {
          select: {
            id: true,
            status: true,
            requestedAt: true,
            expiresAt: true
          },
          orderBy: { requestedAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    // Generate presigned URLs and calculate job status
    const jobsWithPresignedUrls = await Promise.all(
      jobs.map(async (job) => {
        const presignedProfileUrl = await generatePresignedProfileUrl(job.employer.user.profilePictureUrl)
        const presignedLogoUrl = await generatePresignedLogoUrl(job.employer.companyLogoUrl)

        // Calculate job status based on current state
        let jobStatus = 'Active'

        // Check if job is filled (has hired applications)
        const isFilled = job.applications && job.applications.length > 0

        // Check if job is expired
        const isExpired = job.expiresAt && new Date(job.expiresAt) < new Date()

        if (isFilled) {
          jobStatus = 'Filled'
        } else if (job.isPaused || job.status === 'paused') {
          jobStatus = 'Paused'
        } else if (isExpired || job.status === 'expired') {
          jobStatus = 'Expired'
        } else if (job.status === 'approved') {
          jobStatus = 'Active'
        } else if (job.status === 'pending_vetting') {
          jobStatus = 'Pending'
        } else if (job.status === 'rejected') {
          jobStatus = 'Rejected'
        } else if (job.status === 'draft') {
          jobStatus = 'Draft'
        }

        return {
          ...job,
          legacyId: job.legacyId ? String(job.legacyId) : null,
          title: decodeHtmlEntities(job.title),
          jobStatus, // Add calculated job status
          isFilled, // Add filled flag
          isExpired, // Add expired flag
          employer: {
            ...job.employer,
            companyLogoUrl: presignedLogoUrl || job.employer.companyLogoUrl,
            user: {
              ...job.employer.user,
              profilePictureUrl: presignedProfileUrl || job.employer.user.profilePictureUrl
            }
          },
          // Remove applications from response to keep it clean
          applications: undefined
        }
      })
    )

    // Get total count for pagination
    const totalCount = await db.job.count({ where })

    return NextResponse.json({
      success: true,
      jobs: jobsWithPresignedUrls,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    })

  } catch (error) {
    console.error('Error fetching job posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job posts' },
      { status: 500 }
    )
  }
}