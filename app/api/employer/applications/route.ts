import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser || !currentUser.clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Employer applications API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    // Verify user is an employer or admin impersonating an employer
    if (!currentUser.profile || !currentUser.profile.employer ||
      (currentUser.profile.role !== 'employer' && !(currentUser.isImpersonating && currentUser.profile.role === 'employer'))) {
      console.log('🚫 EMPLOYER APPLICATIONS: Access denied', {
        hasProfile: !!currentUser.profile,
        role: currentUser.profile?.role,
        hasEmployer: !!currentUser.profile?.employer,
        isImpersonating: currentUser.isImpersonating,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const employerId = currentUser.profile.employer.userId

    // Get search and filter parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const jobId = searchParams.get('jobId') || 'all'

    // First, get all jobs for this employer
    const jobs = await db.job.findMany({
      where: { employerId },
      select: {
        id: true,
        title: true,
        locationText: true,
        status: true,
        _count: {
          select: {
            applications: true
          }
        }
      }
    })

    // Build where clause for applications
    const whereClause: Record<string, unknown> = {
      job: {
        employerId
      }
    }

    if (status !== 'all') {
      whereClause.status = status
    }

    if (jobId !== 'all') {
      whereClause.jobId = jobId
    }

    // Fetch applications with seeker details
    const applications = await db.application.findMany({
      where: whereClause,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            locationText: true,
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

    // Filter by search term if provided
    let filteredApplications = applications
    if (search) {
      filteredApplications = applications.filter((app: typeof applications[0]) =>
        app.seeker.user.name.toLowerCase().includes(search.toLowerCase()) ||
        (app.seeker.user.clerkUserId?.toLowerCase().includes(search.toLowerCase()) || false) ||
        app.job.title.toLowerCase().includes(search.toLowerCase()) ||
        app.seeker.skills.some((skill: string) => skill.toLowerCase().includes(search.toLowerCase()))
      )
    }

    // Transform jobs to match frontend interface
    const transformedJobs = jobs.map((job: typeof jobs[0]) => ({
      id: job.id,
      title: job.title,
      location: job.locationText || 'Remote',
      applicationsCount: job._count.applications,
      status: job.status === 'approved' ? 'active' :
        job.status === 'draft' ? 'draft' :
          job.status === 'expired' ? 'expired' : 'paused'
    }))

    // Transform applications to match frontend interface
    const transformedApplications = filteredApplications.map((app: typeof filteredApplications[0]) => ({
      id: app.id,
      jobId: app.jobId,
      jobTitle: app.job.title,
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
      status: app.status, // Return actual status from database without transformation
      interviewStage: app.interviewStage,
      experience: app.seeker.headline || 'Not specified',
      skills: app.seeker.skills,
      expectedSalary: undefined, // TODO: Add to application
      availability: app.seeker.availability || 'Not specified',
      rating: undefined, // TODO: Add rating system
      allowDirectMessages: app.seeker.user.allowDirectMessages
    }))

    return NextResponse.json({
      jobs: transformedJobs,
      applications: transformedApplications
    })

  } catch (error) {
    console.error('Error fetching employer applications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}