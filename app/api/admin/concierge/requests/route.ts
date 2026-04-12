import { NextRequest } from 'next/server';
import { ConciergeService } from '@/lib/concierge-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    // Get all concierge requests
    const requests = await ConciergeService.getAllConciergeRequests(status);

    return Response.json({
      requests,
      total: requests.length
    });
  } catch (error) {
    console.error('Error fetching concierge requests:', error);
    return Response.json(
      { error: 'Failed to fetch concierge requests' },
      { status: 500 }
    );
  }
}