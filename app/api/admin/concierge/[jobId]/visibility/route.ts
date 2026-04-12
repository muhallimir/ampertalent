import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ConciergeChatService } from '@/lib/concierge-chat-service';

export async function PUT(
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
    const { visible } = body;

    if (typeof visible !== 'boolean') {
      return NextResponse.json(
        { error: 'Visible must be a boolean' },
        { status: 400 }
      );
    }

    // Get admin user ID from auth (simplified - adjust based on your auth system)
    const adminId = 'admin-user-id'; // This should come from your auth system

    // Toggle applicant visibility
    const success = await ConciergeChatService.toggleApplicantVisibility(
      jobId,
      adminId,
      visible
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update applicant visibility' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Applicants ${visible ? 'are now visible' : 'are now hidden'} for this job`
    });
  } catch (error) {
    console.error('Error toggling applicant visibility:', error);
    return NextResponse.json(
      { error: 'Failed to toggle applicant visibility' },
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

    // Get applicant visibility status
    const visibilityStatus = await ConciergeChatService.getApplicantVisibility(jobId);

    return NextResponse.json(visibilityStatus);
  } catch (error) {
    console.error('Error getting applicant visibility:', error);
    return NextResponse.json(
      { error: 'Failed to get applicant visibility' },
      { status: 500 }
    );
  }
}