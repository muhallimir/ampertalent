import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ applicationId: string }> }
) {
    try {
        const currentUser = await getCurrentUser(request)

        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            )
        }

        const { applicationId } = await params

        // Get the application with job and employer details
        const application = await db.application.findUnique({
            where: {
                id: applicationId
            },
            select: {
                id: true,
                status: true,
                appliedAt: true,
                coverLetter: true,
                resumeUrl: true,
                interviewStage: true,
                interviewScheduledAt: true,
                interviewCompletedAt: true,
                seeker: {
                    select: {
                        userId: true,
                        user: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
                job: {
                    select: {
                        id: true,
                        title: true,
                        employer: {
                            select: {
                                companyName: true,
                                userId: true
                            }
                        }
                    }
                }
            }
        })

        if (!application) {
            return NextResponse.json(
                { error: 'Application not found' },
                { status: 404 }
            )
        }

        // Check if the current user is authorized to view this application
        // Either the seeker who applied or the employer who owns the job
        const isSeeker = currentUser.profile.id === application.seeker.id
        const isEmployer = currentUser.profile.id === application.job.employer.userId

        if (!isSeeker && !isEmployer) {
            return NextResponse.json(
                { error: 'Unauthorized to view this application' },
                { status: 403 }
            )
        }

        // Return the application data
        return NextResponse.json({
            id: application.id,
            status: application.status,
            appliedAt: application.appliedAt.toISOString(),
            coverLetter: application.coverLetter,
            resumeUrl: application.resumeUrl,
            interviewStage: application.interviewStage,
            interviewScheduledAt: application.interviewScheduledAt?.toISOString() || null,
            interviewCompletedAt: application.interviewCompletedAt?.toISOString() || null,
            seeker: {
                id: application.seeker.id,
                name: application.seeker.user.name
            },
            job: {
                id: application.job.id,
                title: application.job.title,
                employer: {
                    companyName: application.job.employer.companyName
                }
            }
        })

    } catch (error) {
        console.error('Error fetching application:', error)
        return NextResponse.json(
            { error: 'Failed to fetch application' },
            { status: 500 }
        )
    }
}