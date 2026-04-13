import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { inAppNotificationService } from '@/lib/in-app-notification-service'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is an employer
    if (currentUser.profile.role !== 'employer') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { jobId, seekerId, message } = body

    if (!jobId || !seekerId) {
      return NextResponse.json({ error: 'Job ID and Seeker ID are required' }, { status: 400 })
    }

    // Verify the job belongs to the employer
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        employerId: currentUser.profile.id,
        status: 'approved'
      }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found or not accessible' }, { status: 404 })
    }

    // Verify the seeker exists and is not suspended
    const seeker = await db.jobSeeker.findFirst({
      where: {
        userId: seekerId,
        isSuspended: false
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (!seeker) {
      return NextResponse.json({ error: 'Talent profile not found' }, { status: 404 })
    }

    // Check if invitation already exists
    const existingInvitation = await db.application.findFirst({
      where: {
        jobId: jobId,
        seekerId: seekerId
      }
    })

    if (existingInvitation) {
      return NextResponse.json({
        error: 'This talent has already applied or been invited to this position'
      }, { status: 400 })
    }

    // Get employer company information
    const employer = await db.employer.findUnique({
      where: { userId: currentUser.profile.id },
      select: { companyName: true }
    })

    const companyName = employer?.companyName || 'Company'

    // Create notification for the job seeker
    await inAppNotificationService.notifyJobInvitation(
      seekerId,
      jobId,
      job.title,
      companyName,
      message,
      currentUser.profile.email || ''
    )

    console.log('✅ Job invitation notification created:', {
      seekerId,
      jobId,
      jobTitle: job.title,
      companyName
    })

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully'
    })

  } catch (error) {
    console.error('Error sending job invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}