'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { ClientAnalyticsService, AnalyticsData } from '@/lib/client-analytics'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Briefcase,
  DollarSign,
  FileText,
  Clock,
  Target,
  Download,
  RefreshCw,
  BarChart3,
  Activity
} from '@/components/icons'
import { DateRangePickerPopup } from '@/components/ui/date-range-picker-popup'
import { useToast } from '@/hooks/use-toast'
import { useUserProfile } from '@/hooks/useUserProfile'

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState('all')
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined)
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined)
  const [useCustomRange, setUseCustomRange] = useState(false)

  const { toast } = useToast()
  const { profile } = useUserProfile()

  const dateRangeData = useMemo(() => {
    // If using custom range and both dates are set, return custom dates
    if (useCustomRange && customStartDate && customEndDate) {
      return { startDate: customStartDate, endDate: customEndDate }
    }

    // Otherwise use preset ranges
    const endDate = new Date()
    const startDate = new Date()

    switch (dateRange) {
      case 'all':
        startDate.setTime(0)
        break
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      default:
        startDate.setDate(endDate.getDate() - 7)
    }

    return { startDate, endDate }
  }, [dateRange, useCustomRange, customStartDate, customEndDate])

  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { startDate, endDate } = dateRangeData

      const data = await ClientAnalyticsService.getPlatformAnalytics(
        startDate,
        endDate
      )

      setAnalyticsData(data)
    } catch (error) {
      console.error('Error loading analytics:', error)

      setError(
        error instanceof Error ? error.message : 'Failed to load analytics data'
      )
    } finally {
      setIsLoading(false)
    }
  }, [dateRangeData])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Dynamic CSV converter that handles nested objects and arrays
  const convertToCSV = (data: AnalyticsData) => {
    const rows: (string | number)[][] = []

    // Add header
    rows.push(['Category', 'Metric', 'Value', 'Subcategory'])

    // Helper function to format metric names
    const formatMetricName = (key: string): string => {
      return key
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
        .replace(/\b\w/g, (l) => l.toUpperCase()) // Capitalize each word
    }

    // Helper function to recursively process nested objects
    const processObject = (
      obj: any,
      category: string,
      parentKey: string = ''
    ) => {
      Object.entries(obj).forEach(([key, value]) => {
        const metricName = formatMetricName(key)
        const fullKey = parentKey ? `${parentKey} - ${metricName}` : metricName

        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // Handle nested objects (like conversionRates)
          processObject(value, category, fullKey)
        } else if (Array.isArray(value)) {
          // Handle arrays (like topSkillsInDemand)
          value.forEach((item, index) => {
            rows.push([category, `${fullKey} #${index + 1}`, item, 'List Item'])
          })
        } else {
          // Handle primitive values
          let formattedValue = value
          let subcategory = 'Metric'

          // Add units/formatting based on metric type
          if (key.includes('Rate') || key.includes('Percentage')) {
            subcategory = 'Percentage'
            formattedValue =
              typeof value === 'number' ? `${value.toFixed(1)}%` : value
          } else if (
            key.includes('Revenue') ||
            key.includes('Value') ||
            key.includes('Cost')
          ) {
            subcategory = 'Currency'
            formattedValue =
              typeof value === 'number' ? formatCurrency(value) : value
          } else if (key.includes('Duration') || key.includes('Time')) {
            subcategory = 'Time'
            if (key.includes('Duration')) {
              formattedValue =
                typeof value === 'number' ? `${value.toFixed(1)} min` : value
            } else if (key.includes('Time') && typeof value === 'number') {
              formattedValue = `${value.toFixed(1)} days`
            }
          } else if (typeof value === 'number') {
            subcategory = Number.isInteger(value) ? 'Count' : 'Average'
            formattedValue = value.toLocaleString()
          }

          rows.push([
            category,
            fullKey,
            formattedValue as string | number,
            subcategory
          ])
        }
      })
    }

    // Process each main category dynamically
    const categoryMapping = {
      platform: 'Platform Metrics',
      jobs: 'Job Metrics',
      revenue: 'Revenue Metrics',
      applications: 'Application Metrics',
      engagement: 'Engagement Metrics'
    }

    Object.entries(data).forEach(([categoryKey, categoryData]) => {
      if (categoryKey === 'trends') {
        // Handle trends data separately as it's time series
        Object.entries(categoryData).forEach(([trendKey, trendData]) => {
          const trendName = formatMetricName(trendKey)
          if (Array.isArray(trendData)) {
            trendData.forEach((dataPoint: any) => {
              rows.push([
                'Trends',
                `${trendName} - ${dataPoint.date}`,
                dataPoint.value,
                'Time Series'
              ])
            })
          }
        })
      } else {
        const categoryName =
          categoryMapping[categoryKey as keyof typeof categoryMapping] ||
          formatMetricName(categoryKey)
        processObject(categoryData, categoryName)
      }
    })

    // Add metadata rows
    rows.push([
      'Metadata',
      'Export Date',
      new Date().toISOString().split('T')[0],
      'System'
    ])
    rows.push(['Metadata', 'Date Range', `${dateRange}`, 'Filter'])
    rows.push(['Metadata', 'Total Records', rows.length - 1, 'Count'])

    // Convert to CSV string with proper escaping
    return rows
      .map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell)
            // Escape cells that contain commas, quotes, or newlines
            if (
              cellStr.includes(',') ||
              cellStr.includes('"') ||
              cellStr.includes('\n')
            ) {
              return `"${cellStr.replace(/"/g, '""')}"`
            }
            return cellStr
          })
          .join(',')
      )
      .join('\n')
  }

  const downloadCSV = () => {
    if (!analyticsData) {
      toast({
        title: 'No Data',
        description: 'No analytics data available to export.',
        variant: 'destructive'
      })
      return
    }

    try {
      const csvContent = convertToCSV(analyticsData)
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute(
        'download',
        `analytics-data-${dateRange}-${new Date().toISOString().split('T')[0]
        }.csv`
      )
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'Export Successful',
        description: 'Analytics data has been exported to CSV.'
      })
    } catch (error) {
      console.error('Error exporting CSV:', error)
      toast({
        title: 'Export Failed',
        description: 'Failed to export analytics data. Please try again.',
        variant: 'destructive'
      })
    }
  }

  useEffect(() => {
    // Only load analytics when:
    // 1. Using preset range (dateRange changes)
    // 2. Using custom range AND both dates are set
    if (!useCustomRange || (useCustomRange && customStartDate && customEndDate)) {
      loadAnalytics()
    }
  }, [dateRange, useCustomRange, customStartDate, customEndDate, loadAnalytics])

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getChangeIcon = (value: number) => {
    return value >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    )
  }

  const getChangeColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const getTrendPeriodText = () => {
    // Check custom range FIRST because dateRange won't be updated when using custom dates
    if (useCustomRange && customStartDate && customEndDate) {
      // Format custom date range in short format (MM/DD/YYYY - MM/DD/YYYY)
      const options: Intl.DateTimeFormatOptions = {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      }
      const startStr = customStartDate.toLocaleDateString('en-US', options)
      const endStr = customEndDate.toLocaleDateString('en-US', options)
      return `${startStr} - ${endStr}`
    } else if (dateRange === 'all') {
      return 'all-time' // Show all-time comparison for all data
    } else if (dateRange === '7d') {
      return 'from last week'
    } else if (dateRange === '30d') {
      return 'from last month'
    } else if (dateRange === '90d') {
      return 'from 3 months ago'
    } else if (dateRange === '1y') {
      return 'from last year'
    }
    return 'from last month' // Default fallback
  }

  const formatDateRangeDisplay = () => {
    const { startDate, endDate } = dateRangeData
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }

    if (startDate.toDateString() === endDate.toDateString()) {
      return startDate.toLocaleDateString('en-US', options)
    }

    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`
  }

  // Format application status for display (UI only - no backend changes)
  const formatApplicationStatusDisplay = (status: string) => {
    const displayNames: Record<string, string> = {
      'rejected': 'Declined',
      'pending': 'Pending',
      'reviewed': 'Reviewed',
      'interview': 'Interview',
      'hired': 'Hired'
    }
    return displayNames[status.toLowerCase()] || status.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !analyticsData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-2">
          {error || 'Failed to load analytics data'}
        </p>
        {error && (
          <p className="text-sm text-red-600 mb-4">
            {error.includes('Unauthorized')
              ? 'Please ensure you are logged in as an admin user.'
              : 'Please try refreshing the page or contact support if the issue persists.'}
          </p>
        )}
        <Button onClick={loadAnalytics} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600">
            Comprehensive insights into platform performance and user behavior
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Date Range Selector */}
          <div className="flex items-center space-x-2">
            {!useCustomRange && (
              <Select
                value={dateRange}
                onValueChange={(value) => {
                  setDateRange(value)
                  setUseCustomRange(false)
                  setCustomStartDate(undefined)
                  setCustomEndDate(undefined)
                }}
              >
                <SelectTrigger className="h-9 px-3 border border-gray-300 rounded-md text-sm [&>svg]:ml-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Date Range Picker - Always visible */}
            <DateRangePickerPopup
              startDate={customStartDate}
              endDate={customEndDate}
              onStartDateChange={setCustomStartDate}
              onEndDateChange={setCustomEndDate}
              onApply={() => {
                setUseCustomRange(true)
              }}
              placeholder="Custom range"
              disabled={false}
            />

            <Button
              onClick={() => {
                setUseCustomRange(false)
                setCustomStartDate(undefined)
                setCustomEndDate(undefined)
                setDateRange('all')
                loadAnalytics()
              }}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={downloadCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={() => window.location.href = '/admin/analytics/cancellation-survey'}
              variant="outline"
              size="sm"
            >
              <FileText className="h-4 w-4 mr-2" />
              View Survey Analytics
            </Button>
          </div>

        </div>
      </div>

      {/* Date Range Indicator */}
      <div className="text-right text-sm text-gray-600 mb-4">
        {useCustomRange && customStartDate && customEndDate
          ? `Showing data from ${formatDateRangeDisplay()}`
          : dateRange === 'all'
            ? 'Showing all time data'
            : `Showing data from ${formatDateRangeDisplay()}`}
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className={`grid w-full ${profile?.role === 'super_admin' ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          {profile?.role === 'super_admin' && <TabsTrigger value="revenue">Revenue</TabsTrigger>}
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className={`grid grid-cols-1 md:grid-cols-2 ${profile?.role === 'super_admin' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.platform.totalUsers.toLocaleString()}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {getChangeIcon(12.5)}
                  <span className={`ml-1 ${getChangeColor(12.5)}`}>
                    +12.5%
                  </span>
                  <span className="text-muted-foreground ml-1">
                    {getTrendPeriodText()}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Jobs
                </CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.jobs.approvedJobs}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {getChangeIcon(8.2)}
                  <span className={`ml-1 ${getChangeColor(8.2)}`}>
                    +8.2%
                  </span>
                  <span className="text-muted-foreground ml-1">
                    {getTrendPeriodText()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {profile?.role === 'super_admin' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Monthly Revenue
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(analyticsData.platform.monthlyRevenue)}
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    {(() => {
                      if (analyticsData.trends?.revenueGrowth && analyticsData.trends.revenueGrowth.length > 1) {
                        const first = analyticsData.trends.revenueGrowth[0]?.value || 0
                        const last = analyticsData.trends.revenueGrowth[analyticsData.trends.revenueGrowth.length - 1]?.value || 0
                        const growth = first > 0 ? ((last - first) / first) * 100 : 0
                        return (
                          <>
                            {getChangeIcon(growth)}
                            <span className={`ml-1 ${getChangeColor(growth)}`}>
                              {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
                            </span>
                            <span className="text-muted-foreground ml-1">
                              {getTrendPeriodText()}
                            </span>
                          </>
                        )
                      }
                      return (
                        <>
                          {getChangeIcon(15.3)}
                          <span className={`ml-1 ${getChangeColor(15.3)}`}>
                            +15.3%
                          </span>
                          <span className="text-muted-foreground ml-1">
                            {getTrendPeriodText()}
                          </span>
                        </>
                      )
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Applications
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.applications.totalApplications.toLocaleString()}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {getChangeIcon(22.1)}
                  <span className={`ml-1 ${getChangeColor(22.1)}`}>
                    +22.1%
                  </span>
                  <span className="text-muted-foreground ml-1">
                    {getTrendPeriodText()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Rates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Visitor to Signup</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {formatPercentage(
                    analyticsData.platform.conversionRates.visitorToSignup
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Conversion rate from website visitors to registered users
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Signup to Subscription
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {formatPercentage(
                    analyticsData.platform.conversionRates.signupToSubscription
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Job seekers who convert to paid subscriptions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Application to Hire</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {formatPercentage(
                    analyticsData.platform.conversionRates.applicationToHire
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Applications that result in successful hires
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className={`grid grid-cols-1 ${profile?.role === 'super_admin' ? 'lg:grid-cols-2' : ''} gap-6`}>
            <Card>
              <CardHeader>
                <CardTitle>User Growth Trend</CardTitle>
                <CardDescription>
                  Daily new user registrations over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">
                      Chart visualization would go here
                    </p>
                    <p className="text-sm text-gray-500">
                      Integration with Chart.js or Recharts
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {profile?.role === 'super_admin' && (
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Breakdown</CardTitle>
                  <CardDescription>
                    Revenue distribution by source
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const employerRecurringMRR = analyticsData.revenue.employerRecurringRevenue?.monthlyRecurringRevenue || 0;
                    const total = analyticsData.revenue.subscriptionRevenue +
                      analyticsData.revenue.packageRevenue +
                      (analyticsData.revenue.serviceRevenue || 0) +
                      employerRecurringMRR;

                    // Helper to format percentage - show more decimals for small values
                    const formatPctDisplay = (pct: number) => {
                      if (pct > 0 && pct < 0.01) return `${pct.toFixed(3)}%`;
                      if (pct > 0 && pct < 0.1) return `${pct.toFixed(2)}%`;
                      if (pct > 0 && pct < 1) return `${pct.toFixed(2)}%`;
                      return `${Math.round(pct)}%`;
                    };

                    const subPct = total > 0 ? (analyticsData.revenue.subscriptionRevenue / total) * 100 : 0;
                    const pkgPct = total > 0 ? (analyticsData.revenue.packageRevenue / total) * 100 : 0;
                    const svcPct = total > 0 ? ((analyticsData.revenue.serviceRevenue || 0) / total) * 100 : 0;
                    const exclusivePct = total > 0 ? (employerRecurringMRR / total) * 100 : 0;

                    return (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Subscriptions</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${Math.round(subPct)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600 w-10">{formatPctDisplay(subPct)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Job Packages</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${Math.round(pkgPct)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600 w-10">{formatPctDisplay(pkgPct)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Premium Services</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-orange-500 h-2 rounded-full"
                                style={{ width: `${Math.round(svcPct)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600 w-10">{formatPctDisplay(svcPct)}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Exclusive Offers</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-amber-500 h-2 rounded-full"
                                style={{ width: `${Math.max(Math.round(exclusivePct), exclusivePct > 0 ? 2 : 0)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600 w-10">{formatPctDisplay(exclusivePct)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="mt-6 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Revenue</span>
                      <span className="font-bold text-lg">
                        {formatCurrency(analyticsData.revenue.totalRevenue)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Job Seekers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {analyticsData.platform.totalJobSeekers.toLocaleString()}
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Active Subscriptions</span>
                    <span className="font-medium">
                      {analyticsData.platform.activeSubscriptions}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Free Users</span>
                    <span className="font-medium">
                      {analyticsData.platform.totalJobSeekers -
                        analyticsData.platform.activeSubscriptions}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Employers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {analyticsData.platform.totalEmployers.toLocaleString()}
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Active Packages</span>
                    <span className="font-medium">89</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Avg Jobs/Employer</span>
                    <span className="font-medium">2.3</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Daily Active</span>
                    <Badge variant="outline">
                      {analyticsData.engagement.dailyActiveUsers}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Weekly Active</span>
                    <Badge variant="outline">
                      {analyticsData.engagement.weeklyActiveUsers}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Monthly Active</span>
                    <Badge variant="outline">
                      {analyticsData.engagement.monthlyActiveUsers}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* User Engagement Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Engagement Metrics</CardTitle>
              <CardDescription>
                User behavior and platform usage statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {analyticsData.engagement.averageSessionDuration.toFixed(1)}
                    m
                  </div>
                  <p className="text-sm text-gray-600">Avg Session Duration</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analyticsData.engagement.pageViews.toLocaleString()}
                  </div>
                  <p className="text-sm text-gray-600">Page Views</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatPercentage(analyticsData.engagement.bounceRate)}
                  </div>
                  <p className="text-sm text-gray-600">Bounce Rate</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {formatPercentage(analyticsData.applications.hireRate)}
                  </div>
                  <p className="text-sm text-gray-600">Hire Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Jobs
                </CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.jobs.totalJobsPosted}
                </div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
                <Target className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {analyticsData.jobs.approvedJobs}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatPercentage(
                    (analyticsData.jobs.approvedJobs /
                      analyticsData.jobs.totalJobsPosted) *
                    100
                  )}{' '}
                  approval rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Applications
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.jobs.averageApplicationsPerJob.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground">Per job posting</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Approval Time
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsData.jobs.averageTimeToApproval.toFixed(1)}d
                </div>
                <p className="text-xs text-muted-foreground">
                  Days to approval
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Job Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Jobs by Category</CardTitle>
                <CardDescription>
                  Distribution of job postings by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analyticsData.jobs.jobsByCategory).map(
                    ([category, count]) => (
                      <div
                        key={category}
                        className="flex justify-between items-center"
                      >
                        <span className="text-sm font-medium capitalize">
                          {category.split('_').join(' ').toLowerCase()}
                        </span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{
                                width: `${(count /
                                  Math.max(
                                    ...Object.values(
                                      analyticsData.jobs.jobsByCategory
                                    )
                                  )) *
                                  100
                                  }%`
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-8">
                            {count}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Jobs by Type</CardTitle>
                <CardDescription>
                  Full-time vs part-time vs project work
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analyticsData.jobs.jobsByType).map(
                    ([type, count]) => (
                      <div
                        key={type}
                        className="flex justify-between items-center"
                      >
                        <span className="text-sm font-medium capitalize">
                          {type.split('_').join(' ').toLowerCase()}
                        </span>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{count}</Badge>
                          <span className="text-sm text-gray-600">
                            {formatPercentage(
                              (count / analyticsData.jobs.totalJobsPosted) * 100
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analyticsData.revenue.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">MRR</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    analyticsData.revenue.monthlyRecurringRevenue
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Monthly recurring revenue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ARPU</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analyticsData.revenue.averageRevenuePerUser)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average revenue per user
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Churn Rate
                </CardTitle>
                <Activity className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatPercentage(analyticsData.revenue.churnRate)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Monthly churn rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Sources</CardTitle>
                <CardDescription>Breakdown by revenue stream</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium">Seeker Subscriptions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">
                        {formatCurrency(
                          analyticsData.revenue.subscriptionRevenue
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium">Employer Packages</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        {formatCurrency(analyticsData.revenue.packageRevenue)}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <div>
                      <p className="font-medium">Premium Services</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-600">
                        {formatCurrency(analyticsData.revenue.serviceRevenue || 0)}
                      </p>
                    </div>
                  </div>
                  {/* Exclusive Offers Section */}
                  {analyticsData.revenue.employerRecurringRevenue && (
                    <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          <span>🔄</span> Exclusive Offers (MRR)
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                          {analyticsData.revenue.employerRecurringRevenue.activeSubscriptions} active subscription{analyticsData.revenue.employerRecurringRevenue.activeSubscriptions !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-600">
                          {formatCurrency(analyticsData.revenue.employerRecurringRevenue.monthlyRecurringRevenue)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(analyticsData.revenue.employerRecurringRevenue.totalRecurringValue)} total contract
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
                <CardDescription>Important revenue indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Customer Lifetime Value
                    </span>
                    <span className="font-bold">
                      {formatCurrency(analyticsData.revenue.lifetimeValue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Monthly Churn Rate
                    </span>
                    <span className="font-bold">
                      {formatPercentage(analyticsData.revenue.churnRate)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Revenue Growth</span>
                    <span className="font-bold text-green-600">
                      {analyticsData.trends?.revenueGrowth && analyticsData.trends.revenueGrowth.length > 1
                        ? (() => {
                          const first = analyticsData.trends.revenueGrowth[0]?.value || 0
                          const last = analyticsData.trends.revenueGrowth[analyticsData.trends.revenueGrowth.length - 1]?.value || 0
                          const growth = first > 0 ? ((last - first) / first) * 100 : 0
                          return `${growth > 0 ? '+' : ''}${growth.toFixed(1)}%`
                        })()
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Session Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Avg Session Duration</span>
                    <span className="font-medium">
                      {analyticsData.engagement.averageSessionDuration.toFixed(
                        1
                      )}
                      m
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Bounce Rate</span>
                    <span className="font-medium">
                      {formatPercentage(analyticsData.engagement.bounceRate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Page Views</span>
                    <span className="font-medium">
                      {analyticsData.engagement.pageViews.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Application Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Applications</span>
                    <span className="font-medium">
                      {analyticsData.applications.totalApplications.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg per Seeker</span>
                    <span className="font-medium">
                      {analyticsData.applications.averageApplicationsPerSeeker.toFixed(
                        1
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Response Time</span>
                    <span className="font-medium">
                      {analyticsData.applications.averageTimeToResponse.toFixed(
                        1
                      )}
                      d
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analyticsData.applications.topSkillsInDemand
                    .slice(0, 5)
                    .map((skill, index) => (
                      <div key={skill} className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                        <span className="text-sm">{skill}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Application Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Application Status Distribution</CardTitle>
              <CardDescription>
                Current status of all applications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(
                  analyticsData.applications.applicationsByStatus
                ).map(([status, count]) => (
                  <div key={status} className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {count}
                    </div>
                    <p className="text-sm text-gray-600 capitalize">
                      {formatApplicationStatusDisplay(status)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
