import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser || !currentUser.clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Job status API called with impersonated user', {
        adminId: currentUser.adminProfile?.id,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    // Verify employer role
    if (!currentUser.profile || currentUser.profile.role !== 'employer' || !currentUser.profile.employer) {
      console.error('❌ EMPLOYER ACCESS DENIED (Job Status):', {
        hasProfile: !!currentUser.profile,
        role: currentUser.profile?.role,
        hasEmployer: !!currentUser.profile?.employer,
        isImpersonating: currentUser.isImpersonating
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const employerId = currentUser.profile.employer.userId
    const { id: jobId } = await params
    const { status } = await request.json()

    console.log('Received status update request:', { jobId, status })

    // Map frontend status values to database enum values
    const statusMapping: Record<string, string> = {
      'active': 'approved',
      'paused': 'draft', // Paused jobs become drafts
      'expired': 'expired',
      'draft': 'draft',
      // Also accept direct database values
      'pending_vetting': 'pending_vetting',
      'approved': 'approved',
      'rejected': 'rejected'
    }

    const mappedStatus = statusMapping[status]
    if (!mappedStatus) {
      console.log('Invalid status received:', status, 'Valid statuses:', Object.keys(statusMapping))
      return NextResponse.json({
        error: `Invalid status: ${status}. Valid statuses are: ${Object.keys(statusMapping).join(', ')}`
      }, { status: 400 })
    }

    console.log('Mapped status:', status, '->', mappedStatus)

    // Check if job belongs to employer
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        employerId
      }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Check if this is a resubmission (rejected -> pending_vetting)
    if (job.status === 'rejected' && mappedStatus === 'pending_vetting') {
      // For rejected job resubmissions, don't deduct additional credit
      // The credit was already refunded when the job was rejected
      console.log('🔄 REJECTED JOB RESUBMISSION VIA STATUS CHANGE: Using refunded credit, no additional deduction needed', {
        jobId,
        previousStatus: job.status,
        newStatus: mappedStatus
      })

      // Log the resubmission via status change
      await db.adminActionLog.create({
        data: {
          adminId: employerId, // Using employer as admin for this log
          actionType: 'job_status_resubmission',
          targetEntity: 'job',
          targetId: jobId,
          details: {
            previousStatus: 'rejected',
            newStatus: 'pending_vetting',
            resubmittedAt: new Date().toISOString(),
            creditDeducted: false, // No additional credit deducted - using refunded credit
            method: 'status_change',
            note: 'Using refunded credit from original rejection'
          }
        }
      })
    }

    // Update job status
    const updatedJob = await db.job.update({
      where: { id: jobId },
      data: {
        status: mappedStatus as any, // Type assertion to handle enum mapping
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      job: {
        id: updatedJob.id,
        status: updatedJob.status
      }
    })

  } catch (error) {
    console.error('Error updating job status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}