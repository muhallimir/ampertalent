import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { inAppNotificationService } from '@/lib/in-app-notification-service'
import { JOB_CATEGORIES } from '@/lib/job-constants'

export async function POST(request: NextRequest) {
  let employerId: string | undefined

  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser || !currentUser.clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify employer role (allow impersonation of employer accounts)
    if (!currentUser.profile || !currentUser.profile.employer || currentUser.profile.role !== 'employer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    employerId = currentUser.profile.employer.userId

    const data = await request.json()

    // Check if this is a checkout submission (has checkoutData) or credit confirmation
    const isCheckoutSubmission = data.checkoutData && data.selectedPackage
    const isCreditConfirmation = data.useCredits === true
    const selectedPackageId = data.selectedPackage
    const isDuplicating = data.isDuplicating === true

    // For checkout submissions, validate checkout data
    if (isCheckoutSubmission) {
      const { checkoutData } = data
      if (!checkoutData.firstName || !checkoutData.lastName || !checkoutData.email) {
        return NextResponse.json({ error: 'Missing required checkout fields' }, { status: 400 })
      }

      // For development: Skip payment processing and just log the checkout data
      console.log('Development Mode: Checkout data received (payment processing skipped):', {
        name: `${checkoutData.firstName} ${checkoutData.lastName}`,
        email: checkoutData.email,
        selectedPackage: data.selectedPackage,
        paymentMethod: checkoutData.paymentMethod
      })
    }

    // Validate required job fields
    // For drafts, only title is required
    // For published jobs, both title and description are required
    if (!data.title) {
      return NextResponse.json({
        error: 'Missing required field: title is required',
        field: 'title'
      }, { status: 400 })
    }

    if (!data.isDraft && !data.description) {
      return NextResponse.json({
        error: 'Missing required field: description is required for published jobs',
        field: 'description'
      }, { status: 400 })
    }

    // Map form data to database schema with proper JobType handling
    let mappedJobType = 'FULL_TIME' // Default
    if (data.jobType) {
      // Map frontend job type values to database enum values
      const jobTypeMapping: { [key: string]: string } = {
        'FULL_TIME': 'FULL_TIME',
        'PART_TIME': 'PART_TIME',
        'PERMANENT': 'PERMANENT',
        'TEMPORARY': 'TEMPORARY',
        // Legacy support for lowercase variants
        'full-time': 'FULL_TIME',
        'part-time': 'PART_TIME',
        'contract': 'TEMPORARY',
        'freelance': 'TEMPORARY',
        'project': 'TEMPORARY'
      }
      mappedJobType = jobTypeMapping[data.jobType] || data.jobType || 'NOT_SPECIFIED'
    }

    const mappedData = {
      title: data.title,
      description: data.description || (data.isDraft ? '' : ''), // Allow empty description for drafts
      requirements: data.requirements,
      category: data.category || 'OTHER', // Default category if not provided
      experienceLevel: data.experienceLevel,
      payRangeMin: data.commissionOnly ? null : (data.salaryMin || data.payRangeMin),
      payRangeMax: data.commissionOnly ? null : (data.salaryMax || data.payRangeMax),
      payRangeText: data.commissionOnly ? 'Commission Only' : (data.payRangeText || null),
      salaryType: data.salaryType,
      type: mappedJobType,
      skillsRequired: data.skills || data.skillsRequired || [],
      benefits: data.benefits,
      applicationDeadline: data.applicationDeadline,
      website: data.website,
      linkedinProfile: data.linkedinProfile,
      contactPhone: data.contactPhone,
      isFlexibleHours: data.isFlexibleHours || false,
      hoursPerWeek: data.hoursPerWeek,
      remoteSchedule: data.remoteSchedule,
      locationText: data.location || data.locationText || 'Remote',
      conciergeRequested: data.conciergeRequested || false,
      isDraft: data.isDraft || false,
      isCompanyPrivate: data.isCompanyPrivate || false
    }

    console.log('✅ Mapped data with proper JobType:', {
      ...mappedData,
      originalJobType: data.jobType,
      mappedJobType: mappedData.type
    })

    // Validate critical enum fields
    if (!['FULL_TIME', 'PART_TIME', 'PERMANENT', 'TEMPORARY', 'NOT_SPECIFIED'].includes(mappedData.type)) {
      console.error('❌ Invalid job type:', mappedData.type)
      return NextResponse.json(
        { error: `Invalid job type: ${mappedData.type}` },
        { status: 400 }
      )
    }

    if (mappedData.category && !Object.keys(JOB_CATEGORIES).includes(mappedData.category)) {
      console.error('❌ Invalid job category:', mappedData.category)
      return NextResponse.json(
        { error: `Invalid job category: ${mappedData.category}` },
        { status: 400 }
      )
    }

    // If using credits with a specific package, find that package
    let packageToUse = null;
    if (isCreditConfirmation && selectedPackageId) {
      // Find the specific package the user wants to use
      packageToUse = await db.employerPackage.findFirst({
        where: {
          id: selectedPackageId,
          employerId,
          listingsRemaining: { gt: 0 },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      });

      if (!packageToUse) {
        return NextResponse.json(
          { error: 'Selected package not found or has no available credits.' },
          { status: 400 }
        );
      }
    } else {
      // Use any available package (existing logic)
      packageToUse = await db.employerPackage.findFirst({
        where: {
          employerId,
          listingsRemaining: { gt: 0 },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    // Handle billing information and package creation for checkout submissions
    if (isCheckoutSubmission && data.checkoutData) {
      try {
        // Save billing information to employer profile
        const checkoutData = data.checkoutData
        const billingAddress = `${checkoutData.streetAddress}${checkoutData.apartment ? ', ' + checkoutData.apartment : ''}, ${checkoutData.city}, ${checkoutData.state} ${checkoutData.zipCode}, ${checkoutData.country}`

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

        const packageType = packageTypeMapping[data.selectedPackage] || 'starter'
        const listingsCount = packageType === 'starter' ? 1 : packageType === 'professional' ? 3 : 5

        // Ensure employerId is defined
        if (!employerId) {
          throw new Error('Employer ID is required for package creation')
        }

        const employerPackage = await db.employerPackage.create({
          data: {
            employerId: employerId,
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

        // Use the newly created package
        packageToUse = employerPackage

      } catch (billingError) {
        console.error('Error processing billing:', billingError)
        // Don't fail the entire request if billing fails, but log it
      }
    }

    if (!packageToUse && !mappedData.isDraft) {
      return NextResponse.json(
        {
          error: 'No job credits available. Please purchase a package to post this job.',
          requiresPayment: true
        },
        { status: 402 }
      )
    }

    // Check if employer is vetted or has had an approved job (one-time vetting system)
    const employer = await db.employer.findUnique({
      where: { userId: employerId },
      select: {
        isVetted: true,
        companyName: true
      }
    })

    const hasApprovedJob = await db.job.count({
      where: {
        employerId,
        status: 'approved'
      }
    }) > 0

    // When duplicating, always require vetting (even for vetted employers)
    const isEmployerVetted = isDuplicating ? false : (employer?.isVetted || hasApprovedJob)

    // Determine job status based on vetting status and submission type
    let jobStatus = 'draft'
    if (isCheckoutSubmission && data.checkoutData) {
      jobStatus = isEmployerVetted ? 'approved' : 'pending_vetting'
    } else if (isCreditConfirmation) {
      jobStatus = isEmployerVetted ? 'approved' : 'pending_vetting'
    } else if (mappedData.isDraft) {
      jobStatus = 'draft'
    } else {
      jobStatus = isEmployerVetted ? 'approved' : 'pending_vetting'
    }

    // Ensure employerId is defined before job creation
    if (!employerId) {
      throw new Error('Employer ID is required for job creation')
    }

    // Calculate application deadline: 30 days from now for paid jobs, or custom deadline for drafts
    const applicationDeadline = (isCheckoutSubmission || isCreditConfirmation)
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from payment
      : (mappedData.applicationDeadline ? new Date(mappedData.applicationDeadline) : null)

    const isEmailBlastPackage = packageToUse?.packageType === 'email_blast'
    const emailBlastRequestedAt = (!mappedData.isDraft && isEmailBlastPackage) ? new Date() : null
    const emailBlastExpiresAt = (!mappedData.isDraft && isEmailBlastPackage)
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      : null

    // Create the job with employer relation (using connect to fix schema requirement)
    const job = await db.job.create({
      data: {
        employer: {
          connect: {
            userId: employerId
          }
        },
        title: mappedData.title,
        description: mappedData.description,
        requirements: mappedData.requirements || null,
        category: mappedData.category,
        experienceLevel: mappedData.experienceLevel || null,
        payRangeMin: mappedData.payRangeMin ? parseFloat(mappedData.payRangeMin.toString()) : null,
        payRangeMax: mappedData.payRangeMax ? parseFloat(mappedData.payRangeMax.toString()) : null,
        payRangeText: mappedData.payRangeText || null,
        salaryType: mappedData.salaryType || null,
        type: mappedData.type as 'FULL_TIME' | 'PART_TIME' | 'PERMANENT' | 'TEMPORARY',
        skillsRequired: mappedData.skillsRequired || [],
        benefits: mappedData.benefits || null,
        applicationDeadline: applicationDeadline,
        website: mappedData.website || null,
        linkedinProfile: mappedData.linkedinProfile || null,
        contactPhone: mappedData.contactPhone || null,
        isFlexibleHours: mappedData.isFlexibleHours || false,
        hoursPerWeek: mappedData.hoursPerWeek ? parseInt(mappedData.hoursPerWeek.toString()) : null,
        remoteSchedule: mappedData.remoteSchedule || null,
        locationText: mappedData.locationText || 'Remote',
        status: jobStatus as 'draft' | 'pending_vetting' | 'approved' | 'rejected' | 'expired',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        conciergeRequested: mappedData.conciergeRequested || false,
        isCompanyPrivate: mappedData.isCompanyPrivate || false,
        // Email blast fields
        isEmailBlast: isEmailBlastPackage || false,
        ...(isEmailBlastPackage && !mappedData.isDraft && {
          emailBlastStatus: 'not_started' as const,
          emailBlastRequestedAt,
          emailBlastExpiresAt
        })
      }
    })

    console.log('✅ JOB CREATED:', {
      id: job.id,
      title: job.title,
      status: job.status,
      type: job.type
    })

    // Create EmailBlastRequest for admin tracking when applicable (only for non-draft jobs)
    if (!mappedData.isDraft && isEmailBlastPackage && packageToUse) {
      await db.emailBlastRequest.create({
        data: {
          jobId: job.id,
          employerId,
          packageId: packageToUse.id,
          status: 'not_started',
          requestedAt: emailBlastRequestedAt || new Date(),
          expiresAt: emailBlastExpiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          adminNotes: null
        }
      })
      console.log('✅ EMAIL BLAST REQUEST CREATED:', { jobId: job.id, employerId, packageId: packageToUse.id })
    }

    // If not a draft, deduct a job credit (only if packageToUse exists)
    if (jobStatus !== 'draft' && packageToUse) {
      await db.employerPackage.update({
        where: { id: packageToUse.id },
        data: {
          listingsRemaining: packageToUse.listingsRemaining - 1,
          jobIds: [...packageToUse.jobIds, job.id]
        }
      })
      console.log('📉 DEDUCTED JOB CREDIT:', {
        packageId: packageToUse.id,
        remainingCredits: packageToUse.listingsRemaining - 1
      })
    }

    // Create notifications for job submission (only for non-draft jobs)
    if (jobStatus !== 'draft') {
      try {
        // Get employer info for notification
        const employer = await db.employer.findUnique({
          where: { userId: employerId },
          select: { companyName: true }
        })

        if (jobStatus === 'approved') {
          // For vetted employers: notify that job is approved and live
          await inAppNotificationService.notifyJobApproved(
            employerId!,
            job.id,
            job.title
          )
          console.log('📢 VETTED EMPLOYER: Job auto-approved notification sent:', {
            jobId: job.id,
            jobTitle: job.title,
            employerId
          })
        } else {
          // For non-vetted employers: notify admins and employer about review process
          await inAppNotificationService.notifyJobSubmitted(
            job.id,
            job.title,
            employer?.companyName || 'Unknown Company'
          )

          await inAppNotificationService.notifyJobUnderReview(
            employerId!,
            job.id,
            job.title
          )
          console.log('📢 NON-VETTED EMPLOYER: Job under review notifications sent:', {
            jobId: job.id,
            jobTitle: job.title,
            employerId
          })
        }
      } catch (notificationError) {
        console.error('Error creating job submission notifications:', notificationError)
        // Don't fail the entire request if notifications fail
      }
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        title: job.title,
        status: job.status,
        createdAt: job.createdAt.toISOString()
      },
      message: isCheckoutSubmission
        ? 'Job posted successfully! Payment processing completed (development mode).'
        : isCreditConfirmation
          ? 'Job posted successfully using your credits!'
          : 'Job created successfully!'
    })

  } catch (error) {
    console.error('❌ Error creating job:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      employerId: employerId || 'unknown'
    })
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
