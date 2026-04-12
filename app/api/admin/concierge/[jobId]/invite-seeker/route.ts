import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Await params for Next.js 16
    const { jobId } = await params

    const user = await getCurrentUser(request);
    if (!user?.profile || (user.profile.role !== 'admin' && user.profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { seekerId } = await request.json();

    if (!seekerId) {
      return NextResponse.json({ error: 'Seeker ID is required' }, { status: 400 });
    }

    // Verify the job exists and has a concierge request
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        conciergeRequested: true
      },
      include: {
        employer: true
      }
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found or not a concierge job' }, { status: 404 });
    }

    // Verify the seeker exists
    const seeker = await db.userProfile.findFirst({
      where: {
        id: seekerId,
        role: 'seeker'
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    if (!seeker) {
      return NextResponse.json({ error: 'Seeker not found' }, { status: 404 });
    }

    // Store the seeker selection in adminActionLog for persistence
    await db.adminActionLog.create({
      data: {
        adminId: user.profile.id,
        actionType: 'concierge_seeker_selection',
        targetEntity: 'seeker',
        targetId: seekerId,
        details: {
          jobId: job.id,
          jobTitle: job.title,
          companyName: job.employer.companyName,
          seekerName: seeker.name || `${seeker.firstName || ''} ${seeker.lastName || ''}`.trim(),
          seekerEmail: seeker.email,
          selectedBy: user.profile.name || user.profile.email,
          timestamp: new Date().toISOString(),
          tags: [] // Can be enhanced to include tags from request body
        }
      }
    });

    // Create a notification for the seeker about the job invitation
    await db.notification.create({
      data: {
        userId: seekerId,
        type: 'job_invitation',
        title: 'Job Invitation',
        message: `You've been invited to apply for "${job.title}" at ${job.employer.companyName}`,
        data: {
          jobId: job.id,
          jobTitle: job.title,
          companyName: job.employer.companyName,
          invitedBy: 'admin',
          adminId: user.profile.id
        },
        actionUrl: `/seeker/jobs/${job.id}`,
        priority: 'medium'
      }
    });

    // TODO: Send email notification to seeker
    // This would involve using your email service to notify the seeker

    return NextResponse.json({
      message: 'Seeker invited successfully',
      invitation: {
        seekerId,
        jobId,
        invitedAt: new Date(),
        invitedBy: user.profile.id
      }
    });
  } catch (error) {
    console.error('Error inviting seeker:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}