import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ConciergeChatService } from '@/lib/concierge-chat-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Check admin authorization
    const authResult = await requireAuth(['admin', 'super_admin'])(request);
    if (authResult) {
      return authResult;
    }

    const { jobId } = await params;
    const body = await request.json();
    const { candidateIds } = body;

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json(
        { error: 'Candidate IDs must be a non-empty array' },
        { status: 400 }
      );
    }

    // Get admin user ID from auth (simplified - adjust based on your auth system)
    const adminId = 'admin-user-id'; // This should come from your auth system

    // Cherry-pick candidates
    const result = await ConciergeChatService.cherryPickCandidates(
      jobId,
      adminId,
      candidateIds
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error cherry-picking candidates:', error);
    return NextResponse.json(
      { error: 'Failed to cherry-pick candidates' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Check admin authorization
    const authResult = await requireAuth(['admin', 'super_admin'])(request);
    if (authResult) {
      return authResult;
    }

    const { jobId } = await params;

    // Get available candidates for cherry-picking
    const candidates = await ConciergeChatService.getAvailableCandidates(jobId);

    return NextResponse.json({
      candidates
    });
  } catch (error) {
    console.error('Error getting available candidates:', error);
    return NextResponse.json(
      { error: 'Failed to get available candidates' },
      { status: 500 }
    );
  }
}