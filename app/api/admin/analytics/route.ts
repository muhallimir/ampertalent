import { NextRequest, NextResponse } from 'next/server'
import { AnalyticsService } from '@/lib/analytics'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('[Analytics API] Request received')

    // Validate admin access (both admin and super_admin can access analytics)
    const currentUser = await getCurrentUser(request)
    console.log('[Analytics API] Current user:', {
      userId: currentUser?.id,
      role: currentUser?.profile?.role,
    })

    if (
      !currentUser ||
      !currentUser.profile ||
      (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin')
    ) {
      console.log('[Analytics API] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters for date range
    const searchParams = request.nextUrl.searchParams
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    const startDate = startDateParam ? new Date(startDateParam) : undefined
    const endDate = endDateParam ? new Date(endDateParam) : undefined

    console.log('[Analytics API] Date range:', {
      startDateParam,
      endDateParam,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
      isStartDateValid: startDate instanceof Date && !isNaN(startDate.getTime()),
      isEndDateValid: endDate instanceof Date && !isNaN(endDate.getTime()),
    })

    // Get analytics data
    console.log('[Analytics API] Fetching platform analytics...')
    const analyticsData = await AnalyticsService.getPlatformAnalytics(
      startDate,
      endDate
    )

    console.log('[Analytics API] Analytics data generated successfully:', {
      totalUsers: analyticsData.platform.totalUsers,
      totalJobs: analyticsData.platform.totalJobs,
      totalApplications: analyticsData.platform.totalApplications,
      totalRevenue: analyticsData.revenue.totalRevenue,
      monthlyRecurringRevenue: analyticsData.revenue.monthlyRecurringRevenue,
    })

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error('[Analytics API] Error fetching analytics data:', error)
    console.error('[Analytics API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}
