import { NextRequest, NextResponse } from 'next/server'
import { EnhancedAnalyticsService } from '@/lib/enhanced-analytics'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userRole = searchParams.get('userRole')
    const jobCategory = searchParams.get('jobCategory')
    const location = searchParams.get('location')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    const filters = {
      dateRange: {
        start: new Date(startDate),
        end: new Date(endDate)
      },
      userRole: userRole as 'seeker' | 'employer' | 'admin' | undefined,
      jobCategory: jobCategory || undefined,
      location: location || undefined
    }

    const analytics = await EnhancedAnalyticsService.getDashboardAnalytics(filters)
    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Analytics dashboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}