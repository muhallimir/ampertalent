import { NextRequest, NextResponse } from 'next/server';
import { JobMonitoringService } from '@/lib/job-monitoring';
import { requireAuth } from '@/lib/auth';

/**
 * Get system performance metrics
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const authResult = await requireAuth(['admin', 'super_admin'])(request);
    if (authResult) {
      return authResult;
    }

    const metrics = await JobMonitoringService.getPerformanceMetrics();

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    return NextResponse.json(
      { error: 'Failed to get performance metrics' },
      { status: 500 }
    );
  }
}