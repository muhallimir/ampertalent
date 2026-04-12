import { NextResponse } from 'next/server'
import { EnhancedAnalyticsService } from '@/lib/enhanced-analytics'

export async function GET() {
  try {
    const realTimeMetrics = await EnhancedAnalyticsService.getRealTimeMetrics()
    return NextResponse.json(realTimeMetrics)
  } catch (error) {
    console.error('Real-time analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch real-time metrics' },
      { status: 500 }
    )
  }
}