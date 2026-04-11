/**
 * Saved Jobs API - /api/seeker/saved-jobs
 * Allows seekers to save/unsave jobs
 */

import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser || !currentUser.profile?.jobSeeker) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const seekerId = currentUser.profile.jobSeeker.id
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Get saved jobs with pagination
    const savedJobs = await db.savedJob.findMany({
      where: { seekerId },
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
      },
      skip,
      take: limit,
      orderBy: { savedAt: 'desc' },
    })

    // Get total count
    const total = await db.savedJob.count({ where: { seekerId } })

    return Response.json({
      data: savedJobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[GET /api/seeker/saved-jobs]:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser || !currentUser.profile?.jobSeeker) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const seekerId = currentUser.profile.jobSeeker.id
    const { jobId } = await request.json()

    if (!jobId) {
      return Response.json({ error: 'jobId is required' }, { status: 400 })
    }

    // Verify job exists
    const job = await db.job.findUnique({
      where: { id: jobId },
    })

    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 })
    }

    // Check if already saved
    const existing = await db.savedJob.findUnique({
      where: {
        seekerId_jobId: {
          seekerId,
          jobId,
        },
      },
    })

    if (existing) {
      return Response.json({ error: 'Job already saved' }, { status: 409 })
    }

    // Save job
    const savedJob = await db.savedJob.create({
      data: {
        seekerId,
        jobId,
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
      },
    })

    return Response.json(savedJob, { status: 201 })
  } catch (error) {
    console.error('[POST /api/seeker/saved-jobs]:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser || !currentUser.profile?.jobSeeker) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const seekerId = currentUser.profile.jobSeeker.id
    const searchParams = request.nextUrl.searchParams
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return Response.json({ error: 'jobId query parameter is required' }, { status: 400 })
    }

    // Verify the saved job belongs to the user
    const savedJob = await db.savedJob.findUnique({
      where: {
        seekerId_jobId: {
          seekerId,
          jobId,
        },
      },
    })

    if (!savedJob) {
      return Response.json({ error: 'Saved job not found' }, { status: 404 })
    }

    // Delete saved job
    await db.savedJob.delete({
      where: {
        seekerId_jobId: {
          seekerId,
          jobId,
        },
      },
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/seeker/saved-jobs]:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
