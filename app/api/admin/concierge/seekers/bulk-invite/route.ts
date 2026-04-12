import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userProfile = currentUser.profile;

    const { jobId, seekerIds, tags } = await request.json();

    if (!jobId || !seekerIds || !Array.isArray(seekerIds) || seekerIds.length === 0) {
      return NextResponse.json({
        error: 'Invalid request: jobId and seekerIds are required'
      }, { status: 400 });
    }

    // Verify the concierge job exists
    const conciergeJob = await db.conciergeRequest.findFirst({
      where: { jobId: jobId },
      select: {
        id: true,
        status: true,
        jobId: true
      }
    });

    if (!conciergeJob) {
      return NextResponse.json({ error: 'Concierge job not found' }, { status: 404 });
    }

    // Get the actual job details
    const job = await db.job.findUnique({
      where: { id: conciergeJob.jobId },
      include: {
        employer: {
          select: {
            companyName: true
          }
        }
      }
    });

    if (!job) {
      return NextResponse.json({ error: 'Associated job not found' }, { status: 404 });
    }

    // Verify all seekers exist
    const seekers = await db.userProfile.findMany({
      where: {
        id: { in: seekerIds },
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

    if (seekers.length !== seekerIds.length) {
      const foundIds = seekers.map(s => s.id);
      const missingIds = seekerIds.filter(id => !foundIds.includes(id));
      return NextResponse.json({
        error: `Some seekers not found: ${missingIds.join(', ')}`
      }, { status: 400 });
    }

    const results = [];
    const errors = [];

    // Process each seeker invitation
    for (const seeker of seekers) {
      try {
        // Create a concierge selection record (matching individual invite API)
        const invitation = await db.adminActionLog.create({
          data: {
            adminId: currentUser.profile.id,
            actionType: 'concierge_seeker_selection',
            targetEntity: 'seeker',
            targetId: seeker.id,
            details: {
              jobId: job.id, // Use actual job ID, not concierge ID
              jobTitle: job.title,
              companyName: job.employer?.companyName,
              seekerName: seeker.name || `${seeker.firstName} ${seeker.lastName}`,
              seekerEmail: seeker.email,
              selectedBy: currentUser.profile.name || currentUser.profile.email,
              timestamp: new Date().toISOString(),
              tags: tags || [] // Move tags to end to match other API
            }
          }
        });

        // Create a notification for the seeker about the job invitation
        await db.notification.create({
          data: {
            userId: seeker.id,
            type: 'job_invitation',
            title: 'Job Invitation',
            message: `You've been invited to apply for "${job.title}" at ${job.employer?.companyName}`,
            data: {
              jobId: job.id,
              jobTitle: job.title,
              companyName: job.employer?.companyName,
              invitedBy: 'admin',
              adminId: currentUser.profile.id
            },
            actionUrl: `/seeker/jobs/${job.id}`,
            priority: 'medium'
          }
        });

        // TODO: In a real implementation, you would also:
        // 1. Send an email notification to the seeker
        // 2. Create a chat room for this invitation
        // 3. Update seeker tags if provided

        results.push({
          seekerId: seeker.id,
          seekerName: seeker.name || `${seeker.firstName} ${seeker.lastName}`,
          seekerEmail: seeker.email,
          success: true,
          selectionId: invitation.id
        });

      } catch (error) {
        console.error(`Error inviting seeker ${seeker.id}:`, error);
        errors.push({
          seekerId: seeker.id,
          seekerName: seeker.name || `${seeker.firstName} ${seeker.lastName}`,
          error: 'Failed to create selection'
        });
      }
    }

    // Log the bulk selection action
    await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'concierge_bulk_selection',
        targetEntity: 'job',
        targetId: jobId,
        details: {
          jobTitle: job.title,
          seekerCount: seekers.length,
          successCount: results.length,
          errorCount: errors.length,
          selectedSeekers: results.map(r => ({
            seekerId: r.seekerId,
            seekerName: r.seekerName
          })),
          tags: tags || [],
          timestamp: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully selected ${results.length} out of ${seekers.length} seekers for concierge job`,
      results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error processing bulk invitations:', error);
    return NextResponse.json(
      { error: 'Failed to process invitations' },
      { status: 500 }
    );
  }
}