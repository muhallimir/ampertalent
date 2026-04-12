import { NextRequest, NextResponse } from 'next/server';
import { JobMonitoringService } from '@/lib/job-monitoring';
import { requireAuth } from '@/lib/auth';

/**
 * Get job execution statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const authResult = await requireAuth(['admin', 'super_admin'])(request);
    if (authResult) {
      return authResult;
    }

    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '7');

    const stats = await JobMonitoringService.getJobStats(days);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting job stats:', error);
    return NextResponse.json(
      { error: 'Failed to get job statistics' },
      { status: 500 }
    );
  }
}