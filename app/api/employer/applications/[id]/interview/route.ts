import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { notificationService } from '@/lib/notification-service'
import { externalWebhookService } from '@/lib/external-webhook-service'
import { inAppNotificationService } from '@/lib/in-app-notification-service'
import { realTimeNotificationService } from '@/lib/real-time-notification-service'

export async function GET(
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
            console.log('🎭 IMPERSONATION: Interview get API called with impersonated user', {
                adminId: currentUser.adminProfile?.id,
                impersonatedUserId: currentUser.profile?.id,
                impersonatedRole: currentUser.profile?.role
            })
        }

        // Verify employer role
        if (!currentUser.profile || currentUser.profile.role !== 'employer' || !currentUser.profile.employer) {
            console.error('❌ EMPLOYER ACCESS DENIED (Interview Get):', {
                hasProfile: !!currentUser.profile,
                role: currentUser.profile?.role,
                hasEmployer: !!currentUser.profile?.employer,
                isImpersonating: currentUser.isImpersonating
            })
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const employerId = currentUser.profile.employer.userId
        const { id: applicationId } = await params

        // Get the application with interview data
        const application = await db.application.findFirst({
            where: {
                id: applicationId,
                job: {
                    employerId
                }
            },
            include: {
                job: {
                    select: {
                        id: true,
                        title: true,
                        employer: {
                            select: {
                                companyName: true
                            }
                        }
                    }
                },
                seeker: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    }
                }
            }
        })

        if (!application) {
            return NextResponse.json({ error: 'Application not found' }, { status: 404 })
        }

        return NextResponse.json({
            id: application.id,
            jobTitle: application.job.title,
            companyName: application.job.employer?.companyName || '',
            candidateName: `${application.seeker.user.firstName || ''} ${application.seeker.user.lastName || ''}`.trim() || 'Candidate',
            candidateEmail: application.seeker.user.email || '',
            currentStage: application.interviewStage,
            formattedCurrentStage: application.interviewStage ? formatStageName(application.interviewStage) : undefined,
            interviewScheduledAt: application.interviewScheduledAt,
            interviewCompletedAt: application.interviewCompletedAt,
            interviewerNotes: application.interviewerNotes,
            nextActionRequired: application.nextActionRequired,
            nextActionDeadline: application.nextActionDeadline
        })

    } catch (error) {
        console.error('Error fetching interview data:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

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
            console.log('🎭 IMPERSONATION: Interview update API called with impersonated user', {
                adminId: currentUser.adminProfile?.id,
                impersonatedUserId: currentUser.profile?.id,
                impersonatedRole: currentUser.profile?.role
            })
        }

        // Verify employer role
        if (!currentUser.profile || currentUser.profile.role !== 'employer' || !currentUser.profile.employer) {
            console.error('❌ EMPLOYER ACCESS DENIED (Interview Update):', {
                hasProfile: !!currentUser.profile,
                role: currentUser.profile?.role,
                hasEmployer: !!currentUser.profile?.employer,
                isImpersonating: currentUser.isImpersonating
            })
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const employerId = currentUser.profile.employer.userId
        const { id: applicationId } = await params
        const body = await request.json()
        const { stage, notes, scheduledAt, completedAt, nextActionRequired, nextActionDeadline } = body

        // Validate required fields
        if (!stage) {
            return NextResponse.json({ error: 'Interview stage is required' }, { status: 400 })
        }

        // Validate stage enum
        const validStages = [
            'initial_screening',
            'technical_interview',
            'behavioral_interview',
            'final_interview',
            'offer_extended',
            'offer_accepted',
            'offer_rejected'
        ]
        if (!validStages.includes(stage)) {
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

        // Get previous stage for history tracking
        const previousStage = application.interviewStage

        // Update application with interview data
        const updateData: any = {
            interviewStage: stage,
            interviewScheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            interviewCompletedAt: completedAt ? new Date(completedAt) : null,
            interviewerNotes: notes || null,
            nextActionRequired: nextActionRequired || null,
            nextActionDeadline: nextActionDeadline ? new Date(nextActionDeadline) : null,
            updatedAt: new Date()
        }

        // Automatically set application status based on interview stage
        if (stage === 'offer_accepted') {
            updateData.status = 'hired'
            console.log(`🎉 OFFER ACCEPTED: Automatically setting application ${applicationId} status to 'hired'`)
        } else if (stage === 'offer_rejected') {
            updateData.status = 'rejected'
            console.log(`❌ OFFER REJECTED: Automatically setting application ${applicationId} status to 'rejected'`)
        } else if (stage === 'offer_extended') {
            // Offer extended - keep as interview status (offer pending)
            updateData.status = 'interview'
            console.log(`📋 OFFER EXTENDED: Setting application ${applicationId} status to 'interview' (offer pending)`)
        } else if (stage === 'initial_screening') {
            // Initial screening is post-review but pre-interview - set to reviewed status
            updateData.status = 'reviewed'
            console.log(`🔍 INITIAL SCREENING: Setting application ${applicationId} status to 'reviewed'`)
        } else if (['technical_interview', 'behavioral_interview', 'final_interview'].includes(stage)) {
            // For actual interview stages, set status to 'interview'
            updateData.status = 'interview'
            console.log(`🎯 INTERVIEW STAGE: Setting application ${applicationId} status to 'interview'`)
        }

        const updatedApplication = await db.application.update({
            where: { id: applicationId },
            data: updateData
        })

        console.log('checking for interview scheduledAt', scheduledAt)
        // Create interview history entry if stage changed
        if (previousStage !== stage) {
            await db.interviewHistory.create({
                data: {
                    applicationId,
                    stage,
                    scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                    completedAt: completedAt ? new Date(completedAt) : null,
                    notes: notes || null,
                    interviewerId: currentUser.profile.id,
                    feedback: notes || null
                }
            })

            console.log(`📝 INTERVIEW HISTORY: Created entry for stage ${stage} on application ${applicationId}`)
        }

        // Send notifications based on stage changes
        const userEmail = application.seeker.user.email
        const employerEmail = currentUser.profile.email

        if (userEmail) {
            try {
                // Send appropriate notification based on stage
                if (stage === 'initial_screening' && !previousStage) {
                    // First interview stage - send scheduled notification
                    await notificationService.sendInterviewScheduled({
                        userId: application.seeker.user.id,
                        email: userEmail,
                        firstName: application.seeker.user.firstName || 'Candidate',
                        jobTitle: application.job.title,
                        companyName: application.job.employer?.companyName || 'Company',
                        interviewDate: scheduledAt ? new Date(scheduledAt).toLocaleString() : 'TBD',
                        interviewType: 'Initial Screening',
                        jobUrl: `${process.env.NEXT_PUBLIC_APP_URL}/seeker/jobs/${application.job.id}`,
                        employerEmail: employerEmail || ''
                    })
                } else if (stage === 'offer_extended') {
                    // Offer extended - send completion notification
                    await notificationService.sendInterviewCompleted({
                        userId: application.seeker.user.id,
                        email: userEmail,
                        firstName: application.seeker.user.firstName || 'Candidate',
                        jobTitle: application.job.title,
                        companyName: application.job.employer?.companyName || 'Company',
                        feedback: notes,
                        nextSteps: nextActionRequired || 'Please review the offer and respond',
                        jobUrl: `${process.env.NEXT_PUBLIC_APP_URL}/seeker/jobs/${application.job.id}`,
                        employerEmail: employerEmail || ''
                    })
                } else if (previousStage && previousStage !== stage) {
                    // Stage changed - send update notification
                    await notificationService.sendInterviewStageUpdate({
                        userId: application.seeker.user.id,
                        email: userEmail,
                        firstName: application.seeker.user.firstName || 'Candidate',
                        jobTitle: application.job.title,
                        companyName: application.job.employer?.companyName || 'Company',
                        stage: formatStageName(stage),
                        notes,
                        nextAction: nextActionRequired,
                        jobUrl: `${process.env.NEXT_PUBLIC_APP_URL}/seeker/jobs/${application.job.id}`,
                        employerEmail: employerEmail || ''
                    })
                }
            } catch (notificationError) {
                console.error('Failed to send interview notification:', notificationError)
                // Don't fail the request if notification fails
            }
        }

        // Send in-app notification to seeker
        try {
            await inAppNotificationService.notifyInterviewStageUpdate(
                application.seeker.user.id,
                application.job.id,
                application.job.title,
                application.job.employer?.companyName || 'Company',
                formatStageName(stage),
                application.id
            )
            console.log('✅ IN-APP NOTIFICATION: Interview stage update sent to seeker')
        } catch (inAppNotificationError) {
            console.error('Failed to send in-app interview notification:', inAppNotificationError)
            // Don't fail the request if in-app notification fails
        }

        try {
            await realTimeNotificationService.sendInterviewStageUpdate(
                application.seeker.user.id,
                {
                    applicationId,
                    jobId: application.job.id,
                    jobTitle: application.job.title,
                    companyName: application.job.employer?.companyName || 'Company',
                    stageKey: stage,
                    stageLabel: formatStageName(stage),
                    status: updateData.status,
                    interviewScheduledAt: updateData.interviewScheduledAt,
                    interviewCompletedAt: updateData.interviewCompletedAt
                }
            )
        } catch (realTimeError) {
            console.error('Failed to broadcast interview stage update:', realTimeError)
        }

        // Send webhook notification to employer
        try {
            if (employerEmail) {
                await externalWebhookService.sendEmployerInterviewUpdate({
                    userId: currentUser.profile.id,
                    email: employerEmail,
                    firstName: currentUser.profile.firstName || 'Employer',
                    jobId: application.job.id,
                    jobTitle: application.job.title,
                    candidateName: `${application.seeker.user.firstName || ''} ${application.seeker.user.lastName || ''}`.trim() || 'Candidate',
                    applicationId: application.id,
                    stage: formatStageName(stage),
                    notes,
                    nextAction: nextActionRequired,
                    companyName: application.job.employer?.companyName || 'Company',
                    applicationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/employer/applications/${application.id}`,
                    candidateEmail: application.seeker.user.email || ''
                })
            }
        } catch (webhookError) {
            console.error('Failed to send employer interview webhook:', webhookError)
            // Don't fail the request if webhook fails
        }

        return NextResponse.json({
            success: true,
            application: {
                id: updatedApplication.id,
                interviewStage: updatedApplication.interviewStage,
                interviewScheduledAt: updatedApplication.interviewScheduledAt,
                interviewCompletedAt: updatedApplication.interviewCompletedAt,
                interviewerNotes: updatedApplication.interviewerNotes,
                nextActionRequired: updatedApplication.nextActionRequired,
                nextActionDeadline: updatedApplication.nextActionDeadline
            }
        })

    } catch (error) {
        console.error('Error updating interview stage:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// Helper function to format stage names for display
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
