import { NextRequest, NextResponse } from 'next/server';
import { JobMonitoringService } from '@/lib/job-monitoring';
import { requireAuth } from '@/lib/auth';

/**
 * Resume all job queues
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const authResult = await requireAuth(['admin', 'super_admin'])(request);
    if (authResult) {
      return authResult;
    }

    const result = await JobMonitoringService.resumeAllQueues();

    if (result.success) {
      return NextResponse.json({
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error resuming queues:', error);
    return NextResponse.json(
      { error: 'Failed to resume queues' },
      { status: 500 }
    );
  }
}