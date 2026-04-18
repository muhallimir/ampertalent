import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)

        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (currentUser.profile.role !== 'seeker') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const body = await request.json()
        const { applicationId, jobId, employerId, message } = body

        if (!applicationId || !jobId || !employerId || !message) {
            return NextResponse.json(
                { error: 'Missing required fields: applicationId, jobId, employerId, message' },
                { status: 400 }
            )
        }

        if (message.length > 1000) {
            return NextResponse.json({ error: 'Message cannot exceed 1000 characters' }, { status: 400 })
        }

        const seekerId = currentUser.profile.id

        const application = await db.application.findFirst({
            where: { id: applicationId, seekerId, jobId },
            include: {
                job: {
                    include: {
                        employer: { select: { userId: true, companyName: true } },
                    },
                },
            },
        })

        if (!application) {
            return NextResponse.json(
                { error: 'Application not found or does not belong to you' },
                { status: 404 }
            )
        }

        if (application.job.employer.userId !== employerId) {
            return NextResponse.json({ error: 'Invalid employer ID' }, { status: 400 })
        }

        const existingFollowUp = await db.notification.findFirst({
            where: {
                type: 'follow_up_request',
                data: { path: ['applicationId'], equals: applicationId },
            },
        })

        if (existingFollowUp) {
            return NextResponse.json(
                { error: 'You have already sent a follow-up request for this application' },
                { status: 429 }
            )
        }

        const seekerProfile = await db.userProfile.findFirst({
            where: { id: seekerId },
            select: { name: true },
        })

        if (!seekerProfile) {
            return NextResponse.json({ error: 'Seeker profile not found' }, { status: 404 })
        }

        const notification = await db.notification.create({
            data: {
                userId: employerId,
                type: 'follow_up_request',
                title: 'Follow-up Request Received',
                message: `${seekerProfile.name} has requested a follow-up on their application for ${application.job.title}`,
                data: {
                    applicationId,
                    jobId,
                    seekerId,
                    seekerName: seekerProfile.name,
                    jobTitle: application.job.title,
                    followUpMessage: message,
                },
                actionUrl: `/employer/applications?applicationId=${applicationId}`,
                read: false,
            },
        })

        return NextResponse.json({
            success: true,
            message: 'Follow-up request sent successfully',
            data: { notificationId: notification.id, sentAt: notification.createdAt },
        })
    } catch (error) {
        console.error('Error sending follow-up message:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
