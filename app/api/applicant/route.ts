/**
 * Submit Job Application - POST /api/applicant
 * Allows seekers to submit applications to jobs
 */

import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const currentUser = await getCurrentUser(request)

    if (!currentUser || !currentUser.profile?.jobSeeker) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const seekerId = currentUser.profile.jobSeeker.id
    const { jobId, resumeUrl, coverLetter } = await request.json()

    // Validate required fields
    if (!jobId || !resumeUrl) {
      return Response.json(
        { error: 'jobId and resumeUrl are required' },
        { status: 400 }
      )
    }

    // Verify job exists
    const job = await db.job.findUnique({
      where: { id: jobId },
    })

    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 })
    }

    // Verify resume exists and belongs to seeker
    const resume = await db.resume.findUnique({
      where: { id: resumeUrl },
    })

    if (!resume || resume.seekerId !== seekerId) {
      return Response.json({ error: 'Resume not found' }, { status: 404 })
    }

    // Check if already applied
    const existingApplication = await db.application.findFirst({
      where: {
        seekerId,
        jobId,
      },
    })

    if (existingApplication) {
      return Response.json(
        { error: 'You have already applied to this job' },
        { status: 409 }
      )
    }

    // Create application
    const application = await db.application.create({
      data: {
        seekerId,
        jobId,
        resumeUrl: resumeUrl || '',
        coverLetter: coverLetter || '',
        status: 'pending',
      },
      include: {
        job: {
          include: {
            employer: {
              include: {
                user: true,
              },
            },
          },
        },
        resume: true,
      },
    })

    // TODO: Send notification to employer
    // TODO: Send confirmation email to seeker

    return Response.json(application, { status: 201 })
  } catch (error) {
    console.error('[POST /api/applicant]:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Get application details or list of applications
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const applicationId = searchParams.get('id')

    // Get specific application
    if (applicationId) {
      const application = await db.application.findUnique({
        where: { id: applicationId },
        include: {
          job: true,
          resume: true,
        },
      })

      if (!application) {
        return Response.json({ error: 'Application not found' }, { status: 404 })
      }

      // Verify ownership (seeker can view their own, employer can view for their jobs)
      const isSeeker = application.seekerId === currentUser.profile?.jobSeeker?.id
      const isEmployer = application.job.employerId === currentUser.profile?.employer?.id

      if (!isSeeker && !isEmployer) {
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      }

      return Response.json(application)
    }

    // List all applications (endpoint at /api/seeker/applications)
    return Response.json({ error: 'Use /api/seeker/applications for listing' }, { status: 400 })
  } catch (error) {
    console.error('[GET /api/applicant]:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
