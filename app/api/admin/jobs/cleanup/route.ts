import { NextRequest, NextResponse } from 'next/server';
import { JobMonitoringService } from '@/lib/job-monitoring';
import { requireAuth } from '@/lib/auth';

/**
 * Trigger queue cleanup
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const authResult = await requireAuth(['admin', 'super_admin'])(request);
    if (authResult) {
      return authResult;
    }

    const result = await JobMonitoringService.triggerQueueCleanup();

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
    console.error('Error cleaning up queues:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup queues' },
      { status: 500 }
    );
  }
}