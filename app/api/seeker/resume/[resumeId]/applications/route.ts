import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

/**
 * GET /api/seeker/resume/:resumeId/applications
 * 
 * Fetch all applications tied to a specific resume
 * Returns: Application list with job details, status, timeline
 * 
 * Query Parameters:
 * - status?: string (filter by application status: applied, accepted, rejected, etc.)
 * - page?: number (default: 1)
 * - limit?: number (default: 10)
 * - sort?: 'recent' | 'oldest' (default: recent)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ resumeId: string }> }
) {
    try {
        // Await params for Next.js 16
        const { resumeId } = await params

        // Authenticate user
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized - must be logged in' },
                { status: 401 }
            );
        }

        // Get seeker
        const seeker = await db.jobSeeker.findUnique({
            where: { userId },
            select: { userId: true }
        });

        if (!seeker) {
            return NextResponse.json(
                { error: 'Job seeker profile not found' },
                { status: 404 }
            );
        }

        // Find resume and verify ownership
        const resume = await db.resume.findUnique({
            where: { id: resumeId },
            select: {
                id: true,
                seekerId: true,
                fileName: true,
                createdAt: true,
                deletedAt: true,
                userId: true
            }
        });

        if (!resume) {
            return NextResponse.json(
                { error: 'Resume not found' },
                { status: 404 }
            );
        }

        // Verify authorization - seeker can only access their own data
        if (resume.userId !== userId) {
            return NextResponse.json(
                { error: 'Forbidden - you can only access your own resume applications' },
                { status: 403 }
            );
        }

        // Get query parameters
        const searchParams = request.nextUrl.searchParams;
        const statusFilter = searchParams.get('status') || undefined;
        const pageStr = searchParams.get('page') || '1';
        const limitStr = searchParams.get('limit') || '10';
        const sortBy = searchParams.get('sort') || 'recent';

        const page = Math.max(1, parseInt(pageStr));
        const limit = Math.max(1, Math.min(100, parseInt(limitStr)));
        const skip = (page - 1) * limit;

        // Build where clause
        const whereClause: any = {
            resumeId,
            seeker: {
                userId
            }
        };

        if (statusFilter) {
            whereClause.status = statusFilter;
        }

        // Get total count
        const totalApplications = await db.application.count({
            where: whereClause
        });

        // Get applications with job details
        const applications = await db.application.findMany({
            where: whereClause,
            include: {
                job: {
                    select: {
                        id: true,
                        title: true,
                        company: true,
                        location: true,
                        salaryMin: true,
                        salaryMax: true,
                        type: true,
                        category: true,
                        description: true,
                        postedAt: true,
                        expiresAt: true
                    }
                }
            },
            orderBy: {
                appliedAt: sortBy === 'oldest' ? 'asc' : 'desc'
            },
            skip,
            take: limit
        });

        // Format response
        const formattedApplications = applications.map(app => ({
            id: app.id,
            status: app.status,
            createdAt: app.createdAt,
            appliedAt: app.appliedAt,
            viewedByEmployerAt: app.viewedByEmployerAt,
            interviewScheduledAt: app.interviewScheduledAt,
            acceptedAt: app.acceptedAt,
            rejectedAt: app.rejectedAt,
            rejectionReason: app.rejectionReason,
            withdrawnAt: app.withdrawnAt,
            job: {
                id: app.job.id,
                title: app.job.title,
                company: app.job.company,
                location: app.job.location,
                type: app.job.type,
                category: app.job.category,
                description: app.job.description,
                salary: {
                    min: app.job.salaryMin,
                    max: app.job.salaryMax,
                    currency: 'USD'
                },
                postedAt: app.job.postedAt,
                expiresAt: app.job.expiresAt
            },
            timeline: {
                applied: app.appliedAt,
                viewedByEmployer: app.viewedByEmployerAt,
                interviewScheduled: app.interviewScheduledAt,
                accepted: app.acceptedAt,
                rejected: app.rejectedAt,
                withdrawn: app.withdrawnAt
            }
        }));

        // Calculate analytics
        const acceptedCount = applications.filter(a => a.status === 'accepted').length;
        const rejectedCount = applications.filter(a => a.status === 'rejected').length;
        const successRate = totalApplications > 0 ? (acceptedCount / totalApplications) * 100 : 0;

        return NextResponse.json({
            success: true,
            resume: {
                id: resume.id,
                fileName: resume.fileName,
                createdAt: resume.createdAt,
                deletedAt: resume.deletedAt, // Include if soft-deleted
                isPendingRestore: !!resume.deletedAt // Helper flag
            },
            applications: formattedApplications,
            pagination: {
                page,
                limit,
                total: totalApplications,
                pages: Math.ceil(totalApplications / limit)
            },
            analytics: {
                totalApplications,
                acceptedCount,
                rejectedCount,
                successRate: parseFloat(successRate.toFixed(2)),
                statusBreakdown: {
                    applied: applications.filter(a => a.status === 'applied').length,
                    accepted: acceptedCount,
                    rejected: rejectedCount,
                    withdrawn: applications.filter(a => a.status === 'withdrawn').length,
                    orphaned: applications.filter(a => a.status === 'orphaned').length
                }
            }
        });
    } catch (error) {
        console.error('Error fetching resume applications:', error);
        return NextResponse.json(
            { error: 'Failed to fetch applications' },
            { status: 500 }
        );
    }
}
