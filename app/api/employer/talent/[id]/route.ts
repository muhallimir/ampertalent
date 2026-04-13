import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { S3Service } from '@/lib/s3'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is an employer
    if (currentUser.profile.role !== 'employer') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const resolvedParams = await params
    const talentId = resolvedParams.id

    // Fetch detailed talent profile
    const talent = await db.jobSeeker.findUnique({
      where: {
        userId: talentId,
        isSuspended: false,
        profileVisibility: 'employers_only', // Only show profiles visible to employers
        // Require active subscription
        membershipPlan: {
          not: 'none'
        },
        membershipExpiresAt: {
          gt: new Date() // Must have non-expired subscription
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            timezone: true,
            profilePictureUrl: true,
            createdAt: true,
            allowDirectMessages: true
          }
        }
      }
    })

    if (!talent) {
      return NextResponse.json({ error: 'Talent profile not found' }, { status: 404 })
    }

    // Generate presigned URL for profile picture if it exists
    let profilePictureUrl = talent.user.profilePictureUrl
    if (profilePictureUrl) {
      try {
        const url = new URL(profilePictureUrl)
        const pathParts = url.pathname.split('/').filter(Boolean)
        const fileKey = pathParts.slice(-3).join('/') // Get avatars/userId/filename

        profilePictureUrl = await S3Service.generatePresignedDownloadUrl(
          process.env.AWS_S3_BUCKET || 'hire-my-mom-files',
          fileKey,
          24 * 60 * 60 // 24 hours
        )
      } catch (error) {
        console.error('Error generating presigned URL for profile picture:', error)
        // Keep original URL as fallback
      }
    }

    // Check if employer can see email address and get detailed application history
    // Email is visible if:
    // 1. Employer has hired this seeker, OR
    // 2. Employer has this seeker in interview status on an active (non-expired) job
    const employerId = currentUser.profile.employer?.userId
    let canSeeEmail = false
    let applicationHistory: any[] = []

    if (employerId) {
      // Get all applications from this seeker to this employer's jobs
      const allApplications = await db.application.findMany({
        where: {
          seeker: {
            userId: talentId
          },
          job: {
            employerId: employerId
          }
        },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true
            }
          }
        },
        orderBy: {
          appliedAt: 'desc'
        }
      })

      // Check if email should be visible
      const relevantApplications = allApplications.filter(app =>
        app.status === 'hired' ||
        (app.status === 'interview' && app.job.status !== 'expired')
      )
      canSeeEmail = relevantApplications.length > 0

      // Transform application history for frontend
      applicationHistory = allApplications.map(app => ({
        id: app.id,
        jobId: app.job.id,
        jobTitle: app.job.title,
        jobStatus: app.job.status,
        applicationStatus: app.status,
        appliedAt: app.appliedAt.toISOString(),
        jobCreatedAt: app.job.createdAt.toISOString()
      }))
    }

    // Transform data for frontend
    const profileData = {
      id: talent.userId,
      name: talent.user.name,
      firstName: talent.user.firstName,
      lastName: talent.user.lastName,
      email: canSeeEmail ? talent.user.email : null,
      phone: talent.user.phone,
      timezone: talent.user.timezone,
      headline: talent.headline,
      aboutMe: talent.aboutMe,
      professionalSummary: (talent as any).professionalSummary,
      availability: talent.availability,
      salaryExpectations: talent.salaryExpectations,
      showSalaryExpectations: talent.showSalaryExpectations,
      skills: talent.skills,
      profilePictureUrl,
      membershipPlan: talent.membershipPlan,
      portfolioUrls: talent.portfolioUrls,
      resumeUrl: talent.resumeUrl,
      hasResume: !!talent.resumeUrl,
      joinedAt: talent.user.createdAt.toISOString(),
      resumeLastUploaded: talent.resumeLastUploaded?.toISOString(),
      membershipExpiresAt: talent.membershipExpiresAt?.toISOString(),
      workExperience: talent.workExperience,
      education: talent.education,
      applicationHistory: applicationHistory,
      allowDirectMessages: talent.user.allowDirectMessages
    }

    return NextResponse.json({
      success: true,
      profile: profileData
    })

  } catch (error) {
    console.error('Error fetching talent profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}