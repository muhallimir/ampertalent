import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ seekerId: string }> }
) {
  try {
    // Await params for Next.js 16
    const { seekerId } = await params

    // Find all concierge invitations for this seeker by looking at admin action logs
    const invitations = await prisma.adminActionLog.findMany({
      where: {
        actionType: 'concierge_seeker_selection',
        targetId: seekerId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get job details and chat information for each invitation
    const invitationsWithInfo = await Promise.all(
      invitations.map(async (invitation) => {
        // Extract job ID from details if available
        let jobId: string | null = null;
        try {
          const details = invitation.details as any;
          jobId = details?.jobId || details?.job_id || null;
        } catch (e) {
          // Parse failed, continue without job details
        }

        if (!jobId) return null;

        // Get job details with employer info
        const job = await prisma.job.findUnique({
          where: { id: jobId },
          select: {
            id: true,
            title: true,
            employerId: true,
            employer: {
              select: {
                companyName: true
              }
            }
          }
        });

        if (!job) return null;

        // For now, we'll skip message counting to avoid schema issues
        // TODO: Implement proper message counting once we know the exact schema

        return {
          id: invitation.id,
          jobId: jobId,
          jobTitle: job.title,
          companyName: job.employer?.companyName || 'Unknown Company',
          status: 'active',
          invitedAt: invitation.createdAt.toISOString(),
          lastActivity: undefined,
          hasMessages: false,
          messageCount: 0
        };
      })
    );

    // Filter out null values and remove duplicates by jobId (keep most recent)
    const validInvitations = invitationsWithInfo
      .filter((inv): inv is NonNullable<typeof inv> => inv !== null);

    const uniqueInvitations = validInvitations.reduce((acc, current) => {
      const existingIndex = acc.findIndex(inv => inv.jobId === current.jobId);
      if (existingIndex === -1) {
        acc.push(current);
      } else if (new Date(current.invitedAt) > new Date(acc[existingIndex].invitedAt)) {
        acc[existingIndex] = current;
      }
      return acc;
    }, [] as typeof validInvitations);

    return NextResponse.json({
      success: true,
      invitations: uniqueInvitations
    });

  } catch (error) {
    console.error('Error fetching concierge invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch concierge invitations' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}