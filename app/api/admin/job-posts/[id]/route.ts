import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { JobStatus } from '@prisma/client'
import { JOB_CATEGORIES } from '@/lib/job-constants'

// Admin GET: Fetch a single job with full details (no ownership check)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.profile?.role || (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const job = await db.job.findUnique({
      where: { id },
      include: {
        employer: {
          include: { user: true }
        },
        _count: {
          select: { applications: true }
        }
      }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

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
      isPaused: job.isPaused || false,
      employer: {
        companyName: job.employer.companyName,
        companyWebsite: job.employer.companyWebsite,
      }
    }

    return NextResponse.json({ job: jobDetail })
  } catch (error) {
    console.error('Error fetching job detail:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Admin PUT: Full job update (no ownership check, no credit logic)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.profile?.role || (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const existingJob = await db.job.findUnique({ where: { id } })
    if (!existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const body = await request.json()

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
      isDraft,
      useCredits,
      selectedPackage,
      checkoutData,
      expiresAt,
      ...otherFields
    } = body

    const updateData: any = {
      ...otherFields,
      updatedAt: new Date()
    }

    // Admin-only fields
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null

    if (requirements !== undefined) updateData.requirements = requirements
    if (skills !== undefined) updateData.skillsRequired = skills
    if (commissionOnly) {
      updateData.payRangeMin = null
      updateData.payRangeMax = null
      updateData.payRangeText = 'Commission Only'
    } else {
      updateData.payRangeText = null
      if (salaryMin !== undefined) updateData.payRangeMin = salaryMin
      if (salaryMax !== undefined) updateData.payRangeMax = salaryMax
    }
    if (location !== undefined) updateData.locationText = location
    if (salaryType !== undefined) updateData.salaryType = salaryType
    if (experienceLevel !== undefined) updateData.experienceLevel = experienceLevel
    if (applicationDeadline !== undefined) updateData.applicationDeadline = applicationDeadline ? new Date(applicationDeadline) : null
    if (website !== undefined) updateData.website = website
    if (linkedinProfile !== undefined) updateData.linkedinProfile = linkedinProfile
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone
    if (benefits !== undefined) updateData.benefits = benefits
    if (body.isCompanyPrivate !== undefined) updateData.isCompanyPrivate = body.isCompanyPrivate

    if (jobType !== undefined) {
      const jobTypeMapping: Record<string, string> = {
        'FULL_TIME': 'FULL_TIME',
        'PART_TIME': 'PART_TIME',
        'PERMANENT': 'PERMANENT',
        'TEMPORARY': 'TEMPORARY',
        'NOT_SPECIFIED': 'NOT_SPECIFIED',
        'full-time': 'FULL_TIME',
        'part-time': 'PART_TIME',
        'contract': 'TEMPORARY',
        'freelance': 'TEMPORARY',
        'project': 'TEMPORARY'
      }
      updateData.type = jobTypeMapping[jobType] || jobType
    }

    // Validate enums
    if (updateData.type && !['FULL_TIME', 'PART_TIME', 'PERMANENT', 'TEMPORARY', 'NOT_SPECIFIED'].includes(updateData.type)) {
      return NextResponse.json({ error: `Invalid job type: ${updateData.type}` }, { status: 400 })
    }
    if (updateData.category && !Object.keys(JOB_CATEGORIES).includes(updateData.category)) {
      return NextResponse.json({ error: `Invalid job category: ${updateData.category}` }, { status: 400 })
    }
    if (updateData.status && !['draft', 'pending_vetting', 'approved', 'paused', 'rejected', 'expired'].includes(updateData.status)) {
      return NextResponse.json({ error: `Invalid status: ${updateData.status}` }, { status: 400 })
    }

    const updatedJob = await db.job.update({
      where: { id },
      data: updateData
    })

    // Log the admin action
    await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'job_full_edit',
        targetEntity: 'job',
        targetId: id,
        details: {
          jobTitle: existingJob.title,
          previousStatus: existingJob.status,
          newStatus: updatedJob.status
        }
      }
    })

    return NextResponse.json({
      success: true,
      job: JSON.parse(JSON.stringify(updatedJob, (_, v) => typeof v === 'bigint' ? Number(v) : v))
    })
  } catch (error) {
    console.error('Error updating job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

interface JobUpdateData {
  expiresAt?: Date | null
  status?: JobStatus
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 15
    const { id } = await params

    // Get current user and verify they're an admin
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.profile?.role || (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { expiresAt, status } = body

    // Validate the job exists
    const job = await db.job.findUnique({
      where: { id }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: JobUpdateData = {}

    if (expiresAt !== undefined) {
      updateData.expiresAt = expiresAt ? new Date(expiresAt) : null
    }

    if (status !== undefined) {
      // Validate status
      const validStatuses = ['draft', 'pending_vetting', 'approved', 'paused', 'rejected', 'expired']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updateData.status = status
    }

    // Update the job
    const updatedJob = await db.job.update({
      where: { id },
      data: updateData
    })

    // Log the admin action
    await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'job_details_updated',
        targetEntity: 'job',
        targetId: id,
        details: {
          jobTitle: job.title,
          changes: JSON.parse(JSON.stringify(updateData)),
          previousExpiresAt: job.expiresAt?.toISOString() || null,
          previousStatus: job.status,
          newExpiresAt: updatedJob.expiresAt?.toISOString() || null,
          newStatus: updatedJob.status
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Job details updated successfully',
      job: {
        id: updatedJob.id,
        expiresAt: updatedJob.expiresAt,
        status: updatedJob.status
      }
    })
  } catch (error) {
    console.error('Error updating job details:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
