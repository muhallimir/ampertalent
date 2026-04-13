import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

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

    const { id: jobId } = await params

    // Fetch the job to duplicate
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        employerId: currentUser.profile.id
      },
      select: {
        id: true,
        title: true,
        description: true,
        requirements: true,
        payRangeMin: true,
        payRangeMax: true,
        salaryType: true,
        locationText: true,
        type: true,
        experienceLevel: true,
        category: true,
        skillsRequired: true,
        benefits: true,
        applicationDeadline: true
      }
    })

    // Get employer profile separately
    const employerProfile = await db.employer.findUnique({
      where: { userId: currentUser.profile.id },
      select: {
        companyWebsite: true
      }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Transform the job data to match the form structure
    const duplicateJobData = {
      title: `Copy of ${job.title}`,
      description: job.description,
      requirements: job.requirements,
      salaryMin: job.payRangeMin ? Number(job.payRangeMin) : undefined,
      salaryMax: job.payRangeMax ? Number(job.payRangeMax) : undefined,
      salaryType: job.salaryType as 'hourly' | 'monthly' | 'yearly',
      location: job.locationText,
      jobType: job.type as 'FULL_TIME' | 'PART_TIME' | 'PERMANENT' | 'TEMPORARY',
      experienceLevel: job.experienceLevel as 'entry' | 'mid' | 'senior' | 'lead',
      category: job.category,
      skills: job.skillsRequired || [],
      benefits: job.benefits,
      applicationDeadline: job.applicationDeadline?.toISOString().split('T')[0], // Convert to YYYY-MM-DD format
      website: employerProfile?.companyWebsite,
      linkedinProfile: '', // Will be populated from company profile in the form
      contactPhone: '', // Will be populated from company profile in the form
      isDraft: false
    }

    return NextResponse.json({
      success: true,
      jobData: duplicateJobData
    })

  } catch (error) {
    console.error('Error fetching job for duplication:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}