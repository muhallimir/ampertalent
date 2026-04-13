import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { inAppNotificationService } from '@/lib/in-app-notification-service'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Employer jobs API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    // Verify user is an employer or admin impersonating an employer
    if (currentUser.profile.role !== 'employer' && !(currentUser.isImpersonating && currentUser.profile.role === 'employer')) {
      console.log('🚫 EMPLOYER JOBS: Access denied', {
        userRole: currentUser.profile.role,
        isImpersonating: currentUser.isImpersonating,
        userId: currentUser.profile.id,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined
      })
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const includeArchived = searchParams.get('includeArchived') === 'true'
    const archivedOnly = searchParams.get('archivedOnly') === 'true'

    console.log('🔍 Fetching jobs for employer:', currentUser.profile.id, 'with filters:', {
      status: statusFilter,
      includeArchived,
      archivedOnly
    })

    // Build where clause based on filters
    let whereClause: any = {
      employerId: currentUser.profile.id
    }

    // Archive filtering logic
    if (archivedOnly) {
      // Only show archived jobs
      whereClause.isArchived = true
    } else if (!includeArchived) {
      // Default: exclude archived jobs
      whereClause.isArchived = false
    }
    // If includeArchived is true and archivedOnly is false, show all jobs (no archive filter)

    // If requesting approved jobs (for invitations), filter out expired ones
    if (statusFilter === 'approved') {
      whereClause = {
        ...whereClause,
        status: 'approved',
        OR: [
          { expiresAt: null }, // Jobs without expiration
          { expiresAt: { gt: new Date() } } // Jobs that haven't expired yet
        ]
      }
    } else if (statusFilter) {
      // For other specific status filters, validate the status
      const validStatuses = ['draft', 'pending_vetting', 'approved', 'rejected', 'expired']
      if (validStatuses.includes(statusFilter)) {
        whereClause.status = statusFilter
      } else {
        console.error('Invalid status filter provided:', statusFilter)
        return NextResponse.json(
          { error: `Invalid status filter. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Fetch employer's jobs with optional status filter
    const jobs = await db.job.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
        expiresAt: true,
        viewsCount: true,
        payRangeMin: true,
        payRangeMax: true,
        salaryType: true,
        experienceLevel: true,
        locationText: true,
        skillsRequired: true,
        // Archive fields
        isArchived: true,
        archivedAt: true,
        archivedBy: true,
        // Pause fields
        isPaused: true,
        pausedAt: true,
        pausedBy: true,
        pausedDaysRemaining: true,
        // Featured and Email Blast fields
        isFeatured: true,
        isEmailBlast: true,
        featuredStatus: true,
        emailBlastStatus: true,
        featuredRequestedAt: true,
        emailBlastRequestedAt: true,
        featuredCompletedAt: true,
        emailBlastCompletedAt: true,
        emailBlastExpiresAt: true,
        featuredExtensionGranted: true,
        featuredExtensionExpiresAt: true,
        // Concierge fields
        conciergeRequested: true,
        conciergeStatus: true,
        chatEnabled: true,
        chatEnabledAt: true,
        _count: {
          select: {
            applications: true
          }
        },
        applications: {
          select: {
            id: true,
            status: true
          }
        },
        employer: {
          select: {
            packages: {
              where: {
                listingsRemaining: { gt: 0 },
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gt: new Date() } }
                ]
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                packageType: true,
                listingsRemaining: true,
                expiresAt: true
              }
            }
          }
        },
        // Include featured and email blast request details
        featuredJobRequests: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            status: true,
            requestedAt: true,
            completedAt: true,
            extensionGranted: true,
            extensionExpiresAt: true,
            package: {
              select: {
                packageType: true
              }
            }
          }
        },
        emailBlastRequests: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            status: true,
            requestedAt: true,
            completedAt: true,
            expiresAt: true,
            content: true,
            package: {
              select: {
                packageType: true
              }
            }
          }
        },
        // Include concierge chat unread count
        conciergeChats: {
          select: {
            id: true,
            _count: {
              select: {
                messages: {
                  where: {
                    senderType: 'admin',
                    readAt: null
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
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
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log('📊 Jobs found by status:', {
      total: jobs.length,
      draft: jobs.filter((j: any) => j.status === 'draft').length,
      pending_vetting: jobs.filter((j: any) => j.status === 'pending_vetting').length,
      reviewing: jobs.filter((j: any) => j.status === 'reviewing').length,
      approved: jobs.filter((j: any) => j.status === 'approved').length,
      rejected: jobs.filter((j: any) => j.status === 'rejected').length,
      expired: jobs.filter((j: any) => j.status === 'expired').length,
      archived: jobs.filter((j: any) => j.isArchived === true).length,
      active: jobs.filter((j: any) => j.isArchived === false).length,
      pending_payment: pendingJobs.length
    })

    // Map pending job posts to frontend format
    const mappedPendingJobs = pendingJobs.map((pendingJob: any) => {
      const jobData = typeof pendingJob.jobData === 'string'
        ? JSON.parse(pendingJob.jobData)
        : pendingJob.jobData

      return {
        id: `pending_${pendingJob.id}`, // Prefix to distinguish from regular jobs
        title: jobData.title || 'Untitled Job',
        location: jobData.location || 'Remote',
        jobType: jobData.jobType?.toLowerCase().replace('_', '-') || 'full-time',
        experienceLevel: jobData.experienceLevel || 'mid',
        salaryMin: jobData.salaryMin || 0,
        salaryMax: jobData.salaryMax || 0,
        salaryType: jobData.salaryType || 'yearly',
        status: 'pending_payment', // Special status for pending jobs
        rejectionReason: null,
        applicationsCount: 0,
        viewsCount: 0,
        createdAt: pendingJob.createdAt.toISOString(),
        expiresAt: pendingJob.expiresAt.toISOString(),
        skills: jobData.skills || [],
        selectedPackage: pendingJob.selectedPackage,
        isPending: true // Flag to identify pending jobs
      }
    })

    // Map database fields to frontend expected format
    const mappedJobs = jobs.map((job: any) => {
      // Check if job has any hired applications
      const hasHiredApplications = job.applications?.some((app: any) => app.status === 'hired') || false

      // Map database status to frontend status
      let frontendStatus: string
      switch (job.status) {
        case 'approved':
          // If job has hired applications, show as filled instead of active
          frontendStatus = hasHiredApplications ? 'filled' : 'active'
          break
        case 'draft':
          frontendStatus = 'draft'
          break
        case 'expired':
          frontendStatus = 'expired'
          break
        case 'pending_vetting':
          frontendStatus = 'pending_review'
          break
        case 'reviewing':
          frontendStatus = 'reviewing'
          break
        case 'rejected':
          frontendStatus = 'rejected' // Show as rejected, allow re-editing
          break
        case 'paused':
          frontendStatus = 'paused'
          break
        default:
          frontendStatus = 'draft'
      }

      // Map job type enum to frontend format
      let jobType: string
      switch (job.type) {
        case 'FULL_TIME':
          jobType = 'full-time'
          break
        case 'PART_TIME':
          jobType = 'part-time'
          break
        case 'PERMANENT':
          jobType = 'contract'
          break
        case 'TEMPORARY':
          jobType = 'freelance'
          break
        default:
          jobType = 'full-time'
      }

      // Clean up rejection reason for employer display (remove reviewing marker)
      let rejectionReason = job.rejectionReason
      if (rejectionReason?.startsWith('[REVIEWING]')) {
        rejectionReason = rejectionReason.replace(/^\[REVIEWING\]\s*/, '') || null
      }

      // Get package information
      const currentPackage = job.employer.packages[0] || null
      const packageInfo = currentPackage ? {
        packageType: currentPackage.packageType,
        listingsRemaining: currentPackage.listingsRemaining,
        expiresAt: currentPackage.expiresAt
      } : null

      // Get featured job request information
      const featuredRequest = job.featuredJobRequests[0] || null
      const featuredInfo = job.isFeatured || featuredRequest ? {
        isFeatured: job.isFeatured,
        status: job.featuredStatus,
        requestedAt: job.featuredRequestedAt?.toISOString(),
        completedAt: job.featuredCompletedAt?.toISOString(),
        extensionGranted: job.featuredExtensionGranted,
        extensionExpiresAt: job.featuredExtensionExpiresAt?.toISOString(),
        packageType: featuredRequest?.package?.packageType || 'featured'
      } : null

      // Get email blast request information
      const emailBlastRequest = job.emailBlastRequests[0] || null
      const emailBlastInfo = job.isEmailBlast || emailBlastRequest ? {
        isEmailBlast: job.isEmailBlast,
        status: job.emailBlastStatus,
        requestedAt: job.emailBlastRequestedAt?.toISOString(),
        completedAt: job.emailBlastCompletedAt?.toISOString(),
        expiresAt: job.emailBlastExpiresAt?.toISOString(),
        packageType: emailBlastRequest?.package?.packageType || 'email_blast',
        hasContent: emailBlastRequest?.content ? true : false
      } : null

      return {
        id: job.id,
        title: job.title,
        location: job.locationText || 'Remote',
        jobType,
        experienceLevel: job.experienceLevel || 'mid',
        salaryMin: job.payRangeMin ? Number(job.payRangeMin) : 0,
        salaryMax: job.payRangeMax ? Number(job.payRangeMax) : 0,
        salaryType: job.salaryType || 'yearly',
        status: frontendStatus,
        rejectionReason: rejectionReason,
        applicationsCount: job._count.applications,
        viewsCount: job.viewsCount,
        createdAt: job.createdAt.toISOString(),
        expiresAt: job.expiresAt?.toISOString() || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        skills: job.skillsRequired || [],
        // Archive fields
        isArchived: job.isArchived || false,
        archivedAt: job.archivedAt?.toISOString() || null,
        archivedBy: job.archivedBy || null,
        // Pause fields
        isPaused: job.isPaused || false,
        pausedAt: job.pausedAt?.toISOString() || null,
        pausedBy: job.pausedBy || null,
        pausedDaysRemaining: job.pausedDaysRemaining || null,
        packageInfo: packageInfo,
        featuredInfo: featuredInfo,
        emailBlastInfo: emailBlastInfo,
        // Concierge information
        conciergeRequested: job.conciergeRequested || false,
        conciergeStatus: job.conciergeStatus || null,
        chatEnabled: job.chatEnabled || false,
        unreadMessageCount: job.conciergeChats && job.conciergeChats.length > 0
          ? job.conciergeChats[0]._count.messages
          : 0,
        isPending: false // Flag to identify regular jobs
      }
    })

    // Combine regular jobs and pending jobs, sort by creation date
    const allJobs = [...mappedJobs, ...mappedPendingJobs].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    console.log('✅ Mapped jobs for frontend:', {
      total: allJobs.length,
      active: allJobs.filter((j: any) => j.status === 'active').length,
      draft: allJobs.filter((j: any) => j.status === 'draft').length,
      pending_review: allJobs.filter((j: any) => j.status === 'pending_review').length,
      reviewing: allJobs.filter((j: any) => j.status === 'reviewing').length,
      pending_payment: allJobs.filter((j: any) => j.status === 'pending_payment').length,
      rejected: allJobs.filter((j: any) => j.status === 'rejected').length,
      expired: allJobs.filter((j: any) => j.status === 'expired').length,
      paused: allJobs.filter((j: any) => j.status === 'paused').length
    })

    return NextResponse.json({
      success: true,
      jobs: allJobs
    })

  } catch (error) {
    console.error('Error fetching employer jobs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}