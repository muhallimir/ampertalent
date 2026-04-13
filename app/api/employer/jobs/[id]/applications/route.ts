import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { ConciergeService } from '@/lib/concierge-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser || !currentUser.clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify employer role with impersonation support
    if (!currentUser.profile ||
      (currentUser.profile.role !== 'employer' && !(currentUser.isImpersonating && currentUser.profile.role === 'employer')) ||
      !currentUser.profile.employer) {
      console.log('🚫 JOB APPLICATIONS: Access denied', {
        hasProfile: !!currentUser.profile,
        role: currentUser.profile?.role,
        hasEmployer: !!currentUser.profile?.employer,
        isImpersonating: currentUser.isImpersonating,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const employerId = currentUser.profile.employer.userId
    const { id: jobId } = await params

    // Log impersonation activity for security audit
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Admin accessing job applications', {
        adminId: (currentUser as any).adminProfile?.id,
        adminEmail: (currentUser as any).adminProfile?.email,
        impersonatedUserId: currentUser.profile.id,
        impersonatedUserEmail: currentUser.profile.email,
        employerId,
        jobId,
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      });
    }

    // Check if this is a pending job post or regular job
    let job = null
    let isPendingJob = false

    if (jobId.startsWith('pending_')) {
      // This is a pending job post - check by clerkUserId since it doesn't have employerId
      const pendingJob = await db.pendingJobPost.findFirst({
        where: {
          id: jobId,
          clerkUserId: currentUser.clerkUser.id as string
        }
      })

      if (pendingJob) {
        isPendingJob = true
        // Parse the job data from JSON string
        let jobData
        try {
          jobData = JSON.parse(pendingJob.jobData)
        } catch (error) {
          console.error('Error parsing pending job data:', error)
          return NextResponse.json({ error: 'Invalid job data' }, { status: 500 })
        }

        job = {
          id: pendingJob.id,
          title: jobData.title || 'Untitled Job',
          locationText: jobData.location || jobData.locationText || 'Remote',
          status: 'pending_payment'
        }
      }
    } else {
      // This is a regular job
      job = await db.job.findFirst({
        where: {
          id: jobId,
          employerId
        }
      })
    }

    // Get concierge request if it exists (only for regular jobs)
    let conciergeRequest = null
    if (!isPendingJob && job?.conciergeRequested) {
      try {
        conciergeRequest = await ConciergeService.getConciergeRequest(job.id)
      } catch (error) {
        console.error('Error fetching concierge request:', error)
      }
    }

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Get search and filter parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'

    // Build where clause for applications
    const whereClause: Record<string, unknown> = {
      jobId
    }

    if (status !== 'all') {
      whereClause.status = status
    }

    // Fetch applications with seeker details (only for regular jobs, pending jobs have no applications)
    let applications: any[] = []

    if (!isPendingJob) {
      applications = await db.application.findMany({
        where: whereClause,
        include: {
          job: {
            select: {
              status: true
            }
          },
          seeker: {
            include: {
              user: true
            }
          }
        },
        orderBy: { appliedAt: 'desc' }
      })
    }

    // Filter by search term if provided
    let filteredApplications = applications
    if (search) {
      filteredApplications = applications.filter((app: typeof applications[0]) =>
        app.seeker.user.name.toLowerCase().includes(search.toLowerCase()) ||
        app.seeker.user.clerkUserId.toLowerCase().includes(search.toLowerCase()) ||
        app.seeker.skills.some((skill: string) => skill.toLowerCase().includes(search.toLowerCase()))
      )
    }

    // Transform applications to match frontend interface
    const transformedApplications = filteredApplications.map((app: typeof filteredApplications[0]) => ({
      id: app.id,
      applicantId: app.seeker.user.id,
      applicantName: app.seeker.user.name,
      applicantEmail: (app.status === 'interview' || app.status === 'hired') && app.job.status !== 'expired'
        ? app.seeker.user.email
        : null, // Hide email for non-interview/hired statuses or expired jobs
      applicantPhone: app.seeker.user.phone,
      applicantLocation: 'Remote', // TODO: Add location to seeker profile
      profilePictureUrl: app.seeker.user.profilePictureUrl,
      resumeUrl: app.resumeUrl,
      coverLetter: app.coverLetter,
      appliedAt: app.appliedAt.toISOString(),
      status: app.status === 'reviewed' ? 'reviewing' :
        app.status === 'interview' ? 'shortlisted' :
          app.status,
      experience: app.seeker.headline || 'Not specified',
      skills: app.seeker.skills,
      expectedSalary: undefined, // TODO: Add to application
      availability: app.seeker.availability || 'Not specified',
      rating: undefined, // TODO: Add rating system
      // Interview tracking fields
      interviewStage: app.interviewStage,
      interviewScheduledAt: app.interviewScheduledAt?.toISOString() || null,
      interviewCompletedAt: app.interviewCompletedAt?.toISOString() || null,
      interviewerNotes: app.interviewerNotes,
      nextActionRequired: app.nextActionRequired,
      nextActionDeadline: app.nextActionDeadline?.toISOString() || null,
      allowDirectMessages: app.seeker.user.allowDirectMessages
    }))

    // Get job details for response
    const jobDetails = {
      id: job.id,
      title: job.title,
      location: job.locationText || 'Remote',
      applicationsCount: applications.length,
      status: job.status,
      createdAt: job.createdAt ? job.createdAt.toISOString() : null,
      // Add concierge information
      conciergeRequested: job.conciergeRequested || false,
      conciergeStatus: (job as any).conciergeStatus || null,
      chatEnabled: job.chatEnabled || false,
      chatEnabledAt: (job as any).chatEnabledAt?.toISOString() || null,
      conciergeInfo: job.conciergeRequested && conciergeRequest ? {
        isConciergeRequested: true,
        status: conciergeRequest.status,
        assignedAdminId: conciergeRequest.assignedAdminId,
        requestedAt: conciergeRequest.createdAt.toISOString(),
        updatedAt: conciergeRequest.updatedAt.toISOString(),
        discoveryCallNotes: conciergeRequest.discoveryCallNotes,
        optimizedJobDescription: conciergeRequest.optimizedJobDescription,
        shortlistedCandidates: conciergeRequest.shortlistedCandidates,
        chatEnabled: job.chatEnabled || false
      } : null
    }

    return NextResponse.json({
      job: jobDetails,
      applications: transformedApplications
    })

  } catch (error) {
    console.error('Error fetching job applications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}