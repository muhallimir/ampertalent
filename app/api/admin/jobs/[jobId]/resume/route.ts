import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { currentUser } from '@clerk/nextjs/server';

/**
 * POST /api/admin/jobs/[jobId]/resume
 * Resume a paused job (admin only)
 *
 * This endpoint:
 * 1. Calculates new expiration date based on saved remaining days
 * 2. Sets job status back to 'approved'
 * 3. Makes job visible to seekers again
 * 4. Remaining days count from the moment of resume
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
        pausedAt: true,
        pausedDaysRemaining: true,
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

    // Validate job can be resumed
    if (job.status !== 'paused') {
      return NextResponse.json(
        { error: 'Only paused jobs can be resumed' },
        { status: 400 }
      );
    }

    if (!job.isPaused) {
      return NextResponse.json(
        { error: 'Job is not currently paused' },
        { status: 400 }
      );
    }

    if (!job.pausedDaysRemaining || job.pausedDaysRemaining <= 0) {
      return NextResponse.json(
        { error: 'Invalid paused days remaining value' },
        { status: 400 }
      );
    }

    // Calculate new expiration date
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + (job.pausedDaysRemaining * 24 * 60 * 60 * 1000));

    // Update job to active state
    const updatedJob = await db.job.update({
      where: { id: jobId },
      data: {
        status: 'approved',
        isPaused: false,
        resumedAt: now,
        expiresAt: newExpiresAt
      },
      select: {
        id: true,
        title: true,
        status: true,
        isPaused: true,
        resumedAt: true,
        expiresAt: true,
        pausedDaysRemaining: true
      }
    });

    // Calculate time paused
    const pausedDuration = job.pausedAt
      ? Math.floor((now.getTime() - new Date(job.pausedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Log admin action
    await db.adminActionLog.create({
      data: {
        adminId: userProfile.id,
        actionType: 'job_resumed',
        targetEntity: 'job',
        targetId: jobId,
        details: {
          jobTitle: job.title,
          companyName: job.employer.companyName,
          pausedDaysRemaining: job.pausedDaysRemaining,
          newExpiresAt: newExpiresAt,
          resumedAt: now,
          pausedAt: job.pausedAt,
          daysPaused: pausedDuration
        }
      }
    });

    return NextResponse.json({
      success: true,
      job: updatedJob,
      message: `Job resumed successfully. Will expire on ${newExpiresAt.toLocaleDateString()}.`,
      details: {
        daysRestored: job.pausedDaysRemaining,
        daysPaused: pausedDuration,
        newExpiresAt: newExpiresAt
      }
    });

  } catch (error) {
    console.error('Error resuming job:', error);
    return NextResponse.json(
      { error: 'Failed to resume job' },
      { status: 500 }
    );
  }
}
