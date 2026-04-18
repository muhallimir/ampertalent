import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { hasActiveSubscription } from '@/lib/subscription-check'
import { NotificationService } from '@/lib/notification-service'
import { inAppNotificationService } from '@/lib/in-app-notification-service'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: jobId } = await params
        const currentUser = await getCurrentUser(request)

        if (!currentUser?.clerkUser) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const userProfile = currentUser.profile

        const body = await request.json()
        const { coverLetter, resumeUrl } = body

        if (!resumeUrl) {
            return NextResponse.json({ error: 'Resume is required' }, { status: 400 })
        }

        const job = await db.job.findUnique({
            where: {
                id: jobId,
                status: 'approved',
                isArchived: false,
                expiresAt: { gte: new Date() },
            },
            include: {
                employer: {
                    select: { companyName: true, userId: true },
                },
            },
        })

        if (!job) {
            return NextResponse.json({ error: 'Job not found or no longer available' }, { status: 404 })
        }

        if (!userProfile || userProfile.role !== 'seeker') {
            return NextResponse.json({ error: 'Only job seekers can apply to jobs' }, { status: 403 })
        }

        const seeker = userProfile.jobSeeker
        if (!seeker) {
            return NextResponse.json(
                { error: 'Job seeker profile not found. Please complete your profile first.' },
                { status: 400 }
            )
        }

        const isSubscriptionActive = await hasActiveSubscription(userProfile.id)
        if (!isSubscriptionActive) {
            return NextResponse.json(
                {
                    error: 'Active subscription required',
                    message: 'You need an active subscription to apply to jobs. Please upgrade your membership to continue.',
                    upgradeUrl: '/seeker/subscription',
                },
                { status: 403 }
            )
        }

        if (seeker.isSuspended) {
            return NextResponse.json(
                { error: 'Account suspended', message: 'Your account has been suspended. Please contact support for assistance.' },
                { status: 403 }
            )
        }

        const existingApplication = await db.application.findFirst({
            where: { jobId, seekerId: userProfile.id },
        })

        if (existingApplication) {
            return NextResponse.json({ error: 'You have already applied to this job' }, { status: 409 })
        }

        const application = await db.application.create({
            data: {
                jobId,
                seekerId: userProfile.id,
                resumeUrl,
                coverLetter: coverLetter || null,
                status: 'pending',
            },
            include: {
                job: { select: { title: true, employer: { select: { companyName: true } } } },
                seeker: { select: { userId: true } },
            },
        })

        // Send notifications (non-blocking)
        Promise.allSettled([
            (async () => {
                const employerUser = await db.userProfile.findUnique({
                    where: { id: job.employer.userId },
                    select: { id: true, email: true, firstName: true },
                })

                if (employerUser?.email) {
                    // Check if accepting a job invitation
                    const jobInvitation = await db.notification.findFirst({
                        where: {
                            userId: userProfile.id,
                            type: 'job_invitation',
                            actionUrl: `/seeker/jobs/${jobId}`,
                            read: false,
                        },
                        orderBy: { createdAt: 'desc' },
                    })

                    if (jobInvitation) {
                        await db.notification.update({
                            where: { id: jobInvitation.id },
                            data: { read: true, readAt: new Date() },
                        })
                        await inAppNotificationService.notifyInvitationAccepted(
                            job.employer.userId,
                            jobId,
                            job.title,
                            userProfile.name || 'Candidate',
                            application.id
                        )
                    }

                    await NotificationService.sendNewApplication({
                        userId: employerUser.id,
                        jobId,
                        applicationId: application.id,
                        email: employerUser.email,
                        firstName: employerUser.firstName || 'Employer',
                        jobTitle: job.title,
                        candidateName: userProfile.name || 'Candidate',
                        candidateEmail: userProfile.email || '',
                        companyName: job.employer.companyName,
                        applicationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/employer/jobs/${jobId}/applications`,
                    })
                }

                await inAppNotificationService.notifyNewApplication(
                    job.employer.userId,
                    jobId,
                    job.title,
                    userProfile.name || 'Candidate',
                    application.id
                )

                await inAppNotificationService.notifyAdminNewApplication(
                    jobId,
                    job.title,
                    userProfile.name || 'Candidate',
                    job.employer.companyName,
                    application.id
                )
            })(),
        ]).catch((err) => console.error('Notification error in apply route:', err))

        console.log('New job application:', {
            applicationId: application.id,
            jobId,
            jobTitle: job.title,
            seekerId: userProfile.id,
            seekerName: userProfile.name,
            companyName: job.employer.companyName,
            timestamp: new Date().toISOString(),
        })

        return NextResponse.json({
            success: true,
            applicationId: application.id,
            message: 'Application submitted successfully',
            data: {
                jobTitle: job.title,
                companyName: job.employer.companyName,
                appliedAt: application.appliedAt,
                status: application.status,
            },
        })
    } catch (error) {
        console.error('Error submitting application:', error)
        return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
    }
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: jobId } = await params
        const currentUser = await getCurrentUser(request)

        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const application = await db.application.findFirst({
            where: { jobId, seekerId: currentUser.profile.id },
            select: { id: true, status: true, appliedAt: true, coverLetter: true },
        })

        return NextResponse.json({ hasApplied: !!application, application: application || null })
    } catch (error) {
        console.error('Error checking application status:', error)
        return NextResponse.json({ error: 'Failed to check application status' }, { status: 500 })
    }
}
