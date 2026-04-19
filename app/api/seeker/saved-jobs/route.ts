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

    // Get saved jobs with job details and application status (including archived jobs)
    const savedJobs = await db.savedJob.findMany({
      where: {
        seekerId,
        job: {
          isPaused: false // Exclude paused jobs
        }
      },
      select: {
        id: true,
        savedAt: true,
        job: {
          select: {
            id: true,
            title: true,
            category: true,
            type: true,
            payRangeMin: true,
            payRangeMax: true,
            payRangeText: true,
            description: true,
            skillsRequired: true,
            isFlexibleHours: true,
            locationText: true,
            createdAt: true,
            employerId: true,
            isCompanyPrivate: true, // Critical field for privacy functionality
            // Include archive fields for completeness
            isArchived: true,
            archivedAt: true,
            employer: {
              select: {
                companyName: true,
                companyLogoUrl: true,
                user: {
                  select: {
                    id: true
                  }
                }
              }
            },
            applications: {
              where: {
                seekerId: currentUser.profile.id
              },
              select: {
                id: true,
                status: true,
                appliedAt: true
              }
            }
          }
        }
      },
      orderBy: { savedAt: 'desc' }
    })

    // Transform the data to match JobSearchItem format with application status
    const transformedJobs = savedJobs.map((savedJob: any) => {
      const application = savedJob.job.applications?.[0] // Get the first (and should be only) application

      // Check if company information should be private
      const isCompanyPrivate = savedJob.job.isCompanyPrivate || false;

      // Apply privacy settings to company information
      const displayCompanyName = isCompanyPrivate ? 'Private Company' : savedJob.job.employer.companyName;
      const displayCompanyLogoUrl = isCompanyPrivate ? null : savedJob.job.employer.companyLogoUrl;

      return {
        id: savedJob.job.id,
        title: savedJob.job.title,
        company: displayCompanyName,
        companyLogoUrl: displayCompanyLogoUrl,
        employerId: savedJob.job.employerId,
        location: savedJob.job.locationText || 'Remote',
        type: savedJob.job.type.replace('_', '-') as 'full-time' | 'part-time' | 'project',
        category: savedJob.job.category,
        description: savedJob.job.description,
        skills: savedJob.job.skillsRequired,
        payRange: {
          min: savedJob.job.payRangeMin ? Number(savedJob.job.payRangeMin) : undefined,
          max: savedJob.job.payRangeMax ? Number(savedJob.job.payRangeMax) : undefined,
          text: savedJob.job.payRangeText
        },
        isFlexible: savedJob.job.isFlexibleHours,
        isRemote: savedJob.job.locationText === 'Remote' || savedJob.job.locationText === null,
        isFeatured: false, // Default to false for saved jobs
        applicationCount: 0, // We don't track this for saved jobs view
        postedDate: savedJob.job.createdAt.toISOString(),
        savedAt: savedJob.savedAt.toISOString(),
        isArchived: savedJob.job.isArchived,
        archivedAt: savedJob.job.archivedAt?.toISOString(),
        applicationStatus: application ? {
          hasApplied: true,
          status: application.status,
          appliedAt: application.appliedAt.toISOString()
        } : {
          hasApplied: false
        }
      }
    })

    return Response.json({ savedJobs: transformedJobs })
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
