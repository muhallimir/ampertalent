import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

// GET /api/admin/analytics/cancellation-survey/export
// Export survey data as CSV
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
                { success: false, error: 'Only admins can export survey data' },
                { status: 403 }
            );
        }

        // Get query parameters
        const searchParams = request.nextUrl.searchParams;
        const startDateStr = searchParams.get('startDate');
        const endDateStr = searchParams.get('endDate');
        const format = searchParams.get('format') || 'csv';

        // Parse dates
        if (!startDateStr || !endDateStr) {
            return NextResponse.json(
                { success: false, error: 'startDate and endDate are required' },
                { status: 400 }
            );
        }

        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

        // Move endDate to the end of the day (beginning of next day)
        endDate.setDate(endDate.getDate() + 1);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return NextResponse.json(
                { success: false, error: 'Invalid date format. Use ISO format (YYYY-MM-DD)' },
                { status: 400 }
            );
        }

        // Only support CSV for now
        if (format !== 'csv') {
            return NextResponse.json(
                { success: false, error: 'Only CSV format is supported' },
                { status: 400 }
            );
        }

        // Build where clause - export ALL data by default
        const whereClause = {
            createdAt: {
                gte: startDate,
                lt: endDate,  // Use lt (less than) instead of lte since we're at the start of next day
            },
        };

        // Fetch all data for export with related seeker and subscription info
        const surveys = await db.cancellationSurvey.findMany({
            where: whereClause,
            include: {
                seeker: {
                    select: {
                        user: {
                            select: {
                                email: true,
                            },
                        },
                    },
                },
                subscription: {
                    select: {
                        plan: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        console.log(`[Export] Found ${surveys.length} surveys for date range ${startDateStr} to ${endDateStr}`);

        // Generate CSV content
        const csvContent = generateCSVContent(surveys);

        // Create response with CSV file
        const filename = `cancellation-survey-${startDateStr}-${endDateStr}.csv`;
        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv;charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Error exporting cancellation survey data:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to export survey data' },
            { status: 500 }
        );
    }
}

// Helper functions to format field values
function formatPrimaryReason(reason: string): string {
    return reason
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function formatJobSatisfaction(rating: string): string {
    const satisfactionMap: Record<string, string> = {
        'very_satisfied': 'Very Satisfied',
        'satisfied': 'Satisfied',
        'neutral': 'Neutral',
        'unsatisfied': 'Unsatisfied',
        'very_unsatisfied': 'Very Unsatisfied',
    };
    return satisfactionMap[rating] || rating;
}

function formatOverallExperience(rating: string): string {
    const experienceMap: Record<string, string> = {
        'excellent': 'Excellent',
        'good': 'Good',
        'fair': 'Fair',
        'poor': 'Poor',
        'very_poor': 'Very Poor',
    };
    return experienceMap[rating] || rating;
}

function formatRecommendation(recommendation: string): string {
    const recommendationMap: Record<string, string> = {
        'definitely': 'Definitely',
        'probably': 'Probably',
        'probably_not': 'Probably Not',
        'definitely_not': 'Definitely Not',
    };
    return recommendationMap[recommendation] || recommendation;
}

function generateCSVContent(surveys: any[]): string {
    // CSV headers
    const headers = [
        'Submission Date',
        'Seeker Email',
        'Package Name',
        'Primary Reason for Cancellation',
        'Other Reason Details',
        'Job Satisfaction',
        'Overall Experience',
        'Improvement Feedback',
        'Would Recommend to Others',
    ];

    // Escape CSV values
    const escapeCsvValue = (value: string | null | undefined): string => {
        if (value === null || value === undefined) {
            return '';
        }
        const stringValue = String(value);
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    };

    // Helper to format package name
    const formatPackageName = (plan: string): string => {
        if (!plan || plan === 'none') return 'None';
        return plan
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Build CSV rows
    const rows: string[] = [headers.map(escapeCsvValue).join(',')];

    surveys.forEach((survey) => {
        const seekerEmail = survey.seeker?.user?.email || '';
        const packageName = survey.subscription?.plan ? formatPackageName(survey.subscription.plan) : '';

        const row = [
            escapeCsvValue(new Date(survey.createdAt).toISOString().split('T')[0]),
            escapeCsvValue(seekerEmail),
            escapeCsvValue(packageName),
            escapeCsvValue(formatPrimaryReason(survey.primaryReason)),
            escapeCsvValue(survey.reasonOtherText || ''),
            escapeCsvValue(formatJobSatisfaction(survey.jobSatisfaction)),
            escapeCsvValue(formatOverallExperience(survey.overallExperience)),
            escapeCsvValue(survey.improvementFeedback || ''),
            escapeCsvValue(formatRecommendation(survey.recommendToOthers)),
        ];
        rows.push(row.join(','));
    });

    return rows.join('\n');
}
