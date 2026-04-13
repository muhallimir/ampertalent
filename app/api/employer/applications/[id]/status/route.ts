import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { notificationService } from '@/lib/notification-service'
import { externalWebhookService } from '@/lib/external-webhook-service'
import { inAppNotificationService } from '@/lib/in-app-notification-service'
import { realTimeNotificationService } from '@/lib/real-time-notification-service'

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
      console.log('🎭 IMPERSONATION: Status change API called with impersonated user', {
        adminId: (currentUser as any).adminProfile?.id,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    // Verify employer role
    if (!currentUser.profile || currentUser.profile.role !== 'employer' || !currentUser.profile.employer) {
      console.error('❌ EMPLOYER ACCESS DENIED (Status Change):', {
        hasProfile: !!currentUser.profile,
        role: currentUser.profile?.role,
        hasEmployer: !!currentUser.profile?.employer,
        isImpersonating: currentUser.isImpersonating
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const employerId = currentUser.profile.employer.userId
    const { id: applicationId } = await params
    const { status, interviewStage, isReconsideration } = await request.json()

    // Validate status
    const validStatuses = ['pending', 'reviewed', 'interview', 'rejected', 'hired']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Validate interview stage if provided
    const validInterviewStages = ['initial_screening', 'technical_interview', 'behavioral_interview', 'final_interview', 'offer_extended', 'offer_accepted', 'offer_rejected']
    if (interviewStage && !validInterviewStages.includes(interviewStage)) {
      return NextResponse.json({ error: 'Invalid interview stage' }, { status: 400 })
    }

    // Check if application belongs to employer's job
    const application = await db.application.findFirst({
      where: {
        id: applicationId,
        job: {
          employerId
        }
      },
      include: {
        job: {
          include: {
            employer: true
          }
        },
        seeker: {
          include: {
            user: true
          }
        }
      }
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Update application status
    const updateData: any = {
      status,
      updatedAt: new Date()
    }

    // Add interview stage if provided
    if (interviewStage) {
      updateData.interviewStage = interviewStage
    }

    const updatedApplication = await db.application.update({
      where: { id: applicationId },
      data: updateData
    })

    // Create interview history entry if interview stage was set
    if (interviewStage) {
      try {
        await db.interviewHistory.create({
          data: {
            applicationId,
            stage: interviewStage,
            interviewerId: currentUser.profile.id,
            notes: `Status changed to ${status} with interview stage ${interviewStage}`,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        console.log(`📝 INTERVIEW HISTORY: Created entry for stage ${interviewStage} on application ${applicationId}`)
      } catch (historyError) {
        console.error('Failed to create interview history:', historyError)
        // Don't fail the request if history creation fails
      }
    }

    // If status is 'hired', check if this is the first hire for this job
    // and send job filled webhook
    if (status === 'hired') {
      try {
        // Check if this is the first hire for this job
        const existingHires = await db.application.count({
          where: {
            jobId: application.job.id,
            status: 'hired',
            id: {
              not: applicationId // Exclude the current application we just updated
            }
          }
        })

        // If this is the first hire, send job filled webhook
        if (existingHires === 0) {
          const candidateName = `${application.seeker.user.firstName || ''} ${application.seeker.user.lastName || ''}`.trim() || 'Candidate'

          console.log(`🎉 FIRST HIRE: Job ${application.job.id} (${application.job.title}) has its first hire!`, {
            jobId: application.job.id,
            jobTitle: application.job.title,
            hiredCandidateName: candidateName,
            applicationId: application.id
          })

          // Send job filled webhook to employer
          try {
            const employerEmail = currentUser.profile.email
            if (employerEmail) {
              await externalWebhookService.sendEmployerJobFilled({
                userId: currentUser.profile.id,
                email: employerEmail,
                firstName: currentUser.profile.firstName || 'Employer',
                jobId: application.job.id,
                jobTitle: application.job.title,
                companyName: application.job.employer?.companyName || 'Company',
                hiredCandidateName: candidateName,
                applicationId: application.id,
                filledAt: new Date().toISOString(),
                jobUrl: `${process.env.NEXT_PUBLIC_APP_URL}/employer/jobs/${application.job.id}`,
                hiredCandidateEmail: application.seeker.user.email || ''
              })

              console.log(`✅ JOB FILLED WEBHOOK: Sent for job ${application.job.id}`)
            }
          } catch (jobFilledWebhookError) {
            console.error('Failed to send job filled webhook:', jobFilledWebhookError)
            // Don't fail the request if webhook fails
          }

          // Send in-app notification for job filled
          try {
            await inAppNotificationService.notifyJobFilled(
              currentUser.profile.id,
              application.job.id,
              application.job.title,
              candidateName
            )
            console.log(`✅ IN-APP NOTIFICATION: Job filled notification sent for job ${application.job.id}`)
          } catch (jobFilledInAppError) {
            console.error('Failed to send job filled in-app notification:', jobFilledInAppError)
            // Don't fail the request if in-app notification fails
          }

          // Note: The job is automatically considered "filled" when it has hired applications
          // The frontend and API endpoints check for hired applications to determine filled status
          // No need to update job status as the system uses application status to determine if filled
        }
      } catch (hireCheckError) {
        console.error('Failed to check hire status for job:', hireCheckError)
        // Don't fail the request if hire check fails
      }
    }

    // Send notification to applicant about status change
    try {
      const userEmail = application.seeker.user.email
      if (userEmail) {
        await notificationService.sendApplicationStatusUpdate({
          userId: application.seeker.user.id,
          email: userEmail,
          firstName: application.seeker.user.firstName || 'User',
          jobTitle: application.job.title,
          companyName: application.job.employer?.companyName || 'Company',
          status: status as 'reviewed' | 'interview' | 'rejected' | 'hired',
          jobUrl: `${process.env.NEXT_PUBLIC_APP_URL}/seeker/jobs/${application.job.id}`,
          applicationId: application.id,
          employerEmail: currentUser.profile.email || '',
          isReconsideration: isReconsideration || false
        })
      }
    } catch (notificationError) {
      console.error('Failed to send application status notification:', notificationError)
      // Don't fail the request if notification fails
    }

    // Send in-app notification to seeker about status change
    try {
      await inAppNotificationService.notifyApplicationStatusUpdate(
        application.seeker.user.id,
        application.job.id,
        application.job.title,
        application.job.employer?.companyName || 'Company',
        status as 'reviewed' | 'interview' | 'rejected' | 'hired',
        application.id,
        isReconsideration || false
      )
      console.log('✅ IN-APP NOTIFICATION: Sent application status update to seeker')
    } catch (inAppNotificationError) {
      console.error('Failed to send in-app application status notification:', inAppNotificationError)
      // Don't fail the request if in-app notification fails
    }

    if (interviewStage) {
      try {
        await realTimeNotificationService.sendInterviewStageUpdate(
          application.seeker.user.id,
          {
            applicationId,
            jobId: application.job.id,
            jobTitle: application.job.title,
            companyName: application.job.employer?.companyName || 'Company',
            stageKey: interviewStage,
            stageLabel: formatStageName(interviewStage),
            status,
            interviewScheduledAt: updatedApplication.interviewScheduledAt,
            interviewCompletedAt: updatedApplication.interviewCompletedAt
          }
        )
      } catch (realTimeError) {
        console.error('Failed to broadcast interview stage update:', realTimeError)
      }
    }

    // Send webhook notification to employer about status change
    try {
      const employerEmail = currentUser.profile.email
      if (employerEmail) {
        await externalWebhookService.sendEmployerApplicationStatus({
          userId: currentUser.profile.id,
          email: employerEmail,
          firstName: currentUser.profile.firstName || 'Employer',
          jobId: application.job.id,
          jobTitle: application.job.title,
          candidateName: `${application.seeker.user.firstName || ''} ${application.seeker.user.lastName || ''}`.trim() || 'Candidate',
          applicationId: application.id,
          status: status as 'reviewed' | 'interview' | 'rejected' | 'hired',
          companyName: application.job.employer?.companyName || 'Company',
          applicationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/employer/applications/${application.id}`,
          candidateEmail: application.seeker.user.email || ''
        })
      }
    } catch (webhookError) {
      console.error('Failed to send employer application status webhook:', webhookError)
      // Don't fail the request if webhook fails
    }

    return NextResponse.json({
      success: true,
      application: {
        id: updatedApplication.id,
        status: updatedApplication.status,
        interviewStage: updatedApplication.interviewStage
      }
    })

  } catch (error) {
    console.error('Error updating application status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function formatStageName(stage: string): string {
  const stageMap: Record<string, string> = {
    'initial_screening': 'Initial Screening',
    'technical_interview': 'Technical Interview',
    'behavioral_interview': 'Behavioral Interview',
    'final_interview': 'Final Interview',
    'offer_extended': 'Offer Extended',
    'offer_accepted': 'Offer Accepted',
    'offer_rejected': 'Offer Declined'
  }
  return stageMap[stage] || stage
}
