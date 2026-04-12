import { NextRequest, NextResponse } from 'next/server';
import { ConciergeService } from '@/lib/concierge-service';
import { requireAuth, getCurrentUser } from '@/lib/auth';

/**
 * Complete concierge service with shortlisted candidates
 */
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

    // Get current admin user
    const currentUser = await getCurrentUser();
    if (!currentUser?.profile?.id) {
      return NextResponse.json(
        { error: 'Admin user not found' },
        { status: 401 }
      );
    }

    const { jobId } = await params;
    const body = await request.json();
    const { shortlistedApplicationIds, notes } = body;

    if (!Array.isArray(shortlistedApplicationIds) || shortlistedApplicationIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one candidate must be shortlisted' },
        { status: 400 }
      );
    }

    const result = await ConciergeService.completeConciergeService(
      jobId,
      currentUser.profile.id,
      shortlistedApplicationIds,
      notes
    );

    if (result.success) {
      return NextResponse.json({
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error completing concierge service:', error);
    return NextResponse.json(
      { error: 'Failed to complete concierge service' },
      { status: 500 }
    );
  }
}