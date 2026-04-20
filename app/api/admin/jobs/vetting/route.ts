import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { S3Service } from '@/lib/s3'
import { inAppNotificationService } from '@/lib/in-app-notification-service'
import { decodeHtmlEntities } from '@/lib/utils'
import { externalWebhookService } from '@/lib/external-webhook-service'

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'ampertalent-files'

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

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin or super admin role
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all jobs with comprehensive employer information for company vetting
    const jobs = await db.job.findMany({
      include: {
        employer: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                profilePictureUrl: true,
                createdAt: true,
                updatedAt: true
              }
            },
            // Get all packages (not just active ones) for complete history
            packages: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                packageType: true,
                listingsRemaining: true,
                purchasedAt: true,
                expiresAt: true,
                createdAt: true
              }
            },
            // Get job posting statistics
            jobs: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                approvedAt: true
              }
            }
          }
        },
        applications: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // Pending jobs first
        { createdAt: 'desc' }
      ]
    })

    // Transform jobs to match the expected interface with presigned URLs
    const transformedJobs = await Promise.all(
      jobs.map(async (job: any) => {
        // Map database status to frontend status
        let frontendStatus: 'pending' | 'reviewing' | 'approved' | 'rejected'
        switch (job.status) {
          case 'pending_vetting':
            // Check if job is marked as reviewing in admin notes
            if (job.rejectionReason && job.rejectionReason.startsWith('[REVIEWING]')) {
              frontendStatus = 'reviewing'
            } else {
              frontendStatus = 'pending'
            }
            break
          case 'approved':
            frontendStatus = 'approved'
            break
          case 'rejected':
            frontendStatus = 'rejected'
            break
          case 'draft':
            frontendStatus = 'pending'
            break
          default:
            frontendStatus = 'pending'
        }

        // Generate presigned URL for company logo
        const presignedLogoUrl = await generatePresignedLogoUrl(job.employer.companyLogoUrl)

        // Determine package type based on job properties (not employer's current package)
        let jobPackageType = 'standard' // Default
        if (job.isEmailBlast) {
          jobPackageType = 'email_blast'
        } else if (job.isFeatured) {
          jobPackageType = 'featured'
        }

        // Get current package for remaining credits display
        const currentPackage = job.employer.packages[0] || null
        const packageInfo = {
          packageType: jobPackageType, // Use job-specific package type
          listingsRemaining: currentPackage?.listingsRemaining || 0,
          expiresAt: currentPackage?.expiresAt || null
        }

        // Calculate job statistics for this employer
        const jobStats = {
          total: job.employer.jobs.length,
          approved: job.employer.jobs.filter((j: any) => j.status === 'approved').length,
          rejected: job.employer.jobs.filter((j: any) => j.status === 'rejected').length,
          pending: job.employer.jobs.filter((j: any) => j.status === 'pending_vetting').length,
          firstJobDate: job.employer.jobs.length > 0
            ? job.employer.jobs.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0].createdAt.toISOString()
            : null,
          lastJobDate: job.employer.jobs.length > 0
            ? job.employer.jobs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt.toISOString()
            : null
        }

        // Calculate total applications and hires for this employer across all jobs
        const totalApplications = job.applications.length
        const totalHires = job.applications.filter((app: any) => app.status === 'hired').length

        return {
          id: job.id,
          title: decodeHtmlEntities(job.title),
          companyName: job.employer.companyName,
          companyLogoUrl: presignedLogoUrl || job.employer.companyLogoUrl || undefined,
          companyWebsite: job.employer.companyWebsite || undefined,
          location: job.locationText || 'Remote',
          jobType: job.type.replace('_', ' '),
          experienceLevel: 'Not specified', // This field doesn't exist in our schema
          salaryMin: job.payRangeMin ? Number(job.payRangeMin) : 0,
          salaryMax: job.payRangeMax ? Number(job.payRangeMax) : 0,
          salaryType: job.payRangeText || 'Not specified',
          description: job.description,
          requirements: job.skillsRequired.join(', '),
          benefits: job.benefits || undefined,
          skills: job.skillsRequired,
          submittedAt: job.createdAt.toISOString(),
          status: frontendStatus,
          employerEmail: job.employer.user.email || 'No email provided',
          applicationDeadline: job.expiresAt?.toISOString(),
          flaggedReasons: [], // This would need to be implemented in the schema
          adminNotes: job.rejectionReason?.startsWith('[REVIEWING]')
            ? job.rejectionReason.replace(/^\[REVIEWING\]\s*/, '') || undefined
            : job.rejectionReason || undefined,
          applicationsCount: totalApplications,
          hiresCount: totalHires,
          viewsCount: job.viewsCount,
          employerId: job.employer.userId, // Add employer ID for admin context
          packageInfo: packageInfo, // Add package information for admin context
          isCompanyPrivate: job.isCompanyPrivate || false, // Add privacy field for admin visibility

          // COMPREHENSIVE COMPANY INFORMATION FOR VETTING
          companyInfo: {
            // Basic company details
            companyName: job.employer.companyName,
            companyWebsite: job.employer.companyWebsite,
            companyDescription: job.employer.companyDescription,
            companyLogoUrl: presignedLogoUrl || job.employer.companyLogoUrl,

            // Business information
            billingAddress: job.employer.billingAddress,
            taxId: job.employer.taxId,

            // Vetting status
            isVetted: job.employer.isVetted,
            vettedAt: job.employer.vettedAt?.toISOString(),
            vettedBy: job.employer.vettedBy, // Admin email who vetted

            // Account status
            isSuspended: job.employer.isSuspended,
            createdAt: job.employer.createdAt.toISOString(),
            updatedAt: job.employer.updatedAt.toISOString(),

            // User information
            userInfo: {
              id: job.employer.user.id,
              name: job.employer.user.name,
              email: job.employer.user.email,
              firstName: job.employer.user.firstName,
              lastName: job.employer.user.lastName,
              phone: job.employer.user.phone,
              profilePictureUrl: job.employer.user.profilePictureUrl,
              accountCreated: job.employer.user.createdAt.toISOString(),
              lastActive: job.employer.user.updatedAt.toISOString()
            },

            // Package history
            packageHistory: job.employer.packages.map((pkg: any) => ({
              id: pkg.id,
              packageType: pkg.packageType,
              listingsRemaining: pkg.listingsRemaining,
              purchasedAt: pkg.purchasedAt.toISOString(),
              expiresAt: pkg.expiresAt?.toISOString(),
              createdAt: pkg.createdAt.toISOString()
            })),

            // Job posting statistics
            jobStatistics: {
              ...jobStats,
              totalApplications: totalApplications,
              totalHires: totalHires
            }
          }
        }
      })
    )

    return NextResponse.json({ jobs: transformedJobs })
  } catch (error) {
    console.error('Error fetching jobs for vetting:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin or super admin role
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { jobId, status, adminNotes, flaggedReasons, isManualApproval } = await request.json()

    if (!jobId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Map frontend status to database status
    let dbStatus: 'draft' | 'pending_vetting' | 'approved' | 'rejected' | 'expired'
    switch (status) {
      case 'pending':
        dbStatus = 'pending_vetting'
        break
      case 'approved':
        dbStatus = 'approved'
        break
      case 'rejected':
        dbStatus = 'rejected'
        break
      case 'reviewing':
        dbStatus = 'pending_vetting' // Keep as pending_vetting but mark as reviewing in admin notes
        break
      default:
        dbStatus = 'pending_vetting'
    }

    // Get the job with employer info for credit refund
    const jobWithEmployer = await db.job.findUnique({
      where: { id: jobId },
      include: {
        employer: {
          include: {
            currentPackage: true,
            // Also get the recurring package if exists (for job expiration calculation)
            packages: {
              where: {
                packageType: 'gold_plus_recurring_6mo',
                recurringStatus: { in: ['active', 'completed'] }
              },
              orderBy: { createdAt: 'desc' },
              take: 1
            },
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!jobWithEmployer) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Determine job expiration date
    // For recurring 6-month plans, use the package's expires_at
    // For other packages, use 30 days from approval
    let jobExpiresAt: Date | undefined = undefined
    let jobApplicationDeadline: Date | undefined = undefined
    if (dbStatus === 'approved') {
      const recurringPackage = jobWithEmployer.employer.packages[0]
      if (recurringPackage && recurringPackage.expiresAt) {
        // Recurring 6-month plan: job expires when package expires
        jobExpiresAt = new Date(recurringPackage.expiresAt)
        // Application deadline also matches package expiration for recurring plans
        jobApplicationDeadline = new Date(recurringPackage.expiresAt)
      } else {
        // Standard packages: 30 days from approval
        jobExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        // Don't override applicationDeadline for non-recurring packages
      }
    }

    // Update the job
    let rejectionReasonValue: string | null = null
    if (status === 'reviewing') {
      // Mark as reviewing with special prefix
      rejectionReasonValue = `[REVIEWING]${adminNotes ? ` ${adminNotes}` : ''}`
    } else if (status === 'rejected') {
      rejectionReasonValue = adminNotes || null
    } else if (status === 'pending') {
      // Clear reviewing marker if moving back to pending
      rejectionReasonValue = null
    } else {
      rejectionReasonValue = adminNotes || null
    }

    const updatedJob = await db.job.update({
      where: { id: jobId },
      data: {
        status: dbStatus,
        rejectionReason: rejectionReasonValue,
        approvedAt: dbStatus === 'approved' ? new Date() : null,
        // Only mark as manually approved when explicitly flagged as manual approval
        ...(dbStatus === 'approved' && isManualApproval ? { manualApprove: true } : {}),
        // Set expiration date based on package type
        expiresAt: jobExpiresAt,
        // For recurring 6-month plans, also update application deadline
        ...(jobApplicationDeadline ? { applicationDeadline: jobApplicationDeadline } : {})
      }
    })

    // Handle credit refund for rejected jobs
    if (dbStatus === 'rejected' && jobWithEmployer.employer.currentPackage) {
      try {
        // Refund 1 credit to the employer's current package
        await db.employerPackage.update({
          where: { id: jobWithEmployer.employer.currentPackage.id },
          data: {
            listingsRemaining: {
              increment: 1
            }
          }
        })

        // Log the credit refund
        await db.adminActionLog.create({
          data: {
            adminId: currentUser.profile.id,
            actionType: 'credit_refund',
            targetEntity: 'employer_package',
            targetId: jobWithEmployer.employer.currentPackage.id,
            details: {
              jobId: jobId,
              jobTitle: jobWithEmployer.title,
              employerId: jobWithEmployer.employerId,
              creditsRefunded: 1,
              reason: 'Job posting rejected',
              rejectionFeedback: adminNotes
            }
          }
        })

        console.log(`Credit refunded for rejected job ${jobId} to employer ${jobWithEmployer.employerId}`)
      } catch (error) {
        console.error('Error refunding credit for rejected job:', error)
        // Don't fail the entire operation if credit refund fails
      }

      // Send rejection notification to employer via external webhook
      try {
        await externalWebhookService.sendEmployerJobRejected({
          userId: jobWithEmployer.employerId,
          email: jobWithEmployer.employer.user.email || '',
          firstName: jobWithEmployer.employer.user.name?.split(' ')[0] || 'there',
          jobId: jobId,
          jobTitle: jobWithEmployer.title,
          rejectionReason: adminNotes || 'Please review and improve your job posting.',
          companyName: jobWithEmployer.employer.companyName,
          editUrl: `${process.env.NEXT_PUBLIC_APP_URL}/employer/jobs/${jobId}/edit`
        })

        console.log(`Rejection webhook sent to employer ${jobWithEmployer.employerId}`)
      } catch (error) {
        console.error('Error sending rejection webhook:', error)
        // Don't fail the entire operation if webhook fails
      }
    }

    // Mark employer as vetted when their first job is approved (one-time vetting)
    if (dbStatus === 'approved') {
      try {
        const employer = await db.employer.findUnique({
          where: { userId: jobWithEmployer.employerId },
          select: { isVetted: true }
        })

        if (!employer?.isVetted) {
          await db.employer.update({
            where: { userId: jobWithEmployer.employerId },
            data: {
              isVetted: true,
              vettedAt: new Date(),
              vettedBy: currentUser.profile.id
            }
          })

          console.log('✅ EMPLOYER VETTED: First job approved for employer', jobWithEmployer.employerId)
        }
      } catch (vettingError) {
        console.error('Error marking employer as vetted:', vettingError)
        // Don't fail the entire operation if vetting update fails
      }
    }

    // Create in-app notifications for job status changes
    try {
      if (dbStatus === 'approved') {
        // Notify employer of job approval
        await inAppNotificationService.notifyJobApproved(
          jobWithEmployer.employerId,
          jobId,
          jobWithEmployer.title
        )

        // Send external webhook notification for job approval
        await externalWebhookService.sendEmployerJobApproved({
          userId: jobWithEmployer.employerId,
          email: jobWithEmployer.employer.user.email || '',
          firstName: jobWithEmployer.employer.user.name?.split(' ')[0] || 'there',
          jobId: jobId,
          jobTitle: jobWithEmployer.title,
          jobUrl: `${process.env.NEXT_PUBLIC_APP_URL}/employer/jobs/${jobId}`,
          companyName: jobWithEmployer.employer.companyName
        })

        console.log(`Approval notification sent to employer ${jobWithEmployer.employerId}`)
      } else if (dbStatus === 'rejected') {
        // Notify employer of job rejection
        await inAppNotificationService.notifyJobRejected(
          jobWithEmployer.employerId,
          jobId,
          jobWithEmployer.title,
          adminNotes
        )
      } else if (status === 'reviewing') {
        // Notify employer that job is under review
        await inAppNotificationService.notifyJobUnderReview(
          jobWithEmployer.employerId,
          jobId,
          jobWithEmployer.title
        )

        // Send external webhook notification for job under review
        await externalWebhookService.sendEmployerJobUnderReview({
          userId: jobWithEmployer.employerId,
          email: jobWithEmployer.employer.user.email || '',
          firstName: jobWithEmployer.employer.user.name?.split(' ')[0] || 'there',
          jobId: jobId,
          jobTitle: jobWithEmployer.title,
          companyName: jobWithEmployer.employer.companyName,
          adminNotes: adminNotes,
          reviewStartedAt: new Date().toISOString()
        })

        console.log(`Job under review webhook sent to employer ${jobWithEmployer.employerId}`)
      }

      console.log('📢 IN-APP NOTIFICATION CREATED for job status change:', {
        jobId,
        newStatus: dbStatus,
        employerId: jobWithEmployer.employerId
      })
    } catch (notificationError) {
      console.error('Error creating in-app notifications:', notificationError)
      // Don't fail the entire operation if notifications fail
    }

    // Log the admin action
    await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'job_status_update',
        targetEntity: 'job',
        targetId: jobId,
        details: {
          oldStatus: jobWithEmployer.status,
          newStatus: dbStatus,
          adminNotes,
          flaggedReasons,
          creditRefunded: dbStatus === 'rejected'
        }
      }
    })

    return NextResponse.json({
      success: true,
      job: {
        id: jobId,
        status: dbStatus,
        adminNotes
      }
    })
  } catch (error) {
    console.error('Error updating job status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}