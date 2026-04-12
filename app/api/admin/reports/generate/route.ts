import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

interface ReportConfig {
  type: 'user_activity' | 'revenue' | 'job_performance' | 'application_trends'
  dateRange: {
    start: Date
    end: Date
  }
  filters?: {
    userRole?: 'seeker' | 'employer'
    jobCategory?: import('@prisma/client').JobCategory
  }
  format: 'csv' | 'pdf' | 'excel' | 'json'
  includeCharts?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify super admin role
    if (currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const config: ReportConfig = await request.json()

    let reportData
    switch (config.type) {
      case 'user_activity':
        reportData = await generateUserActivityReport(config)
        break
      case 'job_performance':
        reportData = await generateJobPerformanceReport(config)
        break
      case 'application_trends':
        reportData = await generateApplicationTrendsReport(config)
        break
      case 'revenue':
        reportData = await generateRevenueReport(config)
        break
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    const report = {
      id: 'report_' + Math.random().toString(36).substr(2, 9),
      title: reportData.title,
      description: reportData.description,
      generatedAt: new Date(),
      config,
      data: reportData.data,
      summary: {
        totalRecords: reportData.data.length,
        keyMetrics: reportData.keyMetrics,
        insights: reportData.insights
      }
    }

    return NextResponse.json({ report })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function generateUserActivityReport(config: ReportConfig) {
  const { start, end } = config.dateRange

  // Get daily user activity data
  const dailyData = []
  const currentDate = new Date(start)

  while (currentDate <= end) {
    const dayStart = new Date(currentDate)
    const dayEnd = new Date(currentDate)
    dayEnd.setHours(23, 59, 59, 999)

    // Get new signups for this day
    const newSignups = await db.userProfile.count({
      where: {
        createdAt: {
          gte: dayStart,
          lte: dayEnd
        },
        ...(config.filters?.userRole && { role: config.filters.userRole })
      }
    })

    // Get applications for this day
    const jobApplications = await db.application.count({
      where: {
        appliedAt: {
          gte: dayStart,
          lte: dayEnd
        }
      }
    })

    // Get subscription conversions (users who upgraded to paid plans)
    const subscriptionConversions = await db.jobSeeker.count({
      where: {
        membershipPlan: {
          not: 'none'
        },
        updatedAt: {
          gte: dayStart,
          lte: dayEnd
        }
      }
    })

    dailyData.push({
      date: currentDate.toISOString().split('T')[0],
      newSignups,
      activeUsers: newSignups, // Simplified - could be more sophisticated
      subscriptionConversions,
      jobApplications,
      userRole: config.filters?.userRole || 'mixed'
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Calculate key metrics
  const totalNewSignups = dailyData.reduce((sum, item) => sum + item.newSignups, 0)
  const totalApplications = dailyData.reduce((sum, item) => sum + item.jobApplications, 0)
  const totalConversions = dailyData.reduce((sum, item) => sum + item.subscriptionConversions, 0)
  const averageActiveUsers = dailyData.length > 0
    ? dailyData.reduce((sum, item) => sum + item.activeUsers, 0) / dailyData.length
    : 0

  const keyMetrics = {
    totalNewSignups,
    averageActiveUsers: Math.round(averageActiveUsers),
    totalConversions,
    totalApplications
  }

  // Generate insights based on actual data
  const insights = []
  if (totalNewSignups > 0) {
    insights.push(`${totalNewSignups} new users registered during this period`)
  }
  if (totalConversions > 0) {
    const conversionRate = (totalConversions / totalNewSignups) * 100
    insights.push(`Subscription conversion rate: ${conversionRate.toFixed(1)}%`)
  }
  if (totalApplications > 0) {
    insights.push(`${totalApplications} job applications submitted`)
  }
  if (dailyData.length > 0) {
    const avgDaily = totalNewSignups / dailyData.length
    insights.push(`Average ${avgDaily.toFixed(1)} new signups per day`)
  }

  return {
    data: dailyData,
    title: 'User Activity Report',
    description: 'Comprehensive analysis of user engagement and activity patterns',
    keyMetrics,
    insights
  }
}

async function generateJobPerformanceReport(config: ReportConfig) {
  const { start, end } = config.dateRange

  // Get jobs within the date range
  const jobs = await db.job.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end
      },
      ...(config.filters?.jobCategory && { category: config.filters.jobCategory })
    },
    include: {
      applications: {
        select: {
          id: true,
          status: true,
          appliedAt: true
        }
      },
      employer: {
        select: {
          userId: true,
          companyName: true
        }
      }
    }
  })

  const data = jobs.map((job: any) => {
    const applications = job.applications.length
    const interviews = job.applications.filter((app: any) => app.status === 'interview').length
    const hires = job.applications.filter((app: any) => app.status === 'hired').length

    // Calculate time to hire (days from job posting to first hire)
    const firstHire = job.applications
      .filter((app: any) => app.status === 'hired')
      .sort((a: any, b: any) => a.appliedAt.getTime() - b.appliedAt.getTime())[0]

    const timeToHire = firstHire
      ? Math.ceil((firstHire.appliedAt.getTime() - job.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    return {
      jobId: job.id,
      title: job.title,
      category: job.category,
      postedDate: job.createdAt.toISOString().split('T')[0],
      applications,
      interviews,
      hires,
      timeToHire,
      employerId: job.employerId,
      status: job.status,
      companyName: job.employer.companyName,
      viewsCount: job.viewsCount
    }
  })

  // Calculate key metrics
  const totalJobs = data.length
  const totalApplications = data.reduce((sum: any, item: any) => sum + item.applications, 0)
  const totalHires = data.reduce((sum: any, item: any) => sum + item.hires, 0)
  const jobsWithHires = data.filter((job: any) => job.hires > 0)
  const averageTimeToHire = jobsWithHires.length > 0
    ? jobsWithHires.reduce((sum: any, item: any) => sum + item.timeToHire, 0) / jobsWithHires.length
    : 0
  const averageApplicationsPerJob = totalJobs > 0 ? totalApplications / totalJobs : 0

  const keyMetrics = {
    totalJobs,
    totalApplications,
    totalHires,
    averageTimeToHire: Math.round(averageTimeToHire),
    averageApplicationsPerJob: Math.round(averageApplicationsPerJob * 10) / 10
  }

  // Generate insights based on actual data
  const insights = []
  if (totalJobs > 0) {
    insights.push(`${totalJobs} jobs posted during this period`)
  }
  if (totalApplications > 0) {
    insights.push(`${totalApplications} total applications received`)
  }
  if (totalHires > 0) {
    const hireRate = (totalHires / totalApplications) * 100
    insights.push(`${totalHires} successful hires (${hireRate.toFixed(1)}% hire rate)`)
  }
  if (averageTimeToHire > 0) {
    insights.push(`Average time to hire: ${Math.round(averageTimeToHire)} days`)
  }

  return {
    data,
    title: 'Job Performance Report',
    description: 'Analysis of job posting effectiveness and hiring outcomes',
    keyMetrics,
    insights
  }
}

async function generateApplicationTrendsReport(config: ReportConfig) {
  const { start, end } = config.dateRange

  // Get daily application data
  const dailyData = []
  const currentDate = new Date(start)

  while (currentDate <= end) {
    const dayStart = new Date(currentDate)
    const dayEnd = new Date(currentDate)
    dayEnd.setHours(23, 59, 59, 999)

    const applications = await db.application.findMany({
      where: {
        appliedAt: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      select: {
        status: true
      }
    })

    const totalApplications = applications.length
    const pendingApplications = applications.filter((app: any) => app.status === 'pending').length
    const reviewedApplications = applications.filter((app: any) => app.status === 'reviewed').length
    const interviewApplications = applications.filter((app: any) => app.status === 'interview').length
    const hiredApplications = applications.filter((app: any) => app.status === 'hired').length
    const rejectedApplications = applications.filter((app: any) => app.status === 'rejected').length

    dailyData.push({
      date: currentDate.toISOString().split('T')[0],
      totalApplications,
      pendingApplications,
      reviewedApplications,
      interviewApplications,
      hiredApplications,
      rejectedApplications,
      averageResponseTime: 2.5 // This would need more complex calculation
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  const keyMetrics = {
    totalApplications: dailyData.reduce((sum, item) => sum + item.totalApplications, 0),
    averageResponseTime: dailyData.reduce((sum, item) => sum + item.averageResponseTime, 0) / dailyData.length,
    hireRate: dailyData.length > 0
      ? (dailyData.reduce((sum, item) => sum + item.hiredApplications, 0) /
        dailyData.reduce((sum, item) => sum + item.totalApplications, 0)) * 100
      : 0,
    interviewRate: dailyData.length > 0
      ? (dailyData.reduce((sum, item) => sum + item.interviewApplications, 0) /
        dailyData.reduce((sum, item) => sum + item.totalApplications, 0)) * 100
      : 0
  }

  const insights = [
    `${keyMetrics.totalApplications} total applications processed`,
    `${keyMetrics.hireRate.toFixed(1)}% hire rate`,
    `${keyMetrics.interviewRate.toFixed(1)}% interview rate`,
    `Average response time: ${keyMetrics.averageResponseTime.toFixed(1)} days`
  ]

  return {
    data: dailyData,
    title: 'Application Trends Report',
    description: 'Analysis of application patterns and hiring funnel performance',
    keyMetrics,
    insights
  }
}

async function generateRevenueReport(config: ReportConfig) {
  const { start, end } = config.dateRange

  // Get actual external payment data (this is where real revenue is tracked)
  const externalPayments = await db.externalPayment.findMany({
    where: {
      status: 'completed',
      createdAt: {
        gte: start,
        lte: end
      }
    },
    include: {
      user: {
        select: {
          jobSeeker: true,
          employer: true
        }
      },
      subscriptions: {
        select: {
          authnet_payment_profile_id: true
        },
        take: 1
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Calculate revenue totals
  const totalRevenue = externalPayments.reduce((sum, p) => sum + Number(p.amount), 0)

  // Revenue by user type
  const seekerPayments = externalPayments.filter(p => p.user?.jobSeeker)
  const employerPayments = externalPayments.filter(p => p.user?.employer)
  const subscriptionRevenue = seekerPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const packageRevenue = employerPayments.reduce((sum, p) => sum + Number(p.amount), 0)

  // Revenue by payment method (PayPal vs Card)
  const paypalPayments = externalPayments.filter(p => {
    const ghlTransactionId = p.ghlTransactionId || ''
    const paymentProfileId = p.subscriptions?.[0]?.authnet_payment_profile_id || ''
    return ghlTransactionId.startsWith('PAYPAL_') || paymentProfileId.startsWith('PAYPAL|')
  })
  const cardPayments = externalPayments.filter(p => {
    const ghlTransactionId = p.ghlTransactionId || ''
    const paymentProfileId = p.subscriptions?.[0]?.authnet_payment_profile_id || ''
    return !ghlTransactionId.startsWith('PAYPAL_') && !paymentProfileId.startsWith('PAYPAL|')
  })

  const paypalRevenue = paypalPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const cardRevenue = cardPayments.reduce((sum, p) => sum + Number(p.amount), 0)

  // Daily breakdown
  const dailyData: Record<string, {
    date: string
    cardRevenue: number
    paypalRevenue: number
    totalRevenue: number
    cardTransactions: number
    paypalTransactions: number
    totalTransactions: number
  }> = {}

  externalPayments.forEach(payment => {
    const dateKey = payment.createdAt.toISOString().split('T')[0]
    const amount = Number(payment.amount)
    const ghlTransactionId = payment.ghlTransactionId || ''
    const paymentProfileId = payment.subscriptions?.[0]?.authnet_payment_profile_id || ''
    const isPayPal = ghlTransactionId.startsWith('PAYPAL_') || paymentProfileId.startsWith('PAYPAL|')

    if (!dailyData[dateKey]) {
      dailyData[dateKey] = {
        date: dateKey,
        cardRevenue: 0,
        paypalRevenue: 0,
        totalRevenue: 0,
        cardTransactions: 0,
        paypalTransactions: 0,
        totalTransactions: 0
      }
    }

    dailyData[dateKey].totalRevenue += amount
    dailyData[dateKey].totalTransactions += 1

    if (isPayPal) {
      dailyData[dateKey].paypalRevenue += amount
      dailyData[dateKey].paypalTransactions += 1
    } else {
      dailyData[dateKey].cardRevenue += amount
      dailyData[dateKey].cardTransactions += 1
    }
  })

  const data = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date))

  const keyMetrics = {
    totalRevenue,
    subscriptionRevenue,
    packageRevenue,
    cardRevenue,
    paypalRevenue,
    cardTransactions: cardPayments.length,
    paypalTransactions: paypalPayments.length,
    totalTransactions: externalPayments.length,
    averageDailyRevenue: data.length > 0 ? totalRevenue / data.length : totalRevenue
  }

  const insights = [
    `$${totalRevenue.toFixed(2)} total revenue generated`,
    `${externalPayments.length} total transactions`,
    `Card payments: ${cardPayments.length} ($${cardRevenue.toFixed(2)})`,
    `PayPal payments: ${paypalPayments.length} ($${paypalRevenue.toFixed(2)})`,
    `Seeker subscriptions: $${subscriptionRevenue.toFixed(2)}`,
    `Employer packages: $${packageRevenue.toFixed(2)}`,
    paypalPayments.length > 0
      ? `PayPal accounts for ${((paypalRevenue / totalRevenue) * 100).toFixed(1)}% of revenue`
      : 'No PayPal payments in this period'
  ]

  return {
    data,
    title: 'Revenue Analysis Report',
    description: 'Detailed breakdown of revenue streams by payment method and user type',
    keyMetrics,
    insights
  }
}