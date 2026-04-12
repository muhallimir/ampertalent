import { NextRequest, NextResponse } from 'next/server';
import { ConciergeService } from '@/lib/concierge-service';
import { requireAuth } from '@/lib/auth';

/**
 * Get concierge service statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const authResult = await requireAuth(['admin', 'super_admin'])(request);
    if (authResult) {
      return authResult;
    }

    const stats = await ConciergeService.getConciergeStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting concierge stats:', error);
    return NextResponse.json(
      { error: 'Failed to get concierge statistics' },
      { status: 500 }
    );
  }
}