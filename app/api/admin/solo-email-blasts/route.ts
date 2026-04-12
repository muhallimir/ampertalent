import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { S3Service } from '@/lib/s3'

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
    const expiring = searchParams.get('expiring')

    // Build where clause
    const where: any = {}

    if (search) {
      where.OR = [
        {
          job: {
            title: {
              contains: search,
              mode: 'insensitive'
            }
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

    if (status && status !== 'all') {
      where.status = status
    }

    if (expiring && expiring !== 'all') {
      const now = new Date()
      const twoDaysFromNow = new Date()
      twoDaysFromNow.setDate(now.getDate() + 2)

      if (expiring === 'expiring_soon') {
        where.expiresAt = {
          lte: twoDaysFromNow,
          gte: now
        }
      } else if (expiring === 'expired') {
        where.expiresAt = {
          lt: now
        }
      }
    }

    const requests = await db.emailBlastRequest.findMany({
      where,
      select: {
        id: true,
        jobId: true,
        employerId: true,
        packageId: true,
        status: true,
        adminNotes: true,
        requestedAt: true,
        startedAt: true,
        completedAt: true,
        emailSentAt: true,
        expiresAt: true,
        logoUrl: true,
        content: true,
        customLink: true,
        useJobLink: true,
        createdAt: true,
        updatedAt: true,
        job: {
          select: {
            id: true,
            title: true,
            category: true,
            payRangeText: true,
            locationText: true,
            createdAt: true,
            expiresAt: true,
            isCompanyPrivate: true
          }
        },
        employer: {
          select: {
            companyName: true,
            companyLogoUrl: true,
            user: {
              select: {
                name: true,
                email: true,
                profilePictureUrl: true
              }
            }
          }
        },
        package: {
          select: {
            packageType: true
          }
        }
      },
      orderBy: { requestedAt: 'desc' }
    })

    // Generate presigned URLs for profile pictures and company logos
    const requestsWithPresignedUrls = await Promise.all(
      requests.map(async (request) => {
        const presignedProfileUrl = await generatePresignedProfileUrl(request.employer.user.profilePictureUrl)
        const presignedLogoUrl = await generatePresignedLogoUrl(request.employer.companyLogoUrl)

        return {
          ...request,
          // Transform job data to match dashboard expectations
          job: {
            ...request.job,
            employer: {
              companyName: request.employer.companyName,
              companyLogoUrl: presignedLogoUrl || request.employer.companyLogoUrl,
              user: {
                name: request.employer.user.name,
                email: request.employer.user.email,
                profilePictureUrl: presignedProfileUrl || request.employer.user.profilePictureUrl
              }
            }
          },
          employer: {
            ...request.employer,
            companyLogoUrl: presignedLogoUrl || request.employer.companyLogoUrl,
            user: {
              ...request.employer.user,
              profilePictureUrl: presignedProfileUrl || request.employer.user.profilePictureUrl
            }
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      requests: requestsWithPresignedUrls
    })

  } catch (error) {
    console.error('Error fetching email blast requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}