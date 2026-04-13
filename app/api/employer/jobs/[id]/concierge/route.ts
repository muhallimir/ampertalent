import { NextRequest } from 'next/server';
import { ConciergeService } from '@/lib/concierge-service';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { id } = await params

    const jobId = id;

    // Get the job and verify it exists
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        employer: true
      }
    });

    if (!job) {
      return Response.json({ error: 'Job not found' }, { status: 404 });
    }

    // Request concierge service
    const conciergeRequest = await ConciergeService.requestConciergeService(
      jobId,
      job.employerId
    );

    // TODO: Send notification to admin team
    // await notificationService.sendConciergeRequestNotification(conciergeRequest);

    return Response.json({
      success: true,
      conciergeRequest: {
        id: conciergeRequest.id,
        status: conciergeRequest.status,
        createdAt: conciergeRequest.createdAt
      }
    });
  } catch (error) {
    console.error('Error requesting concierge service:', error);

    if (error instanceof Error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json(
      { error: 'Failed to request concierge service' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { id } = await params

    const jobId = id;

    // Get concierge request for this job
    const conciergeRequest = await ConciergeService.getConciergeRequest(jobId);

    if (!conciergeRequest) {
      return Response.json({ error: 'No concierge request found' }, { status: 404 });
    }

    return Response.json({
      conciergeRequest: {
        id: conciergeRequest.id,
        status: conciergeRequest.status,
        assignedAdminId: conciergeRequest.assignedAdminId,
        discoveryCallNotes: conciergeRequest.discoveryCallNotes,
        optimizedJobDescription: conciergeRequest.optimizedJobDescription,
        shortlistedCandidates: conciergeRequest.shortlistedCandidates,
        createdAt: conciergeRequest.createdAt,
        updatedAt: conciergeRequest.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching concierge request:', error);
    return Response.json(
      { error: 'Failed to fetch concierge request' },
      { status: 500 }
    );
  }
}