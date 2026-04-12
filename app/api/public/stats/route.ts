import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get platform statistics for public display
    const [
      totalJobSeekers,
      totalEmployers,
      totalJobs,
      totalApplications,
      activeJobs
    ] = await Promise.all([
      db.userProfile.count({
        where: { role: 'seeker' }
      }),
      db.userProfile.count({
        where: { role: 'employer' }
      }),
      db.job.count({
        where: { status: 'approved' }
      }),
      db.application.count(),
      db.job.count({
        where: {
          status: 'approved',
          expiresAt: {
            gt: new Date()
          }
        }
      })
    ]);

    // Get job categories for WordPress display
    const jobCategories = await db.job.groupBy({
      by: ['category'],
      _count: { category: true },
      where: {
        status: 'approved'
      },
      orderBy: {
        _count: {
          category: 'desc'
        }
      },
      take: 10
    });

    // Get recent job posting activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentJobsCount = await db.job.count({
      where: {
        status: 'approved',
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });

    const recentSignupsCount = await db.userProfile.count({
      where: {
        role: 'seeker',
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });

    // Format statistics for public consumption
    const publicStats = {
      platform: {
        totalJobSeekers,
        totalEmployers,
        totalJobs,
        totalApplications,
        activeJobs,
        yearsInBusiness: 18, // Static value as mentioned on WordPress site
        successfulPlacements: Math.floor(totalApplications * 0.15) // Estimated conversion rate
      },
      activity: {
        recentJobs: recentJobsCount,
        recentSignups: recentSignupsCount,
        averageApplicationsPerJob: totalJobs > 0 ? Math.round(totalApplications / totalJobs) : 0
      },
      categories: jobCategories.map(cat => ({
        name: cat.category,
        count: cat._count.category,
        percentage: totalJobs > 0 ? Math.round((cat._count.category / totalJobs) * 100) : 0
      })),
      trustIndicators: {
        // These match the WordPress site claims
        jobSeekers: "50,000+", // Rounded up for marketing
        yearsInBusiness: "18 Years",
        smallBusinesses: "30,000+", // Rounded up for marketing
        successRate: "82%", // Based on concierge service claims
        averageTimeToHire: "14 days",
        satisfactionRate: "95%"
      },
      lastUpdated: new Date().toISOString()
    };

    return Response.json(publicStats);
  } catch (error) {
    console.error('Error fetching public stats:', error);
    return Response.json(
      { error: 'Failed to fetch platform statistics' },
      { status: 500 }
    );
  }
}