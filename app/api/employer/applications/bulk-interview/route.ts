import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { notificationService } from '@/lib/notification-service'
import { inAppNotificationService } from '@/lib/in-app-notification-service'
import { realTimeNotificationService } from '@/lib/real-time-notification-service'
import { z } from 'zod'

const bulkInterviewSchema = z.object({
  applicationIds: z.array(z.string()),
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
    const { applicationIds } = bulkInterviewSchema.parse(body)

    // Verify user is an employer and owns these applications
    // Also validate that applications are in appropriate status for bulk interview
    const applications = await db.application.findMany({
      where: {
        id: { in: applicationIds },
        job: {
          employerId
        },
        status: {
          in: ['pending', 'reviewed'] // Only allow bulk interview on applications not already in interview process
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
                name: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    if (applications.length !== applicationIds.length) {
      // Check if some applications were filtered out due to status
      const allApplications = await db.application.findMany({
        where: {
          id: { in: applicationIds },
          job: {
            employerId
          }
        }
      })

      if (allApplications.length !== applicationIds.length) {
        return NextResponse.json(
          { error: 'Some applications not found or unauthorized' },
          { status: 403 }
        )
      } else {
        return NextResponse.json(
          { error: 'Bulk interview can only be applied to applications with "pending" or "reviewed" status' },
          { status: 400 }
        )
      }
    }

    // Update applications to interview status and set interview stage
    const updatePromises = applications.map(async (application: any) => {
      const previousStage = application.interviewStage

      // Update application
      await db.application.update({
        where: { id: application.id },
        data: {
          status: 'interview',
          interviewStage: 'technical_interview',
          updatedAt: new Date()
        }
      })

      // Create interview history entry if stage changed or first time setting stage
      if (previousStage !== 'technical_interview') {
        await db.interviewHistory.create({
          data: {
            applicationId: application.id,
            stage: 'technical_interview',
            notes: 'Bulk moved to technical interview stage',
            interviewerId: currentUser.profile.id,
            feedback: 'Bulk moved to technical interview stage'
          }
        })
      }

      // Send notifications
      const userEmail = application.seeker.user.email
      const employerEmail = currentUser.profile.email

      if (userEmail) {
        try {
          await notificationService.sendInterviewScheduled({
            userId: application.seeker.user.id,
            email: userEmail,
            firstName: application.seeker.user.firstName || 'Candidate',
            jobTitle: application.job.title,
            companyName: application.job.employer?.companyName || 'Company',
            interviewDate: 'TBD', // Bulk actions don't set specific dates
            interviewType: 'Technical Interview',
            jobUrl: `${process.env.NEXT_PUBLIC_APP_URL}/seeker/jobs/${application.job.id}`,
            employerEmail: employerEmail || ''
          })
        } catch (notificationError) {
          console.error('Failed to send interview notification:', notificationError)
        }
      }

      // Send in-app notification
      try {
        await inAppNotificationService.notifyInterviewStageUpdate(
          application.seeker.user.id,
          application.job.id,
          application.job.title,
          application.job.employer?.companyName || 'Company',
          'technical_interview',
          application.id
        )
      } catch (inAppError) {
        console.error('Failed to send in-app interview notification:', inAppError)
      }

      try {
        await realTimeNotificationService.sendInterviewStageUpdate(
          application.seeker.user.id,
          {
            applicationId: application.id,
            jobId: application.job.id,
            jobTitle: application.job.title,
            companyName: application.job.employer?.companyName || 'Company',
            stageKey: 'technical_interview',
            stageLabel: 'Technical Interview',
            status: 'interview'
          }
        )
      } catch (realTimeError) {
        console.error('Failed to broadcast bulk interview update:', realTimeError)
      }

      return application
    })

    await Promise.all(updatePromises)

    // Send webhook notification if configured
    const webhookUrl = process.env.BULK_INTERVIEW_WEBHOOK_URL
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
          type: 'bulk_interview',
          employerId,
          applicationIds,
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
          console.log('✅ Bulk interview webhook notification sent successfully')
        } else {
          console.warn(`⚠️ Bulk interview webhook returned ${response.status}: ${response.statusText}`)
        }
      } catch (webhookError) {
        console.error('Webhook notification failed:', webhookError)
        // Don't fail the main operation if webhook fails
      }
    }

    return NextResponse.json({
      success: true,
      interviewCount: applications.length,
      message: 'Applications moved to interview successfully'
    })

  } catch (error) {
    console.error('Bulk interview error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to move applications to interview' },
      { status: 500 }
    )
  }
}
