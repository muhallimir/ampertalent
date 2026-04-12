import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

// GET /api/admin/analytics/cancellation-survey/stats
// Fetch aggregated statistics for admin dashboard
export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Verify user is admin or super_admin
        const userProfile = await db.userProfile.findUnique({
            where: { clerkUserId: userId },
        });

        if (!userProfile || !['admin', 'super_admin'].includes(userProfile.role)) {
            return NextResponse.json(
                { success: false, error: 'Only admins can access survey statistics' },
                { status: 403 }
            );
        }

        // Get query parameters
        const searchParams = request.nextUrl.searchParams;
        const startDateStr = searchParams.get('startDate');
        const endDateStr = searchParams.get('endDate');

        // Parse dates
        if (!startDateStr || !endDateStr) {
            return NextResponse.json(
                { success: false, error: 'startDate and endDate are required' },
                { status: 400 }
            );
        }

        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return NextResponse.json(
                { success: false, error: 'Invalid date format. Use ISO format (YYYY-MM-DD)' },
                { status: 400 }
            );
        }

        // Move endDate to the end of the day (beginning of next day)
        endDate.setDate(endDate.getDate() + 1);

        // Build where clause
        const whereClause = {
            createdAt: {
                gte: startDate,
                lt: endDate,  // Use lt (less than) instead of lte since we're at the start of next day
            },
        };

        // Get total responses
        const totalResponses = await db.cancellationSurvey.count({
            where: whereClause,
        });

        // Get breakdowns by primary reason
        const reasonCounts = await db.cancellationSurvey.groupBy({
            by: ['primaryReason'],
            where: whereClause,
            _count: true,
        });

        const primaryReasons: Record<string, number> = {
            found_hiremymom: 0,
            found_other: 0,
            no_suitable_job: 0,
            budget_tight: 0,
            other: 0,
        };

        reasonCounts.forEach((item) => {
            primaryReasons[item.primaryReason] = item._count;
        });

        // Get satisfaction breakdown
        const satisfactionCounts = await db.cancellationSurvey.groupBy({
            by: ['jobSatisfaction'],
            where: whereClause,
            _count: true,
        });

        const satisfactionBreakdown: Record<string, number> = {
            very_satisfied: 0,
            satisfied: 0,
            neutral: 0,
            unsatisfied: 0,
            very_unsatisfied: 0,
        };

        satisfactionCounts.forEach((item) => {
            satisfactionBreakdown[item.jobSatisfaction] = item._count;
        });

        // Get experience breakdown
        const experienceCounts = await db.cancellationSurvey.groupBy({
            by: ['overallExperience'],
            where: whereClause,
            _count: true,
        });

        const experienceBreakdown: Record<string, number> = {
            excellent: 0,
            good: 0,
            fair: 0,
            poor: 0,
            very_poor: 0,
        };

        experienceCounts.forEach((item) => {
            experienceBreakdown[item.overallExperience] = item._count;
        });

        // Get recommendation breakdown
        const recommendationCounts = await db.cancellationSurvey.groupBy({
            by: ['recommendToOthers'],
            where: whereClause,
            _count: true,
        });

        const recommendationBreakdown: Record<string, number> = {
            definitely: 0,
            probably: 0,
            not_sure: 0,
            probably_not: 0,
            definitely_not: 0,
        };

        recommendationCounts.forEach((item) => {
            recommendationBreakdown[item.recommendToOthers] = item._count;
        });

        // Calculate NPS (Net Promoter Score)
        const promoters = recommendationBreakdown.definitely + recommendationBreakdown.probably;
        const detractors = recommendationBreakdown.probably_not + recommendationBreakdown.definitely_not;
        const nps = totalResponses > 0 ? ((promoters - detractors) / totalResponses) * 100 : 0;

        // Calculate satisfaction score (1-5)
        let satisfactionScore = 0;
        if (totalResponses > 0) {
            const weighted =
                satisfactionBreakdown.very_satisfied * 5 +
                satisfactionBreakdown.satisfied * 4 +
                satisfactionBreakdown.neutral * 3 +
                satisfactionBreakdown.unsatisfied * 2 +
                satisfactionBreakdown.very_unsatisfied * 1;
            satisfactionScore = weighted / totalResponses;
        }

        // Calculate experience score (1-5)
        let experienceScore = 0;
        if (totalResponses > 0) {
            const weighted =
                experienceBreakdown.excellent * 5 +
                experienceBreakdown.good * 4 +
                experienceBreakdown.fair * 3 +
                experienceBreakdown.poor * 2 +
                experienceBreakdown.very_poor * 1;
            experienceScore = weighted / totalResponses;
        }

        return NextResponse.json({
            success: true,
            totalResponses,
            nps: parseFloat(nps.toFixed(1)),
            satisfactionScore: parseFloat(satisfactionScore.toFixed(2)),
            experienceScore: parseFloat(experienceScore.toFixed(2)),
            recommendationRate: totalResponses > 0
                ? parseFloat(((promoters / totalResponses) * 100).toFixed(1))
                : 0,
            primaryReasonBreakdown: primaryReasons,
            jobSatisfactionBreakdown: satisfactionBreakdown,
            overallExperienceBreakdown: experienceBreakdown,
            recommendToOthersBreakdown: recommendationBreakdown,
        });
    } catch (error) {
        console.error('Error fetching cancellation survey statistics:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch survey statistics' },
            { status: 500 }
        );
    }
}
