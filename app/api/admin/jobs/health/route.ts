import { NextRequest, NextResponse } from 'next/server';
import { JobMonitoringService } from '@/lib/job-monitoring';
import { requireAuth } from '@/lib/auth';

/**
 * Get queue health status
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const authResult = await requireAuth(['admin', 'super_admin'])(request);
    if (authResult) {
      return authResult;
    }

    const health = await JobMonitoringService.getQueueHealth();

    return NextResponse.json(health);
  } catch (error) {
    console.error('Error getting queue health:', error);
    return NextResponse.json(
      { error: 'Failed to get queue health' },
      { status: 500 }
    );
  }
}