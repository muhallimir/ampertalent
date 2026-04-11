/**
 * Job Detail API - GET /api/jobs/[id]
 * Returns full job details including employer info, application count
 */

import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const jobId = params.id

    if (!jobId) {
      return Response.json({ error: 'Job ID is required' }, { status: 400 })
    }

    // Fetch job with full details
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        employer: {
          include: {
            user: true,
          },
        },
      },
    })

    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 })
    }

    // Get application count
    const applicationCount = await db.application.count({
      where: { jobId },
    })

    // Check if current user has saved this job
    let isSaved = false
    try {
      const currentUser = await getCurrentUser(request)
      if (currentUser?.profile?.jobSeeker?.id) {
        const savedJob = await db.savedJob.findUnique({
          where: {
            seekerId_jobId: {
              seekerId: currentUser.profile.jobSeeker.id,
              jobId,
            },
          },
        })
        isSaved = !!savedJob
      }
    } catch {
      // Not authenticated, isSaved remains false
    }

    return Response.json({
      ...job,
      applicationCount,
      isSaved,
      payRangeMin: job.payRangeMin ? Number(job.payRangeMin) : null,
      payRangeMax: job.payRangeMax ? Number(job.payRangeMax) : null,
    })
  } catch (error) {
    console.error('[GET /api/jobs/[id]]:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
