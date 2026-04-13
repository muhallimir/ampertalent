import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Add diagnostic logging for cache debugging
    const requestTime = new Date().toISOString()
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const cacheControl = request.headers.get('cache-control') || 'none'

    console.log('🔍 DASHBOARD STATS REQUEST:', {
      timestamp: requestTime,
      userAgent: userAgent.substring(0, 50),
      cacheControl,
      url: request.url
    })

    const currentUser = await getCurrentUser(request)
    if (!currentUser || !currentUser.clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Employer dashboard stats API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    // Verify user is an employer or admin impersonating an employer
    if (!currentUser.profile || (currentUser.profile.role !== 'employer' && !(currentUser.isImpersonating && currentUser.profile.role === 'employer'))) {
      console.log('🚫 EMPLOYER DASHBOARD STATS: Access denied', {
        hasProfile: !!currentUser.profile,
        role: currentUser.profile?.role,
        isImpersonating: currentUser.isImpersonating,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Ensure employer profile exists
    if (!currentUser.profile.employer) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 403 })
    }

    const employerId = currentUser.profile.employer.userId


    // Get active jobs count - using same logic as frontend
    const activeJobsCount = await db.job.count({
      where: {
        employerId,
        status: 'approved',
        isArchived: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ],
        // Exclude jobs that have hired applications (they show as 'filled' in frontend)
        applications: {
          none: {
            status: 'hired'
          }
        }
      }
    })

    // Get total applications count
    const totalApplicationsCount = await db.application.count({
      where: {
        job: {
          employerId
        }
      }
    })

    // Get job credits remaining (sum all active packages)
    const activePackages = await db.employerPackage.findMany({
      where: {
        employerId,
        listingsRemaining: { gt: 0 },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    })

    const jobCredits = activePackages.reduce((total, pkg) => total + pkg.listingsRemaining, 0)

    // Calculate profile completion percentage
    const employer = currentUser.profile.employer
    const profileFields = [
      employer.companyName,
      employer.companyWebsite,
      employer.companyDescription,
      employer.companyLogoUrl,
      employer.billingAddress
    ]
    const completedFields = profileFields.filter(field => field && field.trim() !== '').length
    const profileCompletion = Math.round((completedFields / profileFields.length) * 100)

    // Get recent activity (last 7 days)
    const recentApplications = await db.application.findMany({
      where: {
        job: {
          employerId
        },
        appliedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      },
      include: {
        job: {
          select: {
            id: true,
            title: true
          }
        },
        seeker: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                profilePictureUrl: true
              }
            }
          }
        }
      },
      orderBy: { appliedAt: 'desc' },
      take: 5
    })

    // Get recent email blast events (requests created in last 7 days)
    const recentEmailBlasts = await db.emailBlastRequest.findMany({
      where: {
        employerId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        job: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    // Get recent jobs (last 5) - exclude archived jobs from dashboard
    const regularJobs = await db.job.findMany({
      where: {
        employerId,
        isArchived: false  // Only show non-archived jobs in dashboard
      },
      select: {
        id: true,
        title: true,
        status: true,
        isArchived: true,
        archivedAt: true,
        createdAt: true,
        rejectionReason: true,
        _count: {
          select: {
            applications: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    // Also fetch pending job posts (jobs waiting for payment)
    const pendingJobs = await db.pendingJobPost.findMany({
      where: {
        clerkUserId: currentUser.clerkUser.id as string,
        // Only include non-expired pending jobs
        expiresAt: {
          gt: new Date()
        }
      },
      select: {
        id: true,
        jobData: true,
        createdAt: true,
        expiresAt: true,
        selectedPackage: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    // Map pending jobs to frontend format
    const mappedPendingJobs = pendingJobs.map((pendingJob: any) => {
      const jobData = typeof pendingJob.jobData === 'string'
        ? JSON.parse(pendingJob.jobData)
        : pendingJob.jobData

      return {
        id: `pending_${pendingJob.id}`, // Prefix to distinguish from regular jobs
        title: jobData.title || 'Untitled Job',
        status: 'pending_payment', // Special status for pending jobs
        isArchived: false,
        archivedAt: null,
        applicationsCount: 0,
        createdAt: pendingJob.createdAt.toISOString(),
        rejectionReason: null,
        isPending: true // Flag to identify pending jobs
      }
    })

    // Combine and sort all recent jobs by creation date
    const recentJobs = [...regularJobs, ...mappedPendingJobs].sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateB - dateA // Newest first
    }).slice(0, 5) // Take only the 5 most recent

    // Calculate pending job counts by status
    const pendingVettingCount = regularJobs.filter((job: any) => job.status === 'pending_vetting').length
    const reviewingCount = regularJobs.filter((job: any) => job.status === 'reviewing').length
    const pendingPaymentCount = mappedPendingJobs.length
    const totalPendingCount = pendingVettingCount + reviewingCount + pendingPaymentCount

    let recentActivity: any[] = []

    recentActivity = [
      ...recentApplications.map((activity: any) => ({
        id: `app-${activity.id}`,
        type: 'application',
        title: 'New Application',
        description: `${activity.seeker.user.name} applied for ${activity.job.title}`,
        timestamp: activity.appliedAt.toISOString(),
        jobId: activity.job.id,
        jobTitle: activity.job.title,
        applicationId: activity.id,
        applicantId: activity.seeker.user.id,
        applicantName: activity.seeker.user.name,
        applicantProfilePictureUrl: activity.seeker.user.profilePictureUrl
      })),
      ...recentEmailBlasts.map((blast: any) => ({
        id: `blast-${blast.id}`,
        type: 'email_blast',
        title: 'Solo Email Blast Requested',
        description: `Email blast requested for ${blast.job.title}`,
        timestamp: (blast.requestedAt || blast.createdAt).toISOString(),
        jobId: blast.job.id,
        jobTitle: blast.job.title,
        applicantId: null,
        applicantName: null,
        applicantProfilePictureUrl: null
      }))
    ].sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5)

    const responseData = {
      activeJobs: activeJobsCount,
      totalApplications: totalApplicationsCount,
      jobCredits,
      profileCompletion,
      pendingJobs: {
        total: totalPendingCount,
        pending_vetting: pendingVettingCount,
        reviewing: reviewingCount,
        pending_payment: pendingPaymentCount
      },
      recentActivity,
      recentJobs: recentJobs.map((job: any) => {
        // Handle pending jobs (which are already mapped properly)
        if (job.isPending) {
          return {
            id: job.id,
            title: job.title,
            status: job.status,
            applicationsCount: job.applicationsCount,
            createdAt: job.createdAt,
            rejectionReason: null,
            isArchived: job.isArchived,
            archivedAt: job.archivedAt,
            isPending: true
          }
        }

        // Handle regular jobs
        // Clean up rejection reason for employer display (remove reviewing marker)
        let rejectionReason = job.rejectionReason
        if (rejectionReason?.startsWith('[REVIEWING]')) {
          rejectionReason = rejectionReason.replace(/^\[REVIEWING\]\s*/, '') || null
        }

        return {
          id: job.id,
          title: job.title,
          status: job.status === 'approved' ? 'approved' :
            job.status === 'draft' ? 'draft' :
              job.status === 'expired' ? 'expired' :
                job.status === 'pending_vetting' ? 'pending_vetting' :
                  job.status === 'rejected' ? 'rejected' : 'draft',
          applicationsCount: job._count?.applications ?? 0,
          createdAt: job.createdAt.toISOString(),
          rejectionReason: rejectionReason,
          isArchived: job.isArchived,
          archivedAt: job.archivedAt
        }
      })
    }

    // Add diagnostic logging for response data
    console.log('📊 DASHBOARD STATS RESPONSE:', {
      timestamp: new Date().toISOString(),
      employerId,
      activeJobs: activeJobsCount,
      totalApplications: totalApplicationsCount,
      jobCredits,
      profileCompletion,
      recentActivityCount: recentActivity.length,
      recentJobsCount: recentJobs.length
    })

    // Create response with explicit no-cache headers to prevent browser caching
    const response = NextResponse.json(responseData)

    // Set cache-control headers to prevent caching
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response

  } catch (error) {
    console.error('Error fetching employer dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
