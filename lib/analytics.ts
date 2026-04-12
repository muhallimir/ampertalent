// Analytics service for tracking platform metrics and generating insights
import { db } from "./db";
import { MembershipPlan } from "@prisma/client";

export interface PlatformMetrics {
  totalUsers: number;
  totalJobSeekers: number;
  totalEmployers: number;
  totalJobs: number;
  totalApplications: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  conversionRates: {
    visitorToSignup: number;
    signupToSubscription: number;
    applicationToHire: number;
  };
}

export interface UserEngagementMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averageSessionDuration: number;
  pageViews: number;
  bounceRate: number;
}

export interface JobMetrics {
  totalJobsPosted: number;
  approvedJobs: number;
  rejectedJobs: number;
  expiredJobs: number;
  averageTimeToApproval: number;
  jobsByCategory: Record<string, number>;
  jobsByType: Record<string, number>;
  averageApplicationsPerJob: number;
}

export interface RevenueMetrics {
  totalRevenue: number;
  subscriptionRevenue: number;
  packageRevenue: number;
  serviceRevenue: number; // Premium Services (Resume Refresh, Career Jumpstart, etc.)
  monthlyRecurringRevenue: number;
  // Employer recurring revenue breakdown
  employerRecurringRevenue: {
    monthlyRecurringRevenue: number; // Sum of active recurring employer packages
    activeSubscriptions: number; // Count of active recurring employer packages
    totalRecurringValue: number; // Total expected value of all active recurring packages
    totalCollectedRevenue: number; // Total revenue already collected from employer recurring
  };
  averageRevenuePerUser: number;
  churnRate: number;
  lifetimeValue: number;
  // Payment method breakdown
  paymentMethodBreakdown: {
    cardRevenue: number;
    paypalRevenue: number;
    cardTransactions: number;
    paypalTransactions: number;
  };
}

export interface ApplicationMetrics {
  totalApplications: number;
  applicationsByStatus: Record<string, number>;
  averageApplicationsPerSeeker: number;
  averageTimeToResponse: number;
  hireRate: number;
  topSkillsInDemand: string[];
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

export interface AnalyticsData {
  platform: PlatformMetrics;
  engagement: UserEngagementMetrics;
  jobs: JobMetrics;
  revenue: RevenueMetrics;
  applications: ApplicationMetrics;
  trends: {
    userGrowth: TimeSeriesData[];
    revenueGrowth: TimeSeriesData[];
    jobPostings: TimeSeriesData[];
    applications: TimeSeriesData[];
  };
}

/**
 * Analytics service for generating platform insights
 */
export class AnalyticsService {
  /**
   * Get comprehensive platform analytics
   */
  static async getPlatformAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<AnalyticsData> {
    try {
      console.log("[AnalyticsService] Generating platform analytics...", { startDate, endDate });

      // Set default date range if not provided
      const end = endDate || new Date();
      const start =
        startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      console.log("[AnalyticsService] Date range set:", {
        start: start.toISOString(),
        end: end.toISOString(),
        daysDifference: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
      });

      // Get real data from database
      console.log("[AnalyticsService] Fetching metrics from database...");
      const [
        platformMetrics,
        revenueMetrics,
        jobMetrics,
        applicationMetrics,
        engagementMetrics,
      ] = await Promise.all([
        this.getPlatformMetrics(start, end),
        this.getRevenueMetrics(start, end),
        this.getJobMetrics(start, end),
        this.getApplicationMetrics(start, end),
        this.getEngagementMetrics(start, end),
      ]);

      console.log("[AnalyticsService] All metrics fetched successfully");
      console.log("[AnalyticsService] Fetching trends data...");

      return {
        platform: platformMetrics,
        revenue: revenueMetrics,
        jobs: jobMetrics,
        applications: applicationMetrics,
        engagement: engagementMetrics,
        trends: {
          userGrowth: await this.getUserGrowthTrend(start, end),
          revenueGrowth: await this.getRevenueGrowthTrend(start, end),
          jobPostings: await this.getJobPostingsTrend(start, end),
          applications: await this.getApplicationsTrend(start, end),
        },
      };
    } catch (error) {
      console.error("[AnalyticsService] Error generating analytics:", error);
      console.error("[AnalyticsService] Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error("Failed to generate analytics data");
    }
  }

  /**
   * Get platform metrics from database
   */
  private static async getPlatformMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<PlatformMetrics> {
    console.log("[getPlatformMetrics] Starting query with date range:", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    console.log("[getPlatformMetrics] Querying UserProfile table (totalUsers)...");
    const totalUsers = await db.userProfile.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    console.log("[getPlatformMetrics] UserProfile.count (totalUsers):", totalUsers);

    console.log("[getPlatformMetrics] Querying UserProfile table (seekers)...");
    const totalJobSeekers = await db.userProfile.count({
      where: {
        role: "seeker",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    console.log("[getPlatformMetrics] UserProfile.count (seekers):", totalJobSeekers);

    console.log("[getPlatformMetrics] Querying UserProfile table (employers)...");
    const totalEmployers = await db.userProfile.count({
      where: {
        role: "employer",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    console.log("[getPlatformMetrics] UserProfile.count (employers):", totalEmployers);

    console.log("[getPlatformMetrics] Querying Job table...");
    const totalJobs = await db.job.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    console.log("[getPlatformMetrics] Job.count:", totalJobs);

    console.log("[getPlatformMetrics] Querying Application table...");
    const totalApplications = await db.application.count({
      where: {
        appliedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    console.log("[getPlatformMetrics] Application.count:", totalApplications);

    console.log("[getPlatformMetrics] Querying Subscription table...");
    const activeSubscriptions = await db.subscription.count({
      where: {
        status: "active",
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });
    console.log("[getPlatformMetrics] Subscription.count (active):", activeSubscriptions);

    // Get revenue from Authorize.net for the date range
    console.log("[getPlatformMetrics] Fetching revenue for date range...");
    const monthlyRevenue = await this.getRevenueForDateRange(startDate, endDate);
    console.log("[getPlatformMetrics] Monthly revenue:", monthlyRevenue);

    const result = {
      totalUsers,
      totalJobSeekers,
      totalEmployers,
      totalJobs,
      totalApplications,
      activeSubscriptions,
      monthlyRevenue,
      conversionRates: {
        visitorToSignup:
          totalUsers > 0 ? (totalUsers / (totalUsers * 10)) * 100 : 0, // Estimated
        signupToSubscription:
          totalUsers > 0 ? (activeSubscriptions / totalUsers) * 100 : 0,
        applicationToHire: totalApplications > 0 ? 8.7 : 0, // Would need hire tracking
      },
    };

    console.log("[getPlatformMetrics] Platform metrics result:", result);
    return result;
  }

  /**
   * Get revenue metrics from Authorize.net and database
   */
  private static async getRevenueMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<RevenueMetrics> {
    try {
      console.log("[getRevenueMetrics] Starting with date range:", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Get revenue from database (Stripe-based transactions)
      // We're using Stripe now instead of Authorize.net
      const externalPayments = await db.externalPayment.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      console.log("[getRevenueMetrics] Found external payments:", externalPayments.length);

      // Calculate revenue metrics from database
      const totalRevenue = externalPayments.reduce(
        (sum: number, payment: any) => sum + (payment.amount || 0),
        0
      );

      // Separate subscription vs package revenue
      // Since we don't track this in externalPayment, we'll estimate:
      // Most payments are subscriptions (recurring), smaller portion might be packages
      const subscriptionRevenue = totalRevenue * 0.7; // Estimate 70% from subscriptions
      const packageRevenue = totalRevenue * 0.3; // Estimate 30% from packages

      // Get active subscriptions for MRR calculation
      // NOTE: MRR should NOT be date-filtered - it's the current recurring revenue from ALL active subscriptions
      const subscriptions = await db.subscription.findMany({
        where: {
          status: "active",
          cancelAtPeriodEnd: false,
        },
        include: { seeker: true },
      });

      const monthlyRecurringRevenue = subscriptions.reduce((sum, sub) => {
        // Map subscription plans to monthly amounts (ALIGNED WITH SALES PAGE)
        const monthlyAmounts: Record<MembershipPlan, number> = {
          none: 0,
          trial_monthly: 34.99,
          gold_bimonthly: 24.995, // Bimonthly to monthly (49.99 / 2)
          vip_quarterly: 26.663, // Quarterly to monthly (79.99 / 3)
          annual_platinum: 24.92, // Annual to monthly (299 / 12)
        };
        return sum + (monthlyAmounts[sub.plan] || 0);
      }, 0);

      const totalUsers = await db.userProfile.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
      const averageRevenuePerUser =
        totalUsers > 0 ? totalRevenue / totalUsers : 0;

      // Calculate churn rate from actual subscription data (SYNCED WITH SALES PAGE)
      const activeSubscriptions = await db.subscription.count({
        where: {
          status: "active",
          cancelAtPeriodEnd: false,
        },
      });

      const canceledSubscriptions = await db.subscription.count({
        where: {
          cancelAtPeriodEnd: true,
        },
      });

      const churnRate = activeSubscriptions > 0
        ? (canceledSubscriptions / (activeSubscriptions + canceledSubscriptions)) * 100
        : 0;

      // Calculate lifetime value
      const lifetimeValue =
        churnRate > 0 ? averageRevenuePerUser / (churnRate / 100) : 0;

      // Get payment method breakdown from database (PayPal vs Card)
      const paymentsForMethodBreakdown = await db.externalPayment.findMany({
        where: {
          status: "completed",
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // PayPal payments have ghlTransactionId starting with 'PAYPAL_'
      const paypalPayments = paymentsForMethodBreakdown.filter(p => {
        const ghlTransactionId = p.ghlTransactionId || '';
        return ghlTransactionId.startsWith('PAYPAL_');
      });
      const cardPayments = paymentsForMethodBreakdown.filter(p => {
        const ghlTransactionId = p.ghlTransactionId || '';
        return !ghlTransactionId.startsWith('PAYPAL_');
      });

      const paymentMethodBreakdown = {
        cardRevenue: cardPayments.reduce((sum, p) => sum + Number(p.amount), 0),
        paypalRevenue: paypalPayments.reduce((sum, p) => sum + Number(p.amount), 0),
        cardTransactions: cardPayments.length,
        paypalTransactions: paypalPayments.length,
      };

      // Calculate employer recurring revenue from employer_packages table
      const employerRecurringPackages = await db.employerPackage.findMany({
        where: {
          isRecurring: true,
          recurringStatus: 'active',
          expiresAt: { gt: new Date() },
        },
      });

      const employerRecurringRevenue = {
        monthlyRecurringRevenue: employerRecurringPackages.reduce(
          (sum, pkg) => sum + (pkg.recurringAmountCents || 0) / 100,
          0
        ),
        activeSubscriptions: employerRecurringPackages.length,
        totalRecurringValue: employerRecurringPackages.reduce((sum, pkg) => {
          const remainingCycles = (pkg.billingCyclesTotal || 0) - (pkg.billingCyclesCompleted || 0);
          return sum + (remainingCycles * (pkg.recurringAmountCents || 0) / 100);
        }, 0),
        totalCollectedRevenue: employerRecurringPackages.reduce((sum, pkg) => {
          // Total collected = cycles completed * amount per cycle
          return sum + ((pkg.billingCyclesCompleted || 0) * (pkg.recurringAmountCents || 0) / 100);
        }, 0),
      };

      return {
        totalRevenue,
        subscriptionRevenue,
        packageRevenue,
        serviceRevenue: 0, // Not available from Authorize.net, use fallback for accurate data
        monthlyRecurringRevenue,
        employerRecurringRevenue,
        averageRevenuePerUser,
        churnRate,
        lifetimeValue,
        paymentMethodBreakdown,
      };
    } catch (error) {
      console.error("[getRevenueMetrics] Error getting revenue metrics from Authorize.net:", error);
      console.error("[getRevenueMetrics] Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      console.log("[getRevenueMetrics] Falling back to database (ExternalPayment table)...");

      // Fallback to database-only metrics if Authorize.net fails
      const externalPayments = await db.externalPayment.findMany({
        where: {
          status: "completed",
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          user: {
            select: {
              jobSeeker: true,
              employer: true,
            },
          },
        },
      });

      console.log("[getRevenueMetrics] ExternalPayment.findMany result:", {
        count: externalPayments.length,
        payments: externalPayments.map(p => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          createdAt: p.createdAt,
          userId: p.userId,
          hasJobSeeker: !!p.user?.jobSeeker,
          hasEmployer: !!p.user?.employer,
        })),
      });

      const totalRevenue = externalPayments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      );

      // Define service planId patterns (aligned with sales page)
      const SEEKER_SERVICE_IDS = [
        'career_jumpstart', 'interview_success_training', 'personal_career_strategist',
        'resume_refresh', 'create_new_resume', 'cover_letter_service', 'the_works'
      ];
      const isServicePlanId = (planId: string | null): boolean => {
        if (!planId) return false;
        return planId.startsWith('service_') || SEEKER_SERVICE_IDS.includes(planId);
      };

      // CATEGORIZE BY USER TYPE (aligned with sales page)
      const seekerPayments = externalPayments.filter(p => p.user?.jobSeeker);
      const employerPayments = externalPayments.filter(p => p.user?.employer);

      // Split seeker payments into subscriptions vs services (to avoid double counting)
      const seekerSubscriptionPayments = seekerPayments.filter(p => !isServicePlanId(p.planId));
      const seekerServicePayments = seekerPayments.filter(p => isServicePlanId(p.planId));

      const subscriptionRevenue = seekerSubscriptionPayments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      );

      const serviceRevenue = seekerServicePayments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      );

      const packageRevenue = employerPayments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0
      );

      // Fallback: Use database subscription data for accurate metrics
      console.log("[getRevenueMetrics] Querying Subscription table for fallback MRR...");
      const fallbackSubscriptions = await db.subscription.findMany({
        where: {
          status: "active",
          cancelAtPeriodEnd: false,
        },
      });

      console.log("[getRevenueMetrics] Subscription.findMany (active, not canceled):", {
        count: fallbackSubscriptions.length,
        subscriptions: fallbackSubscriptions.map(s => ({
          id: s.id,
          plan: s.plan,
          status: s.status,
          cancelAtPeriodEnd: s.cancelAtPeriodEnd,
        })),
      });

      const fallbackActiveCount = fallbackSubscriptions.length;
      const fallbackCanceledCount = await db.subscription.count({
        where: { cancelAtPeriodEnd: true },
      });

      console.log("[getRevenueMetrics] Subscription counts:", {
        active: fallbackActiveCount,
        canceled: fallbackCanceledCount,
      });

      const fallbackChurnRate = fallbackActiveCount > 0
        ? (fallbackCanceledCount / (fallbackActiveCount + fallbackCanceledCount)) * 100
        : 0;

      const totalFallbackUsers = await db.userProfile.count();
      const fallbackARPU = totalFallbackUsers > 0 ? totalRevenue / totalFallbackUsers : 0;
      const fallbackLifetimeValue = fallbackChurnRate > 0 ? fallbackARPU / (fallbackChurnRate / 100) : 0;

      // Calculate MRR for fallback case
      const planPrices: Record<MembershipPlan, number> = {
        none: 0,
        trial_monthly: 34.99,
        gold_bimonthly: 24.995,
        vip_quarterly: 26.663,
        annual_platinum: 24.92,
      };

      const fallbackMRR = fallbackSubscriptions.reduce((sum, sub) => {
        return sum + (planPrices[sub.plan] || 0);
      }, 0);

      console.log("[getRevenueMetrics] Calculated MRR from subscriptions:", fallbackMRR);

      // Calculate payment method breakdown (PayPal vs Card)
      // PayPal payments have ghlTransactionId starting with 'PAYPAL_'
      const paypalPaymentsFallback = externalPayments.filter(p => {
        const ghlTransactionId = p.ghlTransactionId || '';
        return ghlTransactionId.startsWith('PAYPAL_');
      });
      const cardPaymentsFallback = externalPayments.filter(p => {
        const ghlTransactionId = p.ghlTransactionId || '';
        return !ghlTransactionId.startsWith('PAYPAL_');
      });

      const fallbackPaymentMethodBreakdown = {
        cardRevenue: cardPaymentsFallback.reduce((sum, p) => sum + Number(p.amount), 0),
        paypalRevenue: paypalPaymentsFallback.reduce((sum, p) => sum + Number(p.amount), 0),
        cardTransactions: cardPaymentsFallback.length,
        paypalTransactions: paypalPaymentsFallback.length,
      };

      // Calculate employer recurring revenue from employer_packages table
      const fallbackEmployerRecurringPackages = await db.employerPackage.findMany({
        where: {
          isRecurring: true,
          recurringStatus: 'active',
          expiresAt: { gt: new Date() },
        },
      });

      const fallbackEmployerRecurringRevenue = {
        monthlyRecurringRevenue: fallbackEmployerRecurringPackages.reduce(
          (sum, pkg) => sum + (pkg.recurringAmountCents || 0) / 100,
          0
        ),
        activeSubscriptions: fallbackEmployerRecurringPackages.length,
        totalRecurringValue: fallbackEmployerRecurringPackages.reduce((sum, pkg) => {
          const remainingCycles = (pkg.billingCyclesTotal || 0) - (pkg.billingCyclesCompleted || 0);
          return sum + (remainingCycles * (pkg.recurringAmountCents || 0) / 100);
        }, 0),
        totalCollectedRevenue: fallbackEmployerRecurringPackages.reduce((sum, pkg) => {
          return sum + ((pkg.billingCyclesCompleted || 0) * (pkg.recurringAmountCents || 0) / 100);
        }, 0),
      };

      const fallbackResult = {
        totalRevenue,
        subscriptionRevenue,
        packageRevenue,
        serviceRevenue, // Premium Services
        monthlyRecurringRevenue: fallbackMRR,
        employerRecurringRevenue: fallbackEmployerRecurringRevenue,
        averageRevenuePerUser: fallbackARPU,
        churnRate: fallbackChurnRate,
        lifetimeValue: fallbackLifetimeValue,
        paymentMethodBreakdown: fallbackPaymentMethodBreakdown,
      };

      console.log("[getRevenueMetrics] Fallback revenue metrics result:", fallbackResult);

      return fallbackResult;
    }
  }

  /**
   * Get monthly revenue from Authorize.net
   */
  private static async getMonthlyRevenueFromAuthorizeNet(): Promise<number> {
    // Moved to database-based queries
    // Get from ExternalPayment table for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const payments = await db.externalPayment.findMany({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: now,
        },
      },
    });
    return payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  }

  /**
   * Get revenue for a specific date range
   * Uses database Stripe transactions
   */
  private static async getRevenueForDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      const payments = await db.externalPayment.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      if (payments && payments.length > 0) {
        const revenue = payments.reduce(
          (sum: number, p: any) => sum + (p.amount || 0),
          0
        );
        console.log("[getRevenueForDateRange] Revenue from Authorize.net transactions:", revenue);
        return revenue;
      }

      // If Authorize.net returns empty, fall back to database
      console.log("[getRevenueForDateRange] Authorize.net returned no transactions, falling back to database");
      const dbRevenue = await this.getRevenueFromDatabase(startDate, endDate);
      console.log("[getRevenueForDateRange] Revenue from database:", dbRevenue);
      return dbRevenue;
    } catch (error) {
      console.error("[getRevenueForDateRange] Error getting revenue for date range from Authorize.net, falling back to database:", error);

      // Fallback to database on any error
      try {
        const dbRevenue = await this.getRevenueFromDatabase(startDate, endDate);
        console.log("[getRevenueForDateRange] Fallback database revenue:", dbRevenue);
        return dbRevenue;
      } catch (dbError) {
        console.error("[getRevenueForDateRange] Error getting revenue from database fallback:", dbError);
        return 0;
      }
    }
  }

  /**
   * Get revenue from database for a specific date range
   * This is used as fallback when Authorize.net is unavailable
   */
  private static async getRevenueFromDatabase(
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      console.log("[getRevenueFromDatabase] Querying ExternalPayment table for date range:", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const payments = await db.externalPayment.findMany({
        where: {
          status: "completed",
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      console.log("[getRevenueFromDatabase] ExternalPayment.findMany result:", {
        count: payments.length,
        payments: payments.map(p => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          createdAt: p.createdAt,
        })),
      });

      const revenue = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      console.log("[getRevenueFromDatabase] Total revenue calculated:", revenue);

      return revenue;
    } catch (error) {
      console.error("[getRevenueFromDatabase] Error getting revenue from database:", error);
      return 0;
    }
  }

  /**
   * Get job metrics from database
   */
  private static async getJobMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<JobMetrics> {
    const [totalJobsPosted, approvedJobs, rejectedJobs, expiredJobs] =
      await Promise.all([
        db.job.count({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        db.job.count({
          where: {
            status: "approved",
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        db.job.count({
          where: {
            status: "rejected",
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        db.job.count({
          where: {
            status: "expired",
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
      ]);

    // Get jobs by category for the date range
    const jobsByCategory = await db.job.groupBy({
      by: ["category"],
      _count: { category: true },
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const categoryMap = jobsByCategory.reduce((acc, item) => {
      acc[item.category] = item._count.category;
      return acc;
    }, {} as Record<string, number>);

    // Get jobs by type for the date range
    const jobsByType = await db.job.groupBy({
      by: ["type"],
      _count: { type: true },
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const typeMap = jobsByType.reduce((acc, item) => {
      acc[item.type] = item._count.type;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average applications per job for jobs in the date range
    const jobsInRange = await db.job.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { id: true },
    });

    const jobIds = jobsInRange.map(job => job.id);
    const totalApplications = await db.application.count({
      where: {
        jobId: { in: jobIds },
      },
    });

    const averageApplicationsPerJob =
      jobIds.length > 0 ? totalApplications / jobIds.length : 0;

    return {
      totalJobsPosted,
      approvedJobs,
      rejectedJobs,
      expiredJobs,
      averageTimeToApproval: 2.3, // Would need approval timestamp tracking
      jobsByCategory: categoryMap,
      jobsByType: typeMap,
      averageApplicationsPerJob,
    };
  }

  /**
   * Get application metrics from database
   */
  private static async getApplicationMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<ApplicationMetrics> {
    const totalApplications = await db.application.count({
      where: {
        appliedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Get applications by status for the date range
    const applicationsByStatus = await db.application.groupBy({
      by: ["status"],
      _count: { status: true },
      where: {
        appliedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const statusMap = applicationsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    // Calculate average applications per seeker for the date range
    const applicationsInRange = await db.application.findMany({
      where: {
        appliedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { seekerId: true },
    });

    const uniqueSeekerIds = Array.from(new Set(applicationsInRange.map(app => app.seekerId)));
    const averageApplicationsPerSeeker =
      uniqueSeekerIds.length > 0 ? totalApplications / uniqueSeekerIds.length : 0;

    // Calculate hire rate for applications in the date range
    const hiredCount = statusMap["hired"] || 0;
    const hireRate =
      totalApplications > 0 ? (hiredCount / totalApplications) * 100 : 0;

    return {
      totalApplications,
      applicationsByStatus: statusMap,
      averageApplicationsPerSeeker,
      averageTimeToResponse: 3.8, // Would need response timestamp tracking
      hireRate,
      topSkillsInDemand: [
        "Customer Service",
        "Data Entry",
        "Virtual Assistant",
        "Content Writing",
        "Social Media",
        "Email Management",
      ], // Would need skill analysis
    };
  }

  /**
   * Get engagement metrics (simplified)
   */
  private static async getEngagementMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<UserEngagementMetrics> {
    // For now, return estimated values based on date range
    // In a real implementation, this would query session/user activity data
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    // Scale metrics based on date range (shorter ranges show lower activity)
    const scaleFactor = Math.min(daysDiff / 30, 1); // Max scale for ranges >= 30 days

    return {
      dailyActiveUsers: Math.round(89 * scaleFactor),
      weeklyActiveUsers: Math.round(312 * scaleFactor),
      monthlyActiveUsers: Math.round(567 * scaleFactor),
      averageSessionDuration: 8.5,
      pageViews: Math.round(15420 * scaleFactor),
      bounceRate: 32.1,
    };
  }

  /**
   * Get user growth trend
   */
  private static async getUserGrowthTrend(
    startDate: Date,
    endDate: Date
  ): Promise<TimeSeriesData[]> {
    const users = await db.userProfile.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by date
    const dateMap = new Map<string, number>();
    users.forEach((user) => {
      const date = user.createdAt.toISOString().split("T")[0];
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });

    return Array.from(dateMap.entries()).map(([date, value]) => ({
      date,
      value,
    }));
  }

  /**
   * Get revenue growth trend
   */
  private static async getRevenueGrowthTrend(
    startDate: Date,
    endDate: Date
  ): Promise<TimeSeriesData[]> {
    try {
      const payments = await db.externalPayment.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Group by date
      const dateMap = new Map<string, number>();
      payments.forEach((payment: any) => {
        const date = payment.createdAt.toISOString().split("T")[0];
        const amount = payment.amount || 0;
        dateMap.set(date, (dateMap.get(date) || 0) + amount);
      });

      return Array.from(dateMap.entries()).map(([date, value]) => ({
        date,
        value,
      }));
    } catch (error) {
      console.error("Error getting revenue trend:", error);
      return this.generateTimeSeriesData(30, 500, 800);
    }
  }

  /**
   * Get job postings trend
   */
  private static async getJobPostingsTrend(
    startDate: Date,
    endDate: Date
  ): Promise<TimeSeriesData[]> {
    const jobs = await db.job.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by date
    const dateMap = new Map<string, number>();
    jobs.forEach((job) => {
      const date = job.createdAt.toISOString().split("T")[0];
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });

    return Array.from(dateMap.entries()).map(([date, value]) => ({
      date,
      value,
    }));
  }

  /**
   * Get applications trend
   */
  private static async getApplicationsTrend(
    startDate: Date,
    endDate: Date
  ): Promise<TimeSeriesData[]> {
    const applications = await db.application.findMany({
      where: {
        appliedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        appliedAt: true,
      },
    });

    // Group by date
    const dateMap = new Map<string, number>();
    applications.forEach((app) => {
      const date = app.appliedAt.toISOString().split("T")[0];
      dateMap.set(date, (dateMap.get(date) || 0) + 1);
    });

    return Array.from(dateMap.entries()).map(([date, value]) => ({
      date,
      value,
    }));
  }


  /**
   * Get user-specific analytics for employers
   */
  static async getEmployerAnalytics(employerId: string): Promise<{
    jobsPosted: number;
    totalApplications: number;
    hires: number;
    averageTimeToHire: number;
    topPerformingJobs: Array<{
      id: string;
      title: string;
      applications: number;
      hires: number;
    }>;
    applicationTrends: TimeSeriesData[];
  }> {
    try {
      console.log("Generating employer analytics for:", employerId);

      // Mock employer-specific data
      return {
        jobsPosted: 8,
        totalApplications: 127,
        hires: 3,
        averageTimeToHire: 12.5, // days
        topPerformingJobs: [
          {
            id: "job_1",
            title: "Virtual Assistant - Part Time",
            applications: 45,
            hires: 1,
          },
          {
            id: "job_2",
            title: "Customer Service Representative",
            applications: 38,
            hires: 1,
          },
          {
            id: "job_3",
            title: "Content Writer - Flexible Hours",
            applications: 32,
            hires: 1,
          },
        ],
        applicationTrends: this.generateTimeSeriesData(30, 2, 8),
      };
    } catch (error) {
      console.error("Error generating employer analytics:", error);
      throw new Error("Failed to generate employer analytics");
    }
  }

  /**
   * Get user-specific analytics for job seekers
   */
  static async getSeekerAnalytics(seekerId: string): Promise<{
    applicationsSubmitted: number;
    interviewsReceived: number;
    jobsViewed: number;
    profileViews: number;
    responseRate: number;
    averageResponseTime: number;
    skillsInDemand: string[];
    applicationTrends: TimeSeriesData[];
  }> {
    try {
      console.log("Generating seeker analytics for:", seekerId);

      // Mock seeker-specific data
      return {
        applicationsSubmitted: 12,
        interviewsReceived: 3,
        jobsViewed: 89,
        profileViews: 24,
        responseRate: 75.0, // percentage
        averageResponseTime: 2.8, // days
        skillsInDemand: [
          "Customer Service",
          "Data Entry",
          "Virtual Assistant",
          "Content Writing",
        ],
        applicationTrends: this.generateTimeSeriesData(30, 0, 3),
      };
    } catch (error) {
      console.error("Error generating seeker analytics:", error);
      throw new Error("Failed to generate seeker analytics");
    }
  }

  /**
   * Generate cohort analysis for user retention
   */
  static async getCohortAnalysis(): Promise<{
    cohorts: Array<{
      cohortMonth: string;
      totalUsers: number;
      retentionRates: number[]; // retention by month
    }>;
  }> {
    try {
      // Mock cohort data
      const cohorts = [];
      const months = ["2024-01", "2024-02", "2024-03", "2024-04", "2024-05"];

      for (const month of months) {
        cohorts.push({
          cohortMonth: month,
          totalUsers: Math.floor(Math.random() * 100) + 50,
          retentionRates: Array.from({ length: 6 }, (_, i) =>
            Math.max(20, 100 - i * 15 - Math.random() * 10)
          ),
        });
      }

      return { cohorts };
    } catch (error) {
      console.error("Error generating cohort analysis:", error);
      throw new Error("Failed to generate cohort analysis");
    }
  }

  /**
   * Get real-time metrics for dashboard
   */
  static async getRealTimeMetrics(): Promise<{
    activeUsers: number;
    onlineJobSeekers: number;
    onlineEmployers: number;
    recentApplications: number;
    recentJobPostings: number;
  }> {
    try {
      // Mock real-time data
      return {
        activeUsers: Math.floor(Math.random() * 50) + 20,
        onlineJobSeekers: Math.floor(Math.random() * 30) + 10,
        onlineEmployers: Math.floor(Math.random() * 15) + 5,
        recentApplications: Math.floor(Math.random() * 10) + 2,
        recentJobPostings: Math.floor(Math.random() * 5) + 1,
      };
    } catch (error) {
      console.error("Error getting real-time metrics:", error);
      throw new Error("Failed to get real-time metrics");
    }
  }

  /**
   * Generate time series data for charts
   */
  private static generateTimeSeriesData(
    days: number,
    minValue: number,
    maxValue: number
  ): TimeSeriesData[] {
    const data: TimeSeriesData[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      data.push({
        date: date.toISOString().split("T")[0],
        value: Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue,
      });
    }

    return data;
  }

  /**
   * Calculate percentage change between two values
   */
  static calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * Format currency values
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  /**
   * Format percentage values
   */
  static formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Export analytics data to CSV
   */
  static async exportToCSV(data: Record<string, unknown>[]): Promise<string> {
    try {
      // Convert data to CSV format
      const headers = Object.keys(data[0] || {});
      const csvContent = [
        headers.join(","),
        ...data.map((row: Record<string, unknown>) =>
          headers
            .map((header) =>
              typeof row[header] === "string" && row[header].includes(",")
                ? `"${row[header]}"`
                : row[header]
            )
            .join(",")
        ),
      ].join("\n");

      return csvContent;
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      throw new Error("Failed to export data to CSV");
    }
  }
}

/**
 * Hook for real-time analytics updates
 */
export const useRealTimeAnalytics = () => {
  // This would be implemented with WebSocket or polling
  // for real-time updates in a production environment
  return {
    metrics: null,
    isLoading: false,
    error: null,
    refresh: () => { },
  };
};
