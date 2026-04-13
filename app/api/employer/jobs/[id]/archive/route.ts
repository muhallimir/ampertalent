import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { inAppNotificationService } from '@/lib/in-app-notification-service'

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
            console.log('🎭 IMPERSONATION: Archive job API called with impersonated user', {
                impersonatedUserId: currentUser.profile?.id,
                impersonatedRole: currentUser.profile?.role
            })
        }

        // Verify employer role
        if (!currentUser.profile || currentUser.profile.role !== 'employer' || !currentUser.profile.employer) {
            console.error('❌ EMPLOYER ACCESS DENIED (Archive Job):', {
                hasProfile: !!currentUser.profile,
                role: currentUser.profile?.role,
                hasEmployer: !!currentUser.profile?.employer,
                isImpersonating: currentUser.isImpersonating
            })
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const employerId = currentUser.profile.employer.userId
        const { id: jobId } = await params

        // Verify job exists and belongs to the employer
        const job = await db.job.findFirst({
            where: {
                id: jobId,
                employerId
            }
        })

        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 })
        }

        // Check if job is already archived
        if (job.isArchived) {
            return NextResponse.json({ error: 'Job is already archived' }, { status: 400 })
        }

        // Archive the job
        const updatedJob = await db.job.update({
            where: {
                id: jobId
            },
            data: {
                isArchived: true,
                archivedAt: new Date(),
                archivedBy: currentUser.profile.id
            },
            include: {
                _count: {
                    select: {
                        applications: true
                    }
                },
                applications: {
                    select: {
                        seeker: {
                            select: {
                                userId: true,
                                user: {
                                    select: {
                                        id: true
                                    }
                                }
                            }
                        }
                    }
                },
                employer: {
                    select: {
                        companyName: true
                    }
                }
            }
        })

        // Send archive notifications to all seekers who applied to this job
        const notificationPromises = updatedJob.applications.map(async (application) => {
            try {
                await inAppNotificationService.createNotification({
                    userId: application.seeker.user.id,
                    type: 'job_archived',
                    title: 'Job Archived',
                    message: `The job "${updatedJob.title}" at ${updatedJob.employer.companyName} has been archived and is no longer accepting applications.`,
                    data: {
                        jobId: updatedJob.id,
                        jobTitle: updatedJob.title,
                        companyName: updatedJob.employer.companyName,
                        archivedAt: updatedJob.archivedAt?.toISOString()
                    },
                    priority: 'medium',
                    actionUrl: `/seeker/jobs/${updatedJob.id}`
                })
            } catch (error) {
                console.error('❌ Failed to send archive notification to seeker:', application.seeker.user.id, error)
            }
        })

        // Wait for all notifications to be sent (don't block the response if they fail)
        try {
            await Promise.all(notificationPromises)
            console.log(`📧 Sent archive notifications to ${updatedJob.applications.length} seekers`)
        } catch (error) {
            console.error('❌ Some archive notifications failed to send:', error)
        }

        console.log('✅ Job archived successfully:', {
            jobId: updatedJob.id,
            title: updatedJob.title,
            archivedBy: updatedJob.archivedBy,
            archivedAt: updatedJob.archivedAt,
            employerId: updatedJob.employerId
        })

        return NextResponse.json({
            success: true,
            message: 'Job archived successfully',
            job: {
                id: updatedJob.id,
                title: updatedJob.title,
                isArchived: updatedJob.isArchived,
                archivedAt: updatedJob.archivedAt?.toISOString(),
                archivedBy: updatedJob.archivedBy,
                applicationsCount: updatedJob._count.applications
            }
        })

    } catch (error) {
        console.error('❌ Archive job error:', error)
        return NextResponse.json(
            { error: 'Failed to archive job' },
            { status: 500 }
        )
    }
}

export async function DELETE(
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
            console.log('🎭 IMPERSONATION: Unarchive job API called with impersonated user', {
                impersonatedUserId: currentUser.profile?.id,
                impersonatedRole: currentUser.profile?.role
            })
        }

        // Verify employer role
        if (!currentUser.profile || currentUser.profile.role !== 'employer' || !currentUser.profile.employer) {
            console.error('❌ EMPLOYER ACCESS DENIED (Unarchive Job):', {
                hasProfile: !!currentUser.profile,
                role: currentUser.profile?.role,
                hasEmployer: !!currentUser.profile?.employer,
                isImpersonating: currentUser.isImpersonating
            })
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const employerId = currentUser.profile.employer.userId
        const { id: jobId } = await params

        // Verify job exists and belongs to the employer
        const job = await db.job.findFirst({
            where: {
                id: jobId,
                employerId
            }
        })

        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 })
        }

        // Check if job is archived
        if (!job.isArchived) {
            return NextResponse.json({ error: 'Job is not archived' }, { status: 400 })
        }

        // Restore (unarchive) the job
        const updatedJob = await db.job.update({
            where: {
                id: jobId
            },
            data: {
                isArchived: false,
                archivedAt: null,
                archivedBy: null
            },
            include: {
                applications: {
                    select: {
                        seeker: {
                            select: {
                                user: {
                                    select: {
                                        id: true
                                    }
                                }
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        applications: true
                    }
                },
                employer: {
                    select: {
                        companyName: true
                    }
                }
            }
        })

        console.log('🔍 DEBUG: Job restore - checking applications:', {
            jobId: updatedJob.id,
            jobTitle: updatedJob.title,
            applicationsCount: updatedJob.applications.length,
            applications: updatedJob.applications.map(app => ({
                seekerUserId: app.seeker.user.id
            }))
        })

        // Send restore notifications to all seekers who applied to this job
        const notificationPromises = updatedJob.applications.map(async (application) => {
            try {
                console.log('🔔 DEBUG: Creating restore notification for seeker:', application.seeker.user.id)

                const notification = await inAppNotificationService.createNotification({
                    userId: application.seeker.user.id,
                    type: 'job_restored',
                    title: 'Job Available Again',
                    message: `Great news! The job "${updatedJob.title}" at ${updatedJob.employer.companyName} is now active again and accepting applications.`,
                    data: {
                        jobId: updatedJob.id,
                        jobTitle: updatedJob.title,
                        companyName: updatedJob.employer.companyName,
                        restoredAt: new Date().toISOString()
                    },
                    priority: 'medium',
                    actionUrl: `/seeker/jobs/${updatedJob.id}`
                })

                console.log('✅ DEBUG: Restore notification created successfully for seeker:', application.seeker.user.id, notification)
            } catch (error) {
                console.error('❌ Failed to send restore notification to seeker:', application.seeker.user.id, error)
            }
        })

        // Wait for all notifications to be sent (don't block the response if they fail)
        try {
            await Promise.all(notificationPromises)
            console.log(`📧 Sent restore notifications to ${updatedJob.applications.length} seekers`)
        } catch (error) {
            console.error('❌ Some restore notifications failed to send:', error)
        }

        console.log('✅ Job restored successfully:', {
            jobId: updatedJob.id,
            title: updatedJob.title,
            restoredBy: currentUser.profile.id,
            employerId: updatedJob.employerId
        })

        return NextResponse.json({
            success: true,
            message: 'Job restored successfully',
            job: {
                id: updatedJob.id,
                title: updatedJob.title,
                isArchived: updatedJob.isArchived,
                archivedAt: updatedJob.archivedAt,
                archivedBy: updatedJob.archivedBy,
                applicationsCount: updatedJob._count.applications
            }
        })

    } catch (error) {
        console.error('❌ Restore job error:', error)
        return NextResponse.json(
            { error: 'Failed to restore job' },
            { status: 500 }
        )
    }
}