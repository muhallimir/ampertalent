import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

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
            console.log('🎭 IMPERSONATION: Interview history API called with impersonated user', {
                adminId: currentUser.adminProfile?.id,
                impersonatedUserId: currentUser.profile?.id,
                impersonatedRole: currentUser.profile?.role
            })
        }

        // Verify employer role
        if (!currentUser.profile || currentUser.profile.role !== 'employer' || !currentUser.profile.employer) {
            console.error('❌ EMPLOYER ACCESS DENIED (Interview History):', {
                hasProfile: !!currentUser.profile,
                role: currentUser.profile?.role,
                hasEmployer: !!currentUser.profile?.employer,
                isImpersonating: currentUser.isImpersonating
            })
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const employerId = currentUser.profile.employer.userId
        const { id: applicationId } = await params

        // Check if application belongs to employer's job
        const application = await db.application.findFirst({
            where: {
                id: applicationId,
                job: {
                    employerId
                }
            },
            include: {
                interviewHistory: {
                    orderBy: {
                        createdAt: 'asc'
                    }
                },
                job: {
                    select: {
                        title: true,
                        employer: {
                            select: {
                                companyName: true
                            }
                        }
                    }
                },
                seeker: {
                    select: {
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

        // Format the interview history for response
        const formattedHistory = application.interviewHistory.map(history => ({
            id: history.id,
            stage: history.stage,
            formattedStage: formatStageName(history.stage),
            scheduledAt: history.scheduledAt,
            completedAt: history.completedAt,
            notes: history.notes,
            feedback: history.feedback,
            interviewerId: history.interviewerId,
            createdAt: history.createdAt,
            updatedAt: history.updatedAt
        }))

        return NextResponse.json({
            success: true,
            application: {
                id: application.id,
                jobTitle: application.job.title,
                companyName: application.job.employer?.companyName,
                candidateName: `${application.seeker.user.firstName || ''} ${application.seeker.user.lastName || ''}`.trim() || 'Candidate',
                candidateEmail: application.seeker.user.email,
                currentStage: application.interviewStage,
                formattedCurrentStage: application.interviewStage ? formatStageName(application.interviewStage) : null
            },
            interviewHistory: formattedHistory
        })

    } catch (error) {
        console.error('Error fetching interview history:', error)
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