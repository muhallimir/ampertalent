import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify employer role
    const userProfile = await db.userProfile.findUnique({
      where: { clerkUserId: currentUser.clerkUser.id },
      select: { role: true, id: true }
    })

    if (!userProfile || userProfile.role !== 'employer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { jobId } = await request.json()

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    // Verify the job belongs to this employer and is rejected
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        employer: {
          userId: userProfile.id
        },
        status: 'rejected'
      }
    })

    if (!job) {
      return NextResponse.json({ 
        error: 'Job not found or not eligible for resubmission' 
      }, { status: 404 })
    }

    // For rejected job resubmissions, don't deduct additional credit
    // The credit was already refunded when the job was rejected
    console.log('🔄 REJECTED JOB RESUBMISSION: Using refunded credit, no additional deduction needed', {
      jobId,
      jobStatus: job.status
    })

    // Reset job status to pending_vetting for resubmission
    const updatedJob = await db.job.update({
      where: { id: jobId },
      data: {
        status: 'pending_vetting',
        rejectionReason: null, // Clear previous rejection reason
        updatedAt: new Date()
      }
    })

    // Log the resubmission
    await db.adminActionLog.create({
      data: {
        adminId: userProfile.id, // Using employer as admin for this log
        actionType: 'job_resubmission',
        targetEntity: 'job',
        targetId: jobId,
        details: {
          previousStatus: 'rejected',
          newStatus: 'pending_vetting',
          resubmittedAt: new Date().toISOString(),
          creditDeducted: false, // No additional credit deducted - using refunded credit
          note: 'Using refunded credit from original rejection'
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Job resubmitted successfully',
      job: {
        id: updatedJob.id,
        status: updatedJob.status,
        title: updatedJob.title
      }
    })
  } catch (error) {
    console.error('Error resubmitting job:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}