import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

// GET /api/admin/analytics/cancellation-survey/data
// Fetch raw survey data for admin dashboard
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
                { success: false, error: 'Only admins can access survey data' },
                { status: 403 }
            );
        }

        // Get query parameters
        const searchParams = request.nextUrl.searchParams;
        const startDateStr = searchParams.get('startDate');
        const endDateStr = searchParams.get('endDate');
        const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
        const offset = parseInt(searchParams.get('offset') || '0');

        // Get filter parameters - can be passed either as direct field names or as filterBy/filterValue
        const primaryReason = searchParams.get('primaryReason');
        const jobSatisfaction = searchParams.get('jobSatisfaction');
        const overallExperience = searchParams.get('overallExperience');
        const recommendToOthers = searchParams.get('recommendToOthers');

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
        const whereClause: any = {
            createdAt: {
                gte: startDate,
                lt: endDate,  // Use lt (less than) instead of lte since we're at the start of next day
            },
        };

        // Add optional filtering based on direct parameters
        if (primaryReason) {
            whereClause.primaryReason = primaryReason;
        }
        if (jobSatisfaction) {
            whereClause.jobSatisfaction = jobSatisfaction;
        }
        if (overallExperience) {
            whereClause.overallExperience = overallExperience;
        }
        if (recommendToOthers) {
            whereClause.recommendToOthers = recommendToOthers;
        }

        // Fetch total count
        const total = await db.cancellationSurvey.count({
            where: whereClause,
        });

        // Fetch paginated data
        const data = await db.cancellationSurvey.findMany({
            where: whereClause,
            select: {
                id: true,
                seekerId: true,
                primaryReason: true,
                reasonOtherText: true,
                jobSatisfaction: true,
                overallExperience: true,
                improvementFeedback: true,
                recommendToOthers: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
            skip: offset,
        });

        const page = Math.floor(offset / limit) + 1;

        return NextResponse.json({
            success: true,
            data,
            total,
            limit,
            offset,
            page,
            hasMore: offset + limit < total,
        });
    } catch (error) {
        console.error('Error fetching cancellation survey data:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch survey data' },
            { status: 500 }
        );
    }
}
