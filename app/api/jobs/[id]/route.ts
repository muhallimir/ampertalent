/**
 * Job Detail API - GET /api/jobs/[id]
 * Returns full job details including employer info, application count
 */

import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { S3Service } from '@/lib/s3'

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'ampertalent-files'

// Helper function to generate presigned URL for company logo
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
    const { id: jobId } = await params
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const includeApplicationStatus = searchParams.get('include')?.includes('application-status')
    const includeSavedStatus = searchParams.get('include')?.includes('saved-status')
    const includeNotifications = searchParams.get('include')?.includes('notifications')

    // Get current user for personalized data
    const currentUser = await getCurrentUser()

    // Fetch the job with basic information
    const job = await db.job.findUnique({
      where: {
        id: jobId,
        status: 'approved', // Only show approved jobs
        isPaused: false // Hide paused jobs from seekers
      },
      select: {
        id: true,
        title: true,
        category: true,
        type: true,
        payRangeMin: true,
        payRangeMax: true,
        payRangeText: true,
        salaryType: true,
        description: true,
        requirements: true,
        skillsRequired: true,
        benefits: true,
        experienceLevel: true,
        isFlexibleHours: true,
        hoursPerWeek: true,
        locationText: true,
        applicationDeadline: true,
        viewsCount: true,
        createdAt: true,
        expiresAt: true,
        isArchived: true,
        archivedAt: true,
        isCompanyPrivate: true, // Critical field for privacy functionality
        employer: {
          select: {
            companyName: true,
            companyLogoUrl: true,
            companyWebsite: true,
            companyDescription: true,
            missionStatement: true,
            coreValues: true,
            userId: true
          }
        },
        applications: {
          where: {
            status: 'hired'
          },
          select: {
            id: true,
            status: true,
            updatedAt: true
          },
          take: 1
        }
      }
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Check if job is archived or expired
    const isArchived = job.isArchived || false
    const isExpired = job.expiresAt && job.expiresAt < new Date()
    const isUnavailable = isArchived || isExpired

    // Increment view count only for available jobs (fire and forget - don't wait for it)
    if (!isUnavailable) {
      db.job.update({
        where: { id: jobId },
        data: {
          viewsCount: {
            increment: 1
          }
        }
      }).catch((error: any) => {
        console.error('Error incrementing view count:', error)
        // Don't fail the request if view count update fails
      })
    }

    // Generate presigned URL for company logo
    const presignedLogoUrl = await generatePresignedLogoUrl(job.employer.companyLogoUrl)

    // Check if job is filled (has hired applications)
    const isFilled = job.applications && job.applications.length > 0

    // Check if company information should be private
    const isCompanyPrivate = job.isCompanyPrivate || false

    // Initialize additional data
    let applicationStatus = null
    let isSaved = false
    let invitationMessage = null

    // Fetch application status if requested
    if (includeApplicationStatus && currentUser?.profile?.id) {
      const application = await db.application.findFirst({
        where: {
          jobId: jobId,
          seekerId: currentUser.profile.id
        },
        select: {
          id: true,
          status: true,
          appliedAt: true,
          coverLetter: true
        }
      })

      applicationStatus = {
        hasApplied: !!application,
        application: application || null
      }
    }

    // Fetch saved status if requested
    if (includeSavedStatus && currentUser?.profile?.id) {
      const savedJob = await db.savedJob.findFirst({
        where: {
          jobId: jobId,
          seekerId: currentUser.profile.id
        }
      })

      isSaved = !!savedJob
    }

    // Fetch notification data if requested
    if (includeNotifications && currentUser?.profile?.id) {
      const notifications = await db.notification.findMany({
        where: {
          userId: currentUser.profile.id,
          type: 'job_invitation',
          actionUrl: `/seeker/jobs/${jobId}`
        },
        orderBy: { createdAt: 'desc' }
      })

      const jobInvitation = notifications.find((notif: any) =>
        notif.type === 'job_invitation' &&
        notif.actionUrl === `/seeker/jobs/${jobId}`
      )

      if (jobInvitation && jobInvitation.data) {
        invitationMessage = {
          message: (jobInvitation.data as any).employerMessage || jobInvitation.message,
          companyName: (jobInvitation.data as any).companyName || 'Company',
          invitedAt: jobInvitation.createdAt.toISOString()
        }
      }
    }

    // Transform the job data to match the frontend interface
    const transformedJob = {
      id: job.id,
      title: job.title,
      category: job.category,
      type: job.type,
      payRangeMin: job.payRangeMin ? Number(job.payRangeMin) : null,
      payRangeMax: job.payRangeMax ? Number(job.payRangeMax) : null,
      payRangeText: job.payRangeText,
      salaryType: job.salaryType,
      description: job.description,
      requirements: job.requirements,
      skillsRequired: job.skillsRequired,
      benefits: job.benefits,
      experienceLevel: job.experienceLevel,
      isFlexibleHours: job.isFlexibleHours,
      hoursPerWeek: job.hoursPerWeek,
      locationText: job.locationText,
      applicationDeadline: job.applicationDeadline?.toISOString() || null,
      viewsCount: isUnavailable ? job.viewsCount : job.viewsCount + 1, // Only increment for available jobs
      createdAt: job.createdAt.toISOString(),
      expiresAt: job.expiresAt?.toISOString() || null,
      isArchived: isArchived,
      archivedAt: isArchived ? job.archivedAt?.toISOString() || null : null,
      isExpired: isExpired,
      isUnavailable: isUnavailable,
      isFilled: isFilled,
      filledAt: isFilled ? job.applications[0].updatedAt.toISOString() : null,
      employer: {
        companyName: isCompanyPrivate ? 'Private Company' : job.employer.companyName,
        companyLogoUrl: isCompanyPrivate ? null : (presignedLogoUrl || job.employer.companyLogoUrl),
        companyWebsite: isCompanyPrivate ? null : job.employer.companyWebsite,
        companyDescription: isCompanyPrivate ? null : job.employer.companyDescription,
        missionStatement: isCompanyPrivate ? null : job.employer.missionStatement,
        coreValues: isCompanyPrivate ? null : job.employer.coreValues,
        employerId: job.employer.userId
      },
      // Additional data
      applicationStatus,
      isSaved,
      invitationMessage
    }

    return NextResponse.json(transformedJob)
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    )
  }
}
