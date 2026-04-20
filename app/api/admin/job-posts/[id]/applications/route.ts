import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { S3Service } from '@/lib/s3'

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'ampertalent-files'

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    if (currentUser.profile?.role !== 'admin' && currentUser.profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { id: jobId } = await params

    // Fetch job with applications
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        employer: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                profilePictureUrl: true
              }
            }
          }
        },
        applications: {
          include: {
            seeker: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                    profilePictureUrl: true
                  }
                }
              }
            }
          },
          orderBy: {
            appliedAt: 'desc'
          }
        },
        _count: {
          select: {
            applications: true
          }
        }
      }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Generate presigned URLs for profile pictures and company logos
    const presignedEmployerProfileUrl = await generatePresignedProfileUrl(job.employer.user.profilePictureUrl)
    const presignedCompanyLogoUrl = await generatePresignedLogoUrl(job.employer.companyLogoUrl)

    // Generate presigned URLs for all applicant profile pictures
    const applicationsWithPresignedUrls = await Promise.all(
      job.applications.map(async (app) => {
        const presignedSeekerProfileUrl = await generatePresignedProfileUrl(app.seeker.user.profilePictureUrl)

        return {
          id: app.id,
          status: app.status,
          appliedAt: app.appliedAt.toISOString(),
          seeker: {
            user: {
              name: app.seeker.user.name,
              email: app.seeker.user.email,
              profilePictureUrl: presignedSeekerProfileUrl || app.seeker.user.profilePictureUrl
            }
          }
        }
      })
    )

    // Format the response
    const formattedJob = {
      id: job.id,
      title: job.title,
      employerId: job.employerId,
      payRangeMin: job.payRangeMin,
      payRangeMax: job.payRangeMax,
      payRangeText: job.payRangeText,
      type: job.type,
      description: job.description,
      skillsRequired: job.skillsRequired || [],
      locationText: job.locationText,
      status: job.status,
      isCompanyPrivate: job.isCompanyPrivate,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      expiresAt: job.expiresAt?.toISOString() || null,
      approvedAt: job.approvedAt?.toISOString() || null,
      viewsCount: job.viewsCount,
      legacyId: job.legacyId ? String(job.legacyId) : null,
      employer: {
        userId: job.employer.userId,
        companyName: job.employer.companyName,
        companyWebsite: job.employer.companyWebsite,
        companyLogoUrl: presignedCompanyLogoUrl || job.employer.companyLogoUrl,
        isVetted: job.employer.isVetted,
        user: {
          name: job.employer.user.name,
          email: job.employer.user.email,
          profilePictureUrl: presignedEmployerProfileUrl || job.employer.user.profilePictureUrl
        }
      },
      _count: {
        applications: job._count.applications
      },
      applications: applicationsWithPresignedUrls
    }

    return NextResponse.json(formattedJob)

  } catch (error) {
    console.error('Error fetching job applications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}