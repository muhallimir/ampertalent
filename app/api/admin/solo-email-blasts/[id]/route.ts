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

    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { status, adminNotes } = await request.json()
    const requestId = id

    // Check if request is expired
    const currentRequest = await db.emailBlastRequest.findUnique({
      where: { id: requestId },
      select: { expiresAt: true }
    })

    if (!currentRequest) {
      return NextResponse.json(
        { error: 'Email blast request not found' },
        { status: 404 }
      )
    }

    if (new Date() > currentRequest.expiresAt) {
      return NextResponse.json(
        { error: 'Cannot update expired email blast request' },
        { status: 400 }
      )
    }

    // Update the email blast request
    const updateData: any = {
      status,
      adminNotes
    }

    // Set timestamps based on status
    if (status === 'pending' && !await db.emailBlastRequest.findFirst({
      where: { id: requestId, startedAt: { not: null } }
    })) {
      updateData.startedAt = new Date()
    }

    if (status === 'completed') {
      updateData.completedAt = new Date()
      updateData.emailSentAt = new Date()
    }

    const updatedRequest = await db.emailBlastRequest.update({
      where: { id: requestId },
      data: updateData,
      include: {
        job: {
          select: {
            id: true,
            title: true
          }
        },
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

    // Also update the job's email blast status
    if (status === 'completed') {
      await db.job.update({
        where: { id: updatedRequest.jobId },
        data: {
          isEmailBlast: true,
          emailBlastStatus: 'completed',
          emailBlastCompletedAt: new Date()
        }
      })
    } else if (status === 'pending') {
      await db.job.update({
        where: { id: updatedRequest.jobId },
        data: {
          isEmailBlast: true,
          emailBlastStatus: 'pending'
        }
      })
    }

    // Log the action
    await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'email_blast_status_update',
        targetEntity: 'email_blast_request',
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
    console.error('Error updating email blast request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
