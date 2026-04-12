import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
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

    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { adminNotes } = await request.json()
    const requestId = id

    // Extract job ID from synthetic ID (format: job_${jobId})
    const jobId = requestId.startsWith('job_') ? requestId.replace('job_', '') : requestId

    // Get the current job
    const currentJob = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        expiresAt: true,
        featuredExtensionGranted: true,
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
        { error: 'Featured job not found' },
        { status: 404 }
      )
    }

    if (currentJob.featuredExtensionGranted) {
      return NextResponse.json(
        { error: 'Extension already granted for this job' },
        { status: 400 }
      )
    }

    // Calculate extension expiration (30 days from now)
    const extensionExpiresAt = new Date()
    extensionExpiresAt.setDate(extensionExpiresAt.getDate() + 30)

    // Update the job's extension fields
    const updatedJob = await db.job.update({
      where: { id: jobId },
      data: {
        featuredExtensionGranted: true,
        featuredExtensionExpiresAt: extensionExpiresAt
      },
      select: {
        id: true,
        title: true,
        featuredExtensionGranted: true,
        featuredExtensionExpiresAt: true
      }
    })

    // Create a response that matches the expected format
    const updatedRequest = {
      id: requestId,
      jobId: jobId,
      extensionGranted: true,
      extensionExpiresAt: extensionExpiresAt.toISOString(),
      adminNotes: adminNotes
    }

    // Log the action
    await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'featured_job_extension_granted',
        targetEntity: 'job',
        targetId: jobId,
        details: {
          jobTitle: currentJob.title,
          employerName: currentJob.employer.companyName,
          extensionExpiresAt: extensionExpiresAt.toISOString(),
          adminNotes
        }
      }
    })

    return NextResponse.json({
      success: true,
      request: updatedRequest,
      extensionExpiresAt
    })

  } catch (error) {
    console.error('Error granting featured job extension:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}