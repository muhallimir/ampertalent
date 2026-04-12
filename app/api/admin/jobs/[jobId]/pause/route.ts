import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';

/**
 * POST /api/admin/jobs/[jobId]/pause
 * Pause a job (admin only)
 *
 * This endpoint:
 * 1. Calculates remaining days until expiration
 * 2. Stores the remaining days for later resume
 * 3. Sets job status to 'paused'
 * 4. Makes job invisible to seekers
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await currentUser();
    const { jobId } = await params;

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile to check admin role
    const userProfile = await db.userProfile.findUnique({
      where: { clerkUserId: user.id },
      select: { id: true, role: true }
    });

    if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'super_admin')) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get the job
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        isPaused: true,
        expiresAt: true,
        title: true,
        employer: {
          select: {
            companyName: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Validate job can be paused
    if (job.status !== 'approved') {
      return NextResponse.json(
        { error: 'Only approved jobs can be paused' },
        { status: 400 }
      );
    }

    if (job.isPaused) {
      return NextResponse.json(
        { error: 'Job is already paused' },
        { status: 400 }
      );
    }

    if (!job.expiresAt) {
      return NextResponse.json(
        { error: 'Job has no expiration date set' },
        { status: 400 }
      );
    }

    // Calculate remaining days
    const now = new Date();
    const expiresAt = new Date(job.expiresAt);
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / millisecondsPerDay);

    // Ensure at least 1 day remaining
    const pausedDaysRemaining = Math.max(1, daysRemaining);

    // Update job to paused state
    const updatedJob = await db.job.update({
      where: { id: jobId },
      data: {
        status: 'paused',
        isPaused: true,
        pausedAt: now,
        pausedBy: userProfile.id,
        pausedDaysRemaining: pausedDaysRemaining
      },
      select: {
        id: true,
        title: true,
        status: true,
        isPaused: true,
        pausedAt: true,
        pausedDaysRemaining: true,
        expiresAt: true
      }
    });

    // Log admin action
    await db.adminActionLog.create({
      data: {
        adminId: userProfile.id,
        actionType: 'job_paused',
        targetEntity: 'job',
        targetId: jobId,
        details: {
          jobTitle: job.title,
          companyName: job.employer.companyName,
          pausedDaysRemaining: pausedDaysRemaining,
          originalExpiresAt: job.expiresAt,
          pausedAt: now
        }
      }
    });

    return NextResponse.json({
      success: true,
      job: updatedJob,
      message: `Job paused successfully. ${pausedDaysRemaining} days remaining will be preserved.`
    });

  } catch (error) {
    console.error('Error pausing job:', error);
    return NextResponse.json(
      { error: 'Failed to pause job' },
      { status: 500 }
    );
  }
}
