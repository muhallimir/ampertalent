import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { id } = await params

    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { status, adminNotes } = await request.json()
    const requestId = id

    // Extract job ID from synthetic ID (format: job_${jobId})
    const jobId = requestId.startsWith('job_') ? requestId.replace('job_', '') : requestId

    // Get the current job to check its status
    const currentJob = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        featuredStatus: true,
        featuredRequestedAt: true,
        employer: {
          select: {
            companyName: true,
            user: {
              select: {
                email: true
              }
            }
          }
        }
      }
    })

    if (!currentJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Map new status values to database status values
    let dbStatus = status
    if (status === 'not_added') {
      dbStatus = 'not_started'
    } else if (status === 'added_to_email') {
      dbStatus = 'completed'
    }

    // Build update data for the job
    const updateData: any = {
      featuredStatus: dbStatus
    }

    // Set timestamps based on status
    if (status === 'added_to_email') {
      updateData.isFeatured = true
      updateData.featuredCompletedAt = new Date()
    } else if (status === 'not_added') {
      // Keep isFeatured = true so the job remains in the featured jobs management interface
      // Only change the status to not_started
      updateData.featuredCompletedAt = null
      // Remove extension when job is removed from email
      updateData.featuredExtensionGranted = false
      updateData.featuredExtensionExpiresAt = null
    }

    // Update the job's featured status
    const updatedJob = await db.job.update({
      where: { id: jobId },
      data: updateData,
      select: {
        id: true,
        title: true,
        featuredStatus: true,
        featuredRequestedAt: true,
        featuredCompletedAt: true,
        employer: {
          select: {
            companyName: true,
            user: {
              select: {
                email: true
              }
            }
          }
        }
      }
    })

    // Create a response that matches the expected FeaturedJobRequest format
    const updatedRequest = {
      id: requestId,
      jobId: jobId,
      status: updatedJob.featuredStatus,
      adminNotes: adminNotes, // We don't store admin notes in Job model, but return what was sent
      requestedAt: updatedJob.featuredRequestedAt?.toISOString(),
      completedAt: updatedJob.featuredCompletedAt?.toISOString(),
      job: {
        id: updatedJob.id,
        title: updatedJob.title
      },
      employer: {
        companyName: updatedJob.employer.companyName,
        user: {
          email: updatedJob.employer.user.email
        }
      }
    }

    // Log the action
    await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'featured_job_status_update',
        targetEntity: 'featured_job_request',
        targetId: requestId,
        details: {
          jobTitle: updatedRequest.job.title,
          employerName: updatedRequest.employer.companyName,
          newStatus: status,
          adminNotes
        }
      }
    })

    return NextResponse.json({
      success: true,
      request: updatedRequest
    })

  } catch (error) {
    console.error('Error updating featured job request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}