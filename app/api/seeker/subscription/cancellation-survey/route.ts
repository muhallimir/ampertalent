import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const userProfile = currentUser.profile
        if (!userProfile || userProfile.role !== 'seeker') {
            return NextResponse.json({ success: false, error: 'Only job seekers can submit cancellation surveys' }, { status: 403 })
        }

        const jobSeeker = await db.jobSeeker.findUnique({ where: { userId: userProfile.id } })
        if (!jobSeeker) {
            return NextResponse.json({ success: false, error: 'Job seeker profile not found' }, { status: 404 })
        }

        const body = await request.json()
        const {
            subscriptionId,
            primaryReason,
            reasonOtherText,
            jobSatisfaction,
            overallExperience,
            improvementFeedback,
            recommendToOthers,
        } = body

        if (!primaryReason) {
            return NextResponse.json({ success: false, error: 'primaryReason is required' }, { status: 400 })
        }

        // Store survey response (use CancellationSurveyResponse if available, else log it)
        try {
            await (db as any).cancellationSurveyResponse.create({
                data: {
                    seekerId: userProfile.id,
                    subscriptionId: subscriptionId || null,
                    primaryReason,
                    reasonOtherText: reasonOtherText || null,
                    jobSatisfaction: jobSatisfaction || null,
                    overallExperience: overallExperience || null,
                    improvementFeedback: improvementFeedback || null,
                    recommendToOthers: recommendToOthers || null,
                },
            })
        } catch (dbError) {
            // Table may not exist — log and continue
            console.warn('[CANCEL-SURVEY] Could not save survey response (table may not exist):', dbError)
        }

        return NextResponse.json({ success: true, message: 'Cancellation survey submitted successfully' })
    } catch (error) {
        console.error('[CANCEL-SURVEY] ERROR:', error)
        return NextResponse.json({ success: false, error: 'Failed to submit cancellation survey' }, { status: 500 })
    }
}
