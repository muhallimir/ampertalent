import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { inAppNotificationService } from '@/lib/in-app-notification-service'
import { realTimeNotificationService } from '@/lib/real-time-notification-service'
import { z } from 'zod'

const bulkRejectSchema = z.object({
  applicationIds: z.array(z.string()),
  message: z.string().min(1, 'Rejection message is required'),
})

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser || !currentUser.clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!currentUser.profile || currentUser.profile.role !== 'employer') {
      return NextResponse.json({ error: 'Access denied - employer role required' }, { status: 403 })
    }

    if (!currentUser.profile.employer) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 403 })
    }

    const employerId = currentUser.profile.employer.userId
    const body = await request.json()
    const { applicationIds, message } = bulkRejectSchema.parse(body)

    // Verify user is an employer and owns these applications
    const applications = await db.application.findMany({
      where: {
        id: { in: applicationIds },
        job: {
          employerId
        }
      },
      include: {
        job: true,
        seeker: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (applications.length !== applicationIds.length) {
      return NextResponse.json(
        { error: 'Some applications not found or unauthorized' },
        { status: 403 }
      )
    }

    // Update applications to rejected status and set interview stage
    const updatePromises = applications.map(async (application: any) => {
      const previousStage = application.interviewStage

      // Update application
      await db.application.update({
        where: { id: application.id },
        data: {
          status: 'rejected',
          interviewStage: 'offer_rejected',
          updatedAt: new Date()
        }
      })

      // Create interview history entry if stage changed or first time setting stage
      if (previousStage !== 'offer_rejected') {
        await db.interviewHistory.create({
          data: {
            applicationId: application.id,
            stage: 'offer_rejected',
            notes: `Bulk rejected: ${message}`,
            interviewerId: currentUser.profile.id,
            feedback: message
          }
        })
      }

      // Send notifications
      const userEmail = application.seeker.user.email

      if (userEmail) {
        try {
          // For now, skip email notification as the method doesn't exist yet
          // TODO: Implement sendApplicationRejected method in notification service
          console.log(`Bulk rejected notification would be sent to ${userEmail}`)
        } catch (notificationError) {
          console.error('Failed to send rejection notification:', notificationError)
        }
      }

      // Send in-app notification
      try {
        await inAppNotificationService.createNotification({
          userId: application.seeker.user.id,
          type: 'application_status_update',
          title: 'Application Update',
          message: `Your application for ${application.job.title} has been rejected.`,
          data: {
            jobId: application.job.id,
            jobTitle: application.job.title,
            status: 'rejected',
            applicationId: application.id
          },
          priority: 'medium',
          actionUrl: `/seeker/jobs/${application.job.id}`
        })
      } catch (inAppError) {
        console.error('Failed to send in-app rejection notification:', inAppError)
      }

      try {
        await realTimeNotificationService.sendInterviewStageUpdate(
          application.seeker.user.id,
          {
            applicationId: application.id,
            jobId: application.job.id,
            jobTitle: application.job.title,
            companyName: application.job.employer?.companyName || 'Company',
            stageKey: 'offer_rejected',
            stageLabel: 'Offer Declined',
            status: 'rejected'
          }
        )
      } catch (realTimeError) {
        console.error('Failed to broadcast bulk rejection update:', realTimeError)
      }

      return application
    })

    await Promise.all(updatePromises)

    // Send webhook notification if configured
    const webhookUrl = process.env.BULK_REJECTION_WEBHOOK_URL
    if (webhookUrl) {
      try {
        const webhookHeaders: HeadersInit = {
          'Content-Type': 'application/json',
          'User-Agent': 'ampertalent-Webhook/1.0'
        }

        // Add authentication using the same pattern as ExternalWebhookService
        const webhookSecret = process.env.EXTERNAL_WEBHOOK_SECRET
        if (webhookSecret) {
          // Check if secret contains username:password for Basic auth
          if (webhookSecret.includes(':')) {
            // Use Basic authentication (username:password format)
            const basicAuth = Buffer.from(webhookSecret).toString('base64')
            webhookHeaders['Authorization'] = `Basic ${basicAuth}`
          } else {
            // Fallback to Bearer token
            webhookHeaders['Authorization'] = `Bearer ${webhookSecret}`
          }
        }

        const webhookPayload = {
          type: 'bulk_rejection',
          employerId,
          applicationIds,
          message,
          timestamp: new Date().toISOString(),
          applications: applications.map((app: any) => ({
            id: app.id,
            jobTitle: app.job.title,
            applicantEmail: app.seeker.user.email,
            applicantName: app.seeker.user.name
          }))
        }

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: webhookHeaders,
          body: JSON.stringify(webhookPayload)
        })

        if (response.ok) {
          console.log('✅ Bulk rejection webhook notification sent successfully')
        } else {
          console.warn(`⚠️ Bulk rejection webhook returned ${response.status}: ${response.statusText}`)
        }
      } catch (webhookError) {
        console.error('Webhook notification failed:', webhookError)
        // Don't fail the main operation if webhook fails
      }
    }

    return NextResponse.json({
      success: true,
      rejectedCount: applications.length,
      message: 'Applications rejected successfully'
    })

  } catch (error) {
    console.error('Bulk reject error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to reject applications' },
      { status: 500 }
    )
  }
}
