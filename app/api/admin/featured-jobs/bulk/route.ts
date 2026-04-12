import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { requestIds, status } = await request.json()

    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json(
        { error: 'Request IDs are required' },
        { status: 400 }
      )
    }

    if (!status || !['not_added', 'added_to_email'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required' },
        { status: 400 }
      )
    }

    // Extract job IDs from synthetic IDs (format: job_${jobId})
    const jobIds = requestIds.map((requestId: string) =>
      requestId.startsWith('job_') ? requestId.replace('job_', '') : requestId
    )

    // Map new status values to database status values
    let dbStatus = status
    if (status === 'not_added') {
      dbStatus = 'not_started'
    } else if (status === 'added_to_email') {
      dbStatus = 'completed'
    }

    // Build update data
    const updateData: any = {
      featuredStatus: dbStatus
    }

    // Set timestamps based on status
    if (status === 'added_to_email') {
      updateData.isFeatured = true
      updateData.featuredCompletedAt = new Date()
    } else if (status === 'not_added') {
      updateData.isFeatured = false
      updateData.featuredCompletedAt = null
    }

    // Update all jobs in bulk
    const updatedJobs = await db.job.updateMany({
      where: {
        id: {
          in: jobIds
        }
      },
      data: updateData
    })

    // Log the bulk action
    await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'featured_jobs_bulk_update',
        targetEntity: 'featured_job_requests',
        targetId: `bulk_${jobIds.length}_jobs`,
        details: {
          jobIds,
          newStatus: status,
          updatedCount: updatedJobs.count
        }
      }
    })

    return NextResponse.json({
      success: true,
      updatedCount: updatedJobs.count,
      message: `${updatedJobs.count} job(s) updated to ${status.replace('_', ' ')}`
    })

  } catch (error) {
    console.error('Error bulk updating featured job requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}