import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { inAppNotificationService } from '@/lib/in-app-notification-service'
import { ConciergeService } from '@/lib/concierge-service'
import { JOB_CATEGORIES } from '@/lib/job-constants'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser || !currentUser.clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Job detail API called with impersonated user', {
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    // Verify employer role
    if (!currentUser.profile || currentUser.profile.role !== 'employer' || !currentUser.profile.employer) {
      console.error('❌ EMPLOYER ACCESS DENIED (Job Detail):', {
        hasProfile: !!currentUser.profile,
        role: currentUser.profile?.role,
        hasEmployer: !!currentUser.profile?.employer,
        isImpersonating: currentUser.isImpersonating
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const employerId = currentUser.profile.employer.userId
    const { id: jobId } = await params

    // Fetch the job with employer verification
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        employerId
      },
      include: {
        employer: {
          include: {
            user: true
          }
        },
        emailBlastRequests: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        employerPackages: {
          select: {
            id: true,
            packageType: true,
            purchasedAt: true,
            expiresAt: true
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

    // Get the latest email blast request if it exists
    const emailBlastRequest = job.emailBlastRequests?.[0] || null

    // Check if job has been paid for (has associated package)
    const isPaid = job.employerPackages && job.employerPackages.length > 0
    const paymentInfo = isPaid && job.employerPackages.length > 0 ? {
      isPaid: true,
      packageType: job.employerPackages[0].packageType,
      purchasedAt: job.employerPackages[0].purchasedAt.toISOString(),
      expiresAt: job.employerPackages[0].expiresAt?.toISOString() || null
    } : {
      isPaid: false
    }

    // Get concierge request if it exists
    let conciergeRequest = null
    if (job.conciergeRequested) {
      try {
        conciergeRequest = await ConciergeService.getConciergeRequest(job.id)
      } catch (error) {
        console.error('Error fetching concierge request:', error)
      }
    }

    // Format the response
    const jobDetail = {
      id: job.id,
      title: job.title,
      description: job.description,
      requirements: (job as any).requirements || null,
      category: job.category,
      payRangeMin: job.payRangeMin ? Number(job.payRangeMin) : null,
      payRangeMax: job.payRangeMax ? Number(job.payRangeMax) : null,
      payRangeText: job.payRangeText,
      salaryType: (job as any).salaryType,
      type: job.type,
      experienceLevel: (job as any).experienceLevel,
      applicationDeadline: (job as any).applicationDeadline?.toISOString(),
      skillsRequired: job.skillsRequired,
      benefits: job.benefits,
      website: (job as any).website,
      linkedinProfile: (job as any).linkedinProfile,
      contactPhone: (job as any).contactPhone,
      isFlexibleHours: job.isFlexibleHours,
      hoursPerWeek: job.hoursPerWeek,
      remoteSchedule: job.remoteSchedule,
      locationText: job.locationText,
      status: job.status,
      viewsCount: job.viewsCount,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      expiresAt: job.expiresAt?.toISOString(),
      approvedAt: job.approvedAt?.toISOString(),
      applicationsCount: job._count.applications,
      isCompanyPrivate: (job as any).isCompanyPrivate || false,
      // Archive fields
      isArchived: job.isArchived || false,
      archivedAt: job.archivedAt?.toISOString() || null,
      archivedBy: job.archivedBy || null,
      // Pause fields
      isPaused: job.isPaused || false,
      pausedAt: job.pausedAt?.toISOString() || null,
      pausedBy: job.pausedBy || null,
      pausedDaysRemaining: job.pausedDaysRemaining || null,
      isEmailBlast: job.isEmailBlast || false,
      emailBlastInfo: job.isEmailBlast ? {
        isEmailBlast: true,
        status: emailBlastRequest?.status || 'not_started',
        requestedAt: emailBlastRequest?.createdAt?.toISOString(),
        completedAt: emailBlastRequest?.completedAt?.toISOString(),
        expiresAt: emailBlastRequest?.expiresAt?.toISOString(),
        packageType: 'email_blast',
        hasContent: !!(emailBlastRequest?.content && emailBlastRequest?.content.trim()),
        content: emailBlastRequest?.content || null,
        logoUrl: emailBlastRequest?.logoUrl || null,
        customLink: emailBlastRequest?.customLink || null,
        useJobLink: emailBlastRequest?.useJobLink ?? true
      } : null,
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
      } : null,
      // Payment information
      paymentInfo,
      employer: {
        companyName: job.employer.companyName,
        companyWebsite: job.employer.companyWebsite,
        companyLogoUrl: job.employer.companyLogoUrl,
        companyDescription: job.employer.companyDescription,
        billingAddress: job.employer.billingAddress,
      }
    }

    return NextResponse.json({ job: jobDetail })
  } catch (error) {
    console.error('Error fetching job detail:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let jobId: string | undefined
  let employerId: string | undefined
  let body: any = {}

  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser || !currentUser.clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify employer role
    if (!currentUser.profile || currentUser.profile.role !== 'employer' || !currentUser.profile.employer) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    employerId = currentUser.profile.employer.userId
    const resolvedParams = await params
    jobId = resolvedParams.id
    body = await request.json()

    // Enhanced logging for debugging
    console.log('🔍 DEBUG: Job update request', {
      jobId,
      employerId,
      bodyKeys: Object.keys(body),
      jobType: body.jobType,
      isDraft: body.isDraft
    })

    // Verify job ownership
    const existingJob = await db.job.findFirst({
      where: {
        id: jobId,
        employerId
      }
    })

    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Map form fields to database fields - exclude non-database fields
    const {
      requirements,
      skills,
      salaryMin,
      salaryMax,
      salaryType,
      commissionOnly,
      location,
      jobType,
      experienceLevel,
      applicationDeadline,
      website,
      linkedinProfile,
      contactPhone,
      benefits,
      selectedPackage, // Exclude - not a database field
      checkoutData,    // Exclude - not a database field
      isDraft,         // Exclude - not a database field
      useCredits,      // Exclude - not a database field
      ...otherFields
    } = body

    // Prepare the update data with proper field mapping
    const updateData: any = {
      ...otherFields,
      updatedAt: new Date()
    }

    // Map form fields to database schema fields
    if (requirements !== undefined) {
      updateData.requirements = requirements
    }

    if (skills !== undefined) {
      updateData.skillsRequired = skills
    }

    if (salaryMin !== undefined) {
      updateData.payRangeMin = commissionOnly ? null : salaryMin
    }

    if (salaryMax !== undefined) {
      updateData.payRangeMax = commissionOnly ? null : salaryMax
    }

    // Handle commissionOnly: set payRangeText accordingly
    if (commissionOnly !== undefined) {
      if (commissionOnly) {
        updateData.payRangeText = 'Commission Only'
        updateData.payRangeMin = null
        updateData.payRangeMax = null
      } else {
        // Always clear commission text when unchecked
        updateData.payRangeText = null
      }
    }

    if (location !== undefined) {
      updateData.locationText = location
    }

    if (jobType !== undefined) {
      // Map frontend job type values to database enum values
      const jobTypeMapping: { [key: string]: string } = {
        'FULL_TIME': 'FULL_TIME',
        'PART_TIME': 'PART_TIME',
        'PERMANENT': 'PERMANENT',
        'TEMPORARY': 'TEMPORARY',
        'NOT_SPECIFIED': 'NOT_SPECIFIED',
        // Legacy support for lowercase variants
        'full-time': 'FULL_TIME',
        'part-time': 'PART_TIME',
        'contract': 'TEMPORARY',
        'freelance': 'TEMPORARY',
        'project': 'TEMPORARY'
      }
      updateData.type = jobTypeMapping[jobType] || jobType
    }

    if (salaryType !== undefined) {
      updateData.salaryType = salaryType
    }

    if (experienceLevel !== undefined) {
      updateData.experienceLevel = experienceLevel
    }

    if (applicationDeadline !== undefined) {
      updateData.applicationDeadline = applicationDeadline ? new Date(applicationDeadline) : null
    }

    if (website !== undefined) {
      updateData.website = website
    }

    if (linkedinProfile !== undefined) {
      updateData.linkedinProfile = linkedinProfile
    }

    if (contactPhone !== undefined) {
      updateData.contactPhone = contactPhone
    }

    if (benefits !== undefined) {
      updateData.benefits = benefits
    }

    if (body.isCompanyPrivate !== undefined) {
      updateData.isCompanyPrivate = body.isCompanyPrivate
    }

    // Handle status transitions and billing information based on checkout completion or credit confirmation
    const isCreditConfirmation = body.useCredits === true
    const isRejectedJobResubmission = existingJob.status === 'rejected' && !body.isDraft
    const isNewJobWithCheckout = body.selectedPackage && body.checkoutData && !isRejectedJobResubmission

    console.log('🔍 JOB UPDATE STATUS CHECK:', {
      jobId,
      existingStatus: existingJob.status,
      isCreditConfirmation,
      isRejectedJobResubmission,
      isNewJobWithCheckout,
      isDraft: body.isDraft
    })

    if (isNewJobWithCheckout) {
      // NEW JOB WITH CHECKOUT: Create new package and process billing
      console.log('🎯 NEW JOB CHECKOUT: Processing billing and creating new package', {
        jobId,
        selectedPackage: body.selectedPackage,
        hasCheckoutData: !!body.checkoutData
      })

      updateData.status = 'pending_vetting'

      try {
        // Save billing information to employer profile
        const checkoutData = body.checkoutData
        const billingAddress = `${checkoutData.streetAddress}${checkoutData.apartment ? ', ' + checkoutData.apartment : ''}, ${checkoutData.city}, ${checkoutData.state} ${checkoutData.zipCode}, ${checkoutData.country}`

        console.log('💳 SAVING BILLING INFO:', {
          employerId,
          billingAddress,
          companyName: checkoutData.companyName
        })

        // Update employer with billing information
        await db.employer.update({
          where: { userId: employerId },
          data: {
            billingAddress,
            companyName: checkoutData.companyName || undefined,
            updatedAt: new Date()
          }
        })

        // Create employer package record
        const packageTypeMapping: { [key: string]: string } = {
          'standard': 'starter',
          'premium': 'professional',
          'enterprise': 'enterprise'
        }

        const packageType = packageTypeMapping[body.selectedPackage] || 'starter'
        const listingsCount = packageType === 'starter' ? 1 : packageType === 'professional' ? 3 : 5

        console.log('📦 CREATING NEW PACKAGE:', {
          employerId,
          packageType,
          listingsRemaining: listingsCount
        })

        const employerPackage = await db.employerPackage.create({
          data: {
            employerId: employerId!,
            packageType: packageType as 'starter' | 'professional' | 'enterprise' | 'unlimited',
            listingsRemaining: listingsCount,
            purchasedAt: new Date(),
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
          }
        })

        // Update employer's current package
        await db.employer.update({
          where: { userId: employerId },
          data: {
            currentPackageId: employerPackage.id
          }
        })

        console.log('✅ NEW PACKAGE CREATED AND BILLING SETUP COMPLETE:', {
          packageId: employerPackage.id,
          listingsRemaining: listingsCount
        })

      } catch (billingError) {
        console.error('❌ ERROR PROCESSING NEW JOB BILLING:', {
          error: billingError instanceof Error ? billingError.message : String(billingError),
          employerId,
          selectedPackage: body.selectedPackage
        })
        return NextResponse.json(
          { error: 'Failed to process payment and create package' },
          { status: 500 }
        )
      }

    } else if (isCreditConfirmation || isRejectedJobResubmission) {
      // CREDIT USAGE: Use existing credits for draft publication or rejected job resubmission
      console.log('💳 CREDIT PROCESSING: Publishing job using existing credits', {
        jobId,
        useCredits: body.useCredits,
        isRejectedJobResubmission,
        existingStatus: existingJob.status
      })

      updateData.status = 'pending_vetting'

      if (isRejectedJobResubmission) {
        // For rejected job resubmissions, don't deduct additional credit
        // The credit was already refunded when the job was rejected
        console.log('🔄 REJECTED JOB RESUBMISSION: Using refunded credit, no additional deduction needed', {
          jobId,
          existingStatus: existingJob.status
        })
      } else {
        // For credit confirmations (draft to published), deduct credit
        // Find available package with credits
        const availablePackage = await db.employerPackage.findFirst({
          where: {
            employerId,
            listingsRemaining: { gt: 0 },
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } }
            ]
          },
          orderBy: { createdAt: 'desc' }
        })

        if (!availablePackage) {
          return NextResponse.json(
            { error: 'No credits available. Please purchase a package to publish this job.' },
            { status: 400 }
          )
        }

        // Deduct credit from existing package
        await db.employerPackage.update({
          where: { id: availablePackage.id },
          data: {
            listingsRemaining: availablePackage.listingsRemaining - 1
          }
        })

        console.log('📉 DEDUCTED CREDIT FROM EXISTING PACKAGE:', {
          jobId,
          packageId: availablePackage.id,
          remainingCredits: availablePackage.listingsRemaining - 1,
          reason: 'credit_confirmation'
        })
      }

    } else if (body.isDraft === true) {
      // Explicitly saving as draft
      console.log('💾 DRAFT SAVE: Keeping job in draft status', { jobId })
      updateData.status = 'draft'
    }
    // If neither condition is met, don't change the status

    // Validate critical enum fields before database update
    if (updateData.type && !['FULL_TIME', 'PART_TIME', 'PERMANENT', 'TEMPORARY', 'NOT_SPECIFIED'].includes(updateData.type)) {
      console.error('❌ Invalid job type:', updateData.type)
      return NextResponse.json(
        { error: `Invalid job type: ${updateData.type}` },
        { status: 400 }
      )
    }

    if (updateData.category && !Object.keys(JOB_CATEGORIES).includes(updateData.category)) {
      console.error('❌ Invalid job category:', updateData.category)
      return NextResponse.json(
        { error: `Invalid job category: ${updateData.category}` },
        { status: 400 }
      )
    }

    if (updateData.status && !['draft', 'pending_vetting', 'approved', 'rejected', 'expired'].includes(updateData.status)) {
      console.error('❌ Invalid job status:', updateData.status)
      return NextResponse.json(
        { error: `Invalid job status: ${updateData.status}` },
        { status: 400 }
      )
    }

    console.log('✅ Validated update data:', {
      type: updateData.type,
      category: updateData.category,
      status: updateData.status,
      isDraft: body.isDraft,
      hasCheckoutData: !!body.checkoutData
    })

    // Update the job
    const updatedJob = await db.job.update({
      where: { id: jobId },
      data: updateData
    })

    // Log rejected job resubmission for audit trail
    if (isRejectedJobResubmission && currentUser.profile?.id) {
      try {
        await db.adminActionLog.create({
          data: {
            adminId: currentUser.profile.id, // Using employer profile ID for this log
            actionType: 'job_edit_resubmission',
            targetEntity: 'job',
            targetId: jobId,
            details: {
              previousStatus: 'rejected',
              newStatus: 'pending_vetting',
              resubmittedAt: new Date().toISOString(),
              creditDeducted: false, // No additional credit deducted - using refunded credit
              method: 'job_edit_flow',
              note: 'Using refunded credit from original rejection'
            }
          }
        })
      } catch (logError) {
        console.error('Error logging resubmission:', logError)
        // Don't fail the entire operation if logging fails
      }
    }

    // Create notifications for job resubmission (rejected jobs being resubmitted)
    if (isRejectedJobResubmission && updateData.status === 'pending_vetting') {
      try {
        // Get employer info for notification
        const employer = await db.employer.findUnique({
          where: { userId: employerId },
          select: { companyName: true }
        })

        // Notify admins about job resubmission
        await inAppNotificationService.notifyJobSubmitted(
          jobId,
          updatedJob.title,
          employer?.companyName || 'Unknown Company'
        )

        // Notify employer that job is under review again
        await inAppNotificationService.notifyJobUnderReview(
          employerId!,
          jobId,
          updatedJob.title
        )

        console.log('📢 NOTIFICATIONS CREATED for job resubmission:', {
          jobId,
          jobTitle: updatedJob.title,
          employerId
        })
      } catch (notificationError) {
        console.error('Error creating job resubmission notifications:', notificationError)
        // Don't fail the entire request if notifications fail
      }
    }

    return NextResponse.json({ job: JSON.parse(JSON.stringify(updatedJob, (_, v) => typeof v === 'bigint' ? Number(v) : v)) })
  } catch (error) {
    console.error('❌ Error updating job:', {
      error: error instanceof Error ? error.message : String(error),
      jobId: jobId || 'unknown',
      employerId: employerId || 'unknown'
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser || !currentUser.clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify employer role
    if (!currentUser.profile || currentUser.profile.role !== 'employer' || !currentUser.profile.employer) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const employerId = currentUser.profile.employer.userId
    const { id: jobId } = await params

    // Verify job ownership
    const existingJob = await db.job.findFirst({
      where: {
        id: jobId,
        employerId
      }
    })

    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Delete the job
    await db.job.delete({
      where: { id: jobId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting job:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}