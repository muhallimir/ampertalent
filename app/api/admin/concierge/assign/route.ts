import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ConciergeChatService } from '@/lib/concierge-chat-service';

export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const authResult = await requireAuth(['admin', 'super_admin'])(request);
    if (authResult) {
      return authResult;
    }

    const body = await request.json();
    const { jobId, adminId } = body;

    if (!jobId || typeof jobId !== 'string') {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    if (!adminId || typeof adminId !== 'string') {
      return NextResponse.json(
        { error: 'Admin ID is required' },
        { status: 400 }
      );
    }

    // Assign admin to job
    const success = await ConciergeChatService.assignAdminToJob(jobId, adminId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to assign admin to job' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Admin assigned to concierge job successfully'
    });
  } catch (error) {
    console.error('Error assigning admin to job:', error);
    return NextResponse.json(
      { error: 'Failed to assign admin to job' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const authResult = await requireAuth(['admin', 'super_admin'])(request);
    if (authResult) {
      return authResult;
    }

    // Get available concierge admins
    const admins = await ConciergeChatService.getAvailableConciergeAdmins();

    return NextResponse.json({
      admins
    });
  } catch (error) {
    console.error('Error getting available concierge admins:', error);
    return NextResponse.json(
      { error: 'Failed to get available concierge admins' },
      { status: 500 }
    );
  }
}