import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { S3Service } from '@/lib/s3'
import { decodeHtmlEntities } from '@/lib/utils'

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'ampertalent-files'

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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')

    // Build where clause for jobs that need admin action
    const where: any = {
      OR: [
        // Featured jobs that are completed (for potential extensions)
        {
          isFeatured: true,
          featuredStatus: 'completed'
        },
        // Featured jobs that were added but then removed (for re-adding)
        {
          isFeatured: true,
          featuredStatus: 'not_started'
        },
        // Email blast jobs that haven't been sent yet
        {
          isEmailBlast: true,
          emailBlastStatus: 'not_started'
        },
        // Email blast jobs that are pending
        {
          isEmailBlast: true,
          emailBlastStatus: 'pending'
        }
      ]
    }

    if (search) {
      where.AND = [
        { OR: where.OR },
        {
          OR: [
            {
              title: {
                contains: search,
                mode: 'insensitive'
              }
            },
            {
              employer: {
                companyName: {
                  contains: search,
                  mode: 'insensitive'
                }
              }
            }
          ]
        }
      ]
      delete where.OR
    }

    if (status && status !== 'all') {
      // Map frontend status to database status
      let dbStatus = status
      if (status === 'not_added') {
        dbStatus = 'not_started'
      } else if (status === 'added_to_email') {
        dbStatus = 'completed'
      }
      where.featuredStatus = dbStatus
    }

    const jobs = await db.job.findMany({
      where,
      select: {
        id: true,
        title: true,
        category: true,
        payRangeText: true,
        locationText: true,
        createdAt: true,
        expiresAt: true,
        isFeatured: true,
        featuredStatus: true,
        featuredRequestedAt: true,
        featuredCompletedAt: true,
        featuredExtensionGranted: true,
        featuredExtensionExpiresAt: true,
        isEmailBlast: true,
        emailBlastStatus: true,
        emailBlastRequestedAt: true,
        emailBlastCompletedAt: true,
        emailBlastExpiresAt: true,
        isCompanyPrivate: true,
        legacyId: true,
        employer: {
          select: {
            userId: true,
            companyName: true,
            companyLogoUrl: true,
            user: {
              select: {
                name: true,
                email: true,
                profilePictureUrl: true
              }
            },
            packages: {
              where: {
                OR: [
                  { featuredListingsRemaining: { gt: 0 } },
                  { featuredListingsUsed: { gt: 0 } }
                ]
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                packageType: true,
                featuredListingsRemaining: true
              }
            }
          }
        }
      },
      orderBy: { featuredRequestedAt: 'desc' }
    })

    // Generate presigned URLs for profile pictures and company logos
    const requestsWithPresignedUrls = await Promise.all(
      jobs.map(async (job) => {
        const presignedProfileUrl = await generatePresignedProfileUrl(job.employer.user.profilePictureUrl)
        const presignedLogoUrl = await generatePresignedLogoUrl(job.employer.companyLogoUrl)

        // Determine the primary type and status for this job
        const isFeaturedPrimary = job.isFeatured
        const isEmailBlastPrimary = job.isEmailBlast && !job.isFeatured

        let status, requestedAt, completedAt, extensionGranted, extensionExpiresAt

        if (isFeaturedPrimary) {
          // Map database status to frontend status
          if (job.featuredStatus === 'not_started') {
            status = 'not_added'
          } else if (job.featuredStatus === 'completed') {
            status = 'added_to_email'
          } else {
            status = 'not_added' // fallback
          }

          requestedAt = job.featuredRequestedAt
          completedAt = job.featuredCompletedAt
          extensionGranted = job.featuredExtensionGranted
          extensionExpiresAt = job.featuredExtensionExpiresAt
        } else if (isEmailBlastPrimary) {
          // Map database status to frontend status for email blast
          if (job.emailBlastStatus === 'not_started') {
            status = 'not_added'
          } else if (job.emailBlastStatus === 'completed') {
            status = 'added_to_email'
          } else {
            status = 'not_added' // fallback
          }

          requestedAt = job.emailBlastRequestedAt
          completedAt = job.emailBlastCompletedAt
          extensionGranted = false
          extensionExpiresAt = null
        } else {
          // Fallback
          status = 'not_added'
          requestedAt = job.createdAt
          completedAt = null
          extensionGranted = false
          extensionExpiresAt = null
        }

        return {
          id: `job_${job.id}`, // Create a synthetic ID
          jobId: job.id,
          employerId: job.employer.userId,
          packageId: job.employer.packages[0]?.id || 'unknown',
          status: status,
          adminNotes: null, // We don't have admin notes in the Job model
          requestedAt: requestedAt?.toISOString() || job.createdAt.toISOString(),
          startedAt: status === 'pending' || status === 'completed' ? requestedAt?.toISOString() : null,
          completedAt: completedAt?.toISOString() || null,
          emailSentAt: job.emailBlastCompletedAt?.toISOString() || null,
          extensionGranted: extensionGranted,
          extensionExpiresAt: extensionExpiresAt?.toISOString() || null,
          // Add job type indicators
          isFeatured: job.isFeatured,
          isEmailBlast: job.isEmailBlast,
          // Transform data to match dashboard expectations
          job: {
            id: job.id,
            title: decodeHtmlEntities(job.title),
            category: job.category,
            payRangeText: job.payRangeText,
            locationText: job.locationText,
            createdAt: job.createdAt.toISOString(),
            expiresAt: job.expiresAt?.toISOString() || null,
            isCompanyPrivate: job.isCompanyPrivate,
            legacyId: job.legacyId ? String(job.legacyId) : null,
            employer: {
              companyName: job.employer.companyName,
              companyLogoUrl: presignedLogoUrl || job.employer.companyLogoUrl,
              user: {
                name: job.employer.user.name,
                email: job.employer.user.email,
                profilePictureUrl: presignedProfileUrl || job.employer.user.profilePictureUrl
              }
            }
          },
          employer: {
            companyName: job.employer.companyName,
            companyLogoUrl: presignedLogoUrl || job.employer.companyLogoUrl,
            user: {
              name: job.employer.user.name,
              email: job.employer.user.email,
              profilePictureUrl: presignedProfileUrl || job.employer.user.profilePictureUrl
            }
          },
          package: {
            packageType: job.employer.packages[0]?.packageType || (job.isFeatured ? 'featured' : 'email_blast'),
            featuredListingsRemaining: job.employer.packages[0]?.featuredListingsRemaining || 0
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      requests: requestsWithPresignedUrls
    })

  } catch (error) {
    console.error('Error fetching featured job requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}