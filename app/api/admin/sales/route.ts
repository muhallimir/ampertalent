import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

interface SalesMetrics {
  totalRevenue: number
  monthlyRecurringRevenue: number
  averageRevenuePerUser: number
  totalTransactions: number
  revenueBySource: {
    seekerSubscriptions: number
    employerPackages: number
    seekerServices: number // Premium service purchases (Resume Refresh, etc.)
    exclusiveOffers: number // Employer exclusive recurring plans
  }
  exclusiveOffersMetrics: {
    activeSubscriptions: number
    monthlyMRR: number
    totalExpectedValue: number
  }
  revenueByPaymentMethod: {
    cardRevenue: number
    paypalRevenue: number
    cardTransactions: number
    paypalTransactions: number
  }
  revenueGrowth: {
    thisMonth: number
    lastMonth: number
    growthPercentage: number
  }
  topPlans: Array<{
    planId: string
    planName: string
    revenue: number
    count: number
  }>
  recentTransactions: Array<{
    id: string
    amount: number
    planId: string
    planName: string
    userType: 'seeker' | 'employer'
    userName: string
    userEmail: string
    userId: string
    createdAt: string
    status: string
    paymentMethod: 'card' | 'paypal'
    ghlTransactionId: string | null
    authnetTransactionId: string | null
    isNew: boolean
  }>
  monthlyTrend: Array<{
    month: string
    revenue: number
    transactions: number
  }>
  churnMetrics: {
    churnRate: number
    retentionRate: number
    canceledSubscriptions: number
    activeSubscriptions: number
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('[Sales API] Request received')

    // 1. AUTHENTICATION: Verify admin access
    const currentUser = await getCurrentUser(request)
    console.log('[Sales API] Current user:', {
      userId: currentUser?.id,
      role: currentUser?.profile?.role,
      hasClerkUser: !!currentUser?.clerkUser,
      hasProfile: !!currentUser?.profile,
    })

    if (!currentUser?.clerkUser || !currentUser.profile) {
      console.log('[Sales API] Unauthorized: No clerk user or profile')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super admin (revenue access restricted)
    if (currentUser.profile.role !== 'super_admin') {
      console.log('[Sales API] Forbidden: User is not super_admin, role:', currentUser.profile.role)
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    console.log('[Sales API] Authentication successful')

    // 1B. PARSE TRANSACTION FILTER PARAMS
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const emailParam = searchParams.get('email')?.toLowerCase().trim() || ''
    const statusParam = searchParams.get('status') || ''
    const paymentMethodParam = searchParams.get('paymentMethod') || ''
    const transactionTypeParam = searchParams.get('transactionType') || '' // 'new' | 'recurring' | ''
    const userRoleParam = searchParams.get('userRole') || '' // 'seeker' | 'employer' | ''
    const txPage = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const txPageSize = Math.min(10000, Math.max(1, parseInt(searchParams.get('pageSize') || '20')))

    // 2. GET DATE RANGES
    const now = new Date()
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    console.log('[Sales API] Date ranges calculated:', {
      now: now.toISOString(),
      startOfThisMonth: startOfThisMonth.toISOString(),
      startOfLastMonth: startOfLastMonth.toISOString(),
      endOfLastMonth: endOfLastMonth.toISOString(),
      startOfYear: startOfYear.toISOString(),
    })

    // 3. GET ALL PAYMENT DATA (All time - no date filter for total revenue)
    console.log('[Sales API] Querying ExternalPayment table...')
    const allPayments = await db.externalPayment.findMany({
      where: {
        status: 'completed'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            jobSeeker: true,
            employer: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log('[Sales API] ExternalPayment.findMany result:', {
      totalPayments: allPayments.length,
      firstPaymentDate: allPayments.length > 0 ? allPayments[allPayments.length - 1].createdAt.toISOString() : null,
      lastPaymentDate: allPayments.length > 0 ? allPayments[0].createdAt.toISOString() : null,
      samplePayments: allPayments.slice(0, 3).map(p => ({
        id: p.id,
        amount: p.amount,
        planId: p.planId,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        hasUser: !!p.user,
        userType: p.user?.jobSeeker ? 'seeker' : p.user?.employer ? 'employer' : 'unknown',
      })),
    })

    // 4. CALCULATE TOTAL REVENUE
    const totalRevenue = allPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
    console.log('[Sales API] Total revenue calculated:', totalRevenue)

    // 5. CALCULATE THIS MONTH'S REVENUE
    const thisMonthPayments = allPayments.filter(p => p.createdAt >= startOfThisMonth)
    const thisMonthRevenue = thisMonthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
    console.log('[Sales API] This month revenue:', {
      paymentsCount: thisMonthPayments.length,
      revenue: thisMonthRevenue,
    })

    // 6. CALCULATE LAST MONTH'S REVENUE
    const lastMonthPayments = allPayments.filter(p =>
      p.createdAt >= startOfLastMonth && p.createdAt <= endOfLastMonth
    )
    const lastMonthRevenue = lastMonthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
    console.log('[Sales API] Last month revenue:', {
      paymentsCount: lastMonthPayments.length,
      revenue: lastMonthRevenue,
    })

    // 7. CALCULATE REVENUE BY SOURCE
    // Define seeker service planId patterns (these are premium one-time services, not subscriptions)
    // rush_critique is a one-time service ($19.99) despite lacking the service_ prefix
    const SEEKER_SERVICE_IDS = [
      'career_jumpstart',
      'interview_success_training',
      'personal_career_strategist',
      'resume_refresh',
      'create_new_resume',
      'cover_letter_service',
      'the_works',
      'rush_critique',
    ]

    // Helper to check if a planId is a service (not a subscription)
    const isServicePlanId = (planId: string | null): boolean => {
      if (!planId) return false
      // Check for service_ prefix pattern OR direct service ID match
      return planId.startsWith('service_') || SEEKER_SERVICE_IDS.includes(planId)
    }

    const seekerPayments = allPayments.filter(p => p.user?.jobSeeker)
    const employerPayments = allPayments.filter(p => p.user?.employer)

    // Split seeker payments into subscriptions vs services (to avoid double counting)
    const seekerSubscriptionPayments = seekerPayments.filter(p => !isServicePlanId(p.planId))
    const seekerServicePayments = seekerPayments.filter(p => isServicePlanId(p.planId))

    const seekerSubscriptionRevenue = seekerSubscriptionPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
    const seekerServicesRevenue = seekerServicePayments.reduce((sum, payment) => sum + Number(payment.amount), 0)
    const employerRevenue = employerPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)

    console.log('[Sales API] Revenue by source:', {
      seekerSubscriptions: {
        count: seekerSubscriptionPayments.length,
        revenue: seekerSubscriptionRevenue,
      },
      seekerServices: {
        count: seekerServicePayments.length,
        revenue: seekerServicesRevenue,
        planIds: [...new Set(seekerServicePayments.map(p => p.planId))]
      },
      employers: {
        count: employerPayments.length,
        revenue: employerRevenue,
      },
    })

    // 7B. CALCULATE REVENUE BY PAYMENT METHOD (PayPal vs Card)
    // PayPal payments have ghlTransactionId starting with 'PAYPAL_'
    const paypalPaymentsAll = allPayments.filter(p => {
      const ghlTransactionId = p.ghlTransactionId || ''
      return ghlTransactionId.startsWith('PAYPAL_')
    })
    const cardPaymentsAll = allPayments.filter(p => {
      const ghlTransactionId = p.ghlTransactionId || ''
      return !ghlTransactionId.startsWith('PAYPAL_')
    })

    const cardRevenue = cardPaymentsAll.reduce((sum, payment) => sum + Number(payment.amount), 0)
    const paypalRevenue = paypalPaymentsAll.reduce((sum, payment) => sum + Number(payment.amount), 0)
    console.log('[Sales API] Revenue by payment method:', {
      card: {
        count: cardPaymentsAll.length,
        revenue: cardRevenue,
      },
      paypal: {
        count: paypalPaymentsAll.length,
        revenue: paypalRevenue,
      },
    })

    // 8. CALCULATE MRR (Monthly Recurring Revenue)
    // Get active subscriptions
    console.log('[Sales API] Querying Subscription table for MRR...')
    const activeSubscriptions = await db.subscription.findMany({
      where: {
        status: 'active',
        cancelAtPeriodEnd: false
      }
    })

    console.log('[Sales API] Subscription.findMany result:', {
      count: activeSubscriptions.length,
      planDistribution: activeSubscriptions.reduce((acc, sub) => {
        acc[sub.plan] = (acc[sub.plan] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      sampleSubscriptions: activeSubscriptions.slice(0, 3).map(s => ({
        id: s.id,
        plan: s.plan,
        status: s.status,
        cancelAtPeriodEnd: s.cancelAtPeriodEnd,
        createdAt: s.createdAt.toISOString(),
      })),
    })

    // Estimate MRR based on active subscriptions and average plan prices
    const planPrices: Record<string, number> = {
      'trial_monthly': 34.99,
      'gold_bimonthly': 24.995, // 49.99 / 2 months
      'vip_quarterly': 26.663, // 79.99 / 3 months
      'annual_platinum': 24.92 // 299 / 12 months
    }

    const monthlyRecurringRevenue = activeSubscriptions.reduce((sum, sub) => {
      const monthlyPrice = planPrices[sub.plan] || 25 // Default estimate
      return sum + monthlyPrice
    }, 0)
    console.log('[Sales API] MRR calculated:', monthlyRecurringRevenue)

    // 9. CALCULATE AVERAGE REVENUE PER USER
    console.log('[Sales API] Querying UserProfile table for total users...')
    const totalUsers = await db.userProfile.count({
      where: {
        OR: [
          { jobSeeker: { isNot: null } },
          { employer: { isNot: null } }
        ]
      }
    })
    console.log('[Sales API] Total users (seekers + employers):', totalUsers)

    const averageRevenuePerUser = totalUsers > 0 ? totalRevenue / totalUsers : 0
    console.log('[Sales API] ARPU calculated:', averageRevenuePerUser)

    // 10. GET TOP PERFORMING PLANS
    const planRevenue = new Map<string, { revenue: number; count: number }>()

    allPayments.forEach(payment => {
      const planId = payment.planId || 'unknown'
      const current = planRevenue.get(planId) || { revenue: 0, count: 0 }
      planRevenue.set(planId, {
        revenue: current.revenue + Number(payment.amount),
        count: current.count + 1
      })
    })

    const planNames: Record<string, string> = {
      'trial': '3 Day Free Trial',
      'gold': 'Gold Professional',
      'vip-platinum': 'VIP Platinum',
      'annual-platinum': 'Annual Platinum',
      'standard': 'Standard Job Post',
      'featured': 'Featured Job Post',
      'email_blast': 'Solo Email Blast',
      'gold_plus': 'Gold Plus Package',
      'gold_plus_recurring_6mo': 'Gold Plus 6-Month Recurring',
      'concierge_lite': 'Concierge LITE (Legacy)',
      'concierge_level_1': 'Concierge Level I',
      'concierge_level_2': 'Concierge Level II',
      'concierge_level_3': 'Concierge Level III'
    }

    const topPlans = Array.from(planRevenue.entries())
      .map(([planId, data]) => ({
        planId,
        planName: planNames[planId] || planId,
        revenue: data.revenue,
        count: data.count
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // 11. GET TRANSACTIONS (with optional filters and pagination)
    // --- 11A. Build N/R (isNew) classification map ---
    //
    // Classification rules:
    //
    //   Rule 1 — Seeker premium services (service_* prefix or SEEKER_SERVICE_IDS):
    //             ALWAYS N — these are one-time purchases, never recurring, even if
    //             the same service is bought multiple times.
    //
    //   Rule 2 — Seeker subscription plans (trial, gold, vip-platinum, annual-platinum):
    //             The subscription UI shows the active plan as "Current Plan" with a
    //             disabled CTA — a seeker CANNOT purchase the same plan they are already
    //             on. They must switch to a different plan first.
    //             Therefore: if this plan == the immediately preceding subscription plan
    //             for this user (skipping interleaved service purchases) → it is a
    //             system-triggered renewal → R.
    //             If the plan is different from the preceding one → it is a new manual
    //             purchase (initial activation or plan switch/upgrade) → N.
    //
    //   Rule 3a — Employer standard packages (all plans except gold_plus_recurring_6mo):
    //             ALWAYS N — employers can buy the same package repeatedly and each is
    //             a distinct new purchase (no recurring billing for these).
    //
    //   Rule 3b — gold_plus_recurring_6mo:
    //             Activation = N (first external_payment row for this userId+plan).
    //             Cron auto-charges (months 2–6) = R (subsequent rows for same userId+plan).

    // Pass 1: sort all payments chronologically so prev-plan tracking is correct.
    const allPaymentsSorted = [...allPayments].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    )

    // Tracks the last subscription plan purchased per seeker userId (service plans are ignored
    // when updating this — they don't affect the subscription renewal chain).
    const seekerLastSubPlan = new Map<string, string>()

    // Tracks first-seen for gold_plus_recurring_6mo employer activations.
    const employerRecurringFirstSet = new Set<string>()

    const isNewMap = new Map<string, boolean>()

    for (const payment of allPaymentsSorted) {
      const planId = payment.planId || 'unknown'
      const userId = payment.userId || 'unknown'
      const isServicePlan = planId.startsWith('service_') || SEEKER_SERVICE_IDS.includes(planId)
      const isSeeker = !!payment.user?.jobSeeker
      const isEmployer = !!payment.user?.employer

      if (isServicePlan) {
        // Rule 1 — Premium one-time service: always NEW.
        // Service purchases are NOT counted as subscription plan changes — they do not
        // update seekerLastSubPlan, so they cannot accidentally reset or advance the
        // renewal chain.
        isNewMap.set(payment.id, true)

      } else if (isSeeker) {
        // Rule 2 — Seeker subscription plan.
        // The UI prevents repurchasing the current plan; the only way the same plan
        // appears consecutively is if the system auto-renewed it.
        const prevPlan = seekerLastSubPlan.get(userId) ?? null
        const isRenewal = prevPlan !== null && planId === prevPlan
        isNewMap.set(payment.id, !isRenewal)
        // Always update last-sub-plan for this user (whether N or R).
        seekerLastSubPlan.set(userId, planId)

      } else if (isEmployer && planId === 'gold_plus_recurring_6mo') {
        // Rule 3b — Employer recurring plan: activation = N, cron cycles = R.
        const recurringKey = `${userId}:${planId}`
        if (!employerRecurringFirstSet.has(recurringKey)) {
          employerRecurringFirstSet.add(recurringKey)
          isNewMap.set(payment.id, true)
        } else {
          isNewMap.set(payment.id, false)
        }

      } else {
        // Rule 3a — All other employer packages: always NEW.
        isNewMap.set(payment.id, true)
      }
    }

    let transactionsSource = [...allPayments]

    if (startDateParam) {
      const d = new Date(startDateParam)
      if (!isNaN(d.getTime())) {
        transactionsSource = transactionsSource.filter(p => p.createdAt >= d)
      }
    }

    if (endDateParam) {
      const d = new Date(endDateParam)
      if (!isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999)
        transactionsSource = transactionsSource.filter(p => p.createdAt <= d)
      }
    }

    if (emailParam) {
      transactionsSource = transactionsSource.filter(p =>
        p.user?.email?.toLowerCase().includes(emailParam)
      )
    }

    if (statusParam) {
      transactionsSource = transactionsSource.filter(p => p.status === statusParam)
    }

    if (paymentMethodParam === 'paypal') {
      transactionsSource = transactionsSource.filter(p =>
        (p.ghlTransactionId || '').startsWith('PAYPAL_')
      )
    } else if (paymentMethodParam === 'authnet') {
      transactionsSource = transactionsSource.filter(p =>
        !(p.ghlTransactionId || '').startsWith('PAYPAL_')
      )
    }

    // Filter by transaction type (new / recurring)
    if (transactionTypeParam === 'new') {
      transactionsSource = transactionsSource.filter(p => isNewMap.get(p.id) === true)
    } else if (transactionTypeParam === 'recurring') {
      transactionsSource = transactionsSource.filter(p => isNewMap.get(p.id) === false)
    }

    // Filter by user role (seeker / employer)
    if (userRoleParam === 'seeker') {
      transactionsSource = transactionsSource.filter(p => !!p.user?.jobSeeker)
    } else if (userRoleParam === 'employer') {
      transactionsSource = transactionsSource.filter(p => !!p.user?.employer)
    }

    const totalFilteredTransactions = transactionsSource.length
    const totalTxPages = Math.ceil(totalFilteredTransactions / txPageSize) || 1
    const txOffset = (txPage - 1) * txPageSize

    const recentTransactions = transactionsSource
      .slice(txOffset, txOffset + txPageSize)
      .map(payment => {
        // Determine payment method from ghlTransactionId starting with 'PAYPAL_' (direct PayPal payment)
        const ghlTransactionId = payment.ghlTransactionId || ''
        const isPayPal = ghlTransactionId.startsWith('PAYPAL_')

        return {
          id: payment.id,
          amount: Number(payment.amount),
          planId: payment.planId || 'unknown',
          planName: planNames[payment.planId || ''] || payment.planId || 'Unknown Plan',
          userType: payment.user?.jobSeeker ? 'seeker' as const : 'employer' as const,
          userName: payment.user?.name || 'Unknown User',
          userEmail: payment.user?.email || 'No email',
          userId: payment.userId || '',
          createdAt: payment.createdAt.toISOString(),
          status: payment.status,
          paymentMethod: isPayPal ? 'paypal' as const : 'card' as const,
          ghlTransactionId: payment.ghlTransactionId || null,
          authnetTransactionId: payment.authnetTransactionId || null,
          isNew: isNewMap.get(payment.id) ?? true,
        }
      })

    // 12. CALCULATE MONTHLY TREND (Last 12 months)
    const monthlyTrend = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

      const monthPayments = allPayments.filter(p =>
        p.createdAt >= monthStart && p.createdAt <= monthEnd
      )

      const monthRevenue = monthPayments.reduce((sum, payment) => sum + Number(payment.amount), 0)

      monthlyTrend.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue,
        transactions: monthPayments.length
      })
    }

    // 13. CALCULATE CHURN METRICS
    console.log('[Sales API] Querying Subscription table for canceled subscriptions...')
    const canceledSubscriptions = await db.subscription.count({
      where: {
        cancelAtPeriodEnd: true
      }
    })
    console.log('[Sales API] Canceled subscriptions count:', canceledSubscriptions)

    const totalActiveSubscriptions = activeSubscriptions.length
    const churnRate = totalActiveSubscriptions > 0 ? (canceledSubscriptions / (totalActiveSubscriptions + canceledSubscriptions)) * 100 : 0
    const retentionRate = 100 - churnRate

    console.log('[Sales API] Churn metrics:', {
      activeSubscriptions: totalActiveSubscriptions,
      canceledSubscriptions,
      churnRate,
      retentionRate,
    })

    // 14. CALCULATE GROWTH PERCENTAGE
    const growthPercentage = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : thisMonthRevenue > 0 ? 100 : 0
    console.log('[Sales API] Growth percentage:', growthPercentage)

    // 15. CALCULATE EXCLUSIVE OFFERS (Employer Recurring Plans)
    const exclusiveRecurringPackages = await db.employerPackage.findMany({
      where: {
        isRecurring: true,
        recurringStatus: 'active',
        expiresAt: { gt: new Date() },
      },
      include: {
        invoices: {
          where: { status: 'paid' },
          select: { amountDue: true }
        }
      }
    })

    // Calculate exclusive offers metrics
    const exclusiveOffersRevenue = exclusiveRecurringPackages.reduce((sum, pkg) => {
      // Sum all paid invoices for this package
      const packageRevenue = pkg.invoices.reduce((invSum, inv) => invSum + (inv.amountDue || 0), 0)
      return sum + packageRevenue / 100 // Convert cents to dollars
    }, 0)

    const exclusiveOffersMRR = exclusiveRecurringPackages.reduce(
      (sum, pkg) => sum + (pkg.recurringAmountCents || 0) / 100,
      0
    )

    const exclusiveOffersExpectedValue = exclusiveRecurringPackages.reduce((sum, pkg) => {
      const remainingCycles = (pkg.billingCyclesTotal || 0) - (pkg.billingCyclesCompleted || 0)
      return sum + (remainingCycles * (pkg.recurringAmountCents || 0) / 100)
    }, 0)

    console.log('[Sales API] Exclusive offers metrics:', {
      activeSubscriptions: exclusiveRecurringPackages.length,
      totalRevenue: exclusiveOffersRevenue,
      monthlyMRR: exclusiveOffersMRR,
      expectedValue: exclusiveOffersExpectedValue,
    })

    // 16. BUILD RESPONSE
    const salesMetrics: SalesMetrics = {
      totalRevenue,
      monthlyRecurringRevenue,
      averageRevenuePerUser,
      totalTransactions: allPayments.length,
      revenueBySource: {
        seekerSubscriptions: seekerSubscriptionRevenue,
        employerPackages: employerRevenue,
        seekerServices: seekerServicesRevenue, // Premium service purchases
        exclusiveOffers: exclusiveOffersRevenue, // Employer exclusive recurring plans
      },
      exclusiveOffersMetrics: {
        activeSubscriptions: exclusiveRecurringPackages.length,
        monthlyMRR: exclusiveOffersMRR,
        totalExpectedValue: exclusiveOffersExpectedValue,
      },
      revenueByPaymentMethod: {
        cardRevenue,
        paypalRevenue,
        cardTransactions: cardPaymentsAll.length,
        paypalTransactions: paypalPaymentsAll.length
      },
      revenueGrowth: {
        thisMonth: thisMonthRevenue,
        lastMonth: lastMonthRevenue,
        growthPercentage
      },
      topPlans,
      recentTransactions,
      monthlyTrend,
      churnMetrics: {
        churnRate,
        retentionRate,
        canceledSubscriptions,
        activeSubscriptions: totalActiveSubscriptions
      }
    }

    console.log('[Sales API] Sales metrics generated successfully:', {
      totalRevenue,
      monthlyRecurringRevenue,
      totalTransactions: allPayments.length,
      activeSubscriptions: totalActiveSubscriptions,
      topPlansCount: topPlans.length,
      cardRevenue,
      paypalRevenue,
      exclusiveOffersRevenue,
    })

    return NextResponse.json({
      success: true,
      data: {
        ...salesMetrics,
        transactionsPagination: {
          total: totalFilteredTransactions,
          page: txPage,
          pageSize: txPageSize,
          totalPages: totalTxPages,
        }
      }
    })

  } catch (error) {
    console.error('[Sales API] Error fetching sales metrics:', error)
    console.error('[Sales API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { error: 'Failed to fetch sales metrics' },
      { status: 500 }
    )
  }
}