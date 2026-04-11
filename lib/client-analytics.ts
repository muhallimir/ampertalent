// Client-side analytics service that fetches data from API endpoints
export interface PlatformMetrics {
  totalUsers: number
  totalJobSeekers: number
  totalEmployers: number
  totalJobs: number
  totalApplications: number
  activeSubscriptions: number
  monthlyRevenue: number
  conversionRates: {
    visitorToSignup: number
    signupToSubscription: number
    applicationToHire: number
  }
}

export interface UserEngagementMetrics {
  dailyActiveUsers: number
  weeklyActiveUsers: number
  monthlyActiveUsers: number
  averageSessionDuration: number
  pageViews: number
  bounceRate: number
}

export interface JobMetrics {
  totalJobsPosted: number
  approvedJobs: number
  rejectedJobs: number
  expiredJobs: number
  averageTimeToApproval: number
  jobsByCategory: Record<string, number>
  jobsByType: Record<string, number>
  averageApplicationsPerJob: number
}

export interface RevenueMetrics {
  totalRevenue: number
  subscriptionRevenue: number
  packageRevenue: number
  serviceRevenue: number // Premium Services
  monthlyRecurringRevenue: number
  // Employer recurring revenue breakdown
  employerRecurringRevenue?: {
    monthlyRecurringRevenue: number // Sum of active recurring employer packages
    activeSubscriptions: number // Count of active recurring employer packages
    totalRecurringValue: number // Total expected value of all active recurring packages
  }
  averageRevenuePerUser: number
  churnRate: number
  lifetimeValue: number
  // Payment method breakdown
  paymentMethodBreakdown: {
    cardRevenue: number
    paypalRevenue: number
    cardTransactions: number
    paypalTransactions: number
  }
}

export interface ApplicationMetrics {
  totalApplications: number
  applicationsByStatus: Record<string, number>
  averageApplicationsPerSeeker: number
  averageTimeToResponse: number
  hireRate: number
  topSkillsInDemand: string[]
}

export interface TimeSeriesData {
  date: string
  value: number
}

export interface AnalyticsData {
  platform: PlatformMetrics
  engagement: UserEngagementMetrics
  jobs: JobMetrics
  revenue: RevenueMetrics
  applications: ApplicationMetrics
  trends: {
    userGrowth: TimeSeriesData[]
    revenueGrowth: TimeSeriesData[]
    jobPostings: TimeSeriesData[]
    applications: TimeSeriesData[]
  }
}

/**
 * Client-side analytics service for fetching data from API endpoints
 */
export class ClientAnalyticsService {
  /**
   * Get comprehensive platform analytics from API
   */
  static async getPlatformAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<AnalyticsData> {
    try {
      const params = new URLSearchParams()

      if (startDate) {
        params.append('startDate', startDate.toISOString())
      }

      if (endDate) {
        params.append('endDate', endDate.toISOString())
      }

      const queryString = params.toString()
      const url = `/api/admin/analytics${queryString ? `?${queryString}` : ''}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized: Admin access required')
        }
        throw new Error(`Failed to fetch analytics: ${response.statusText}`)
      }

      const text = await response.text()
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        // Session expired, redirect to sign-in
        window.location.href = '/sign-in'
        throw new Error('Session expired')
      }
      const data = JSON.parse(text)
      return data
    } catch (error) {
      console.error('Error fetching analytics data:', error)
      throw error
    }
  }

  /**
   * Format currency values
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  /**
   * Format percentage values
   */
  static formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`
  }

  /**
   * Calculate percentage change between two values
   */
  static calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }
}
