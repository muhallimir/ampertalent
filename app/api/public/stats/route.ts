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

    // Get job categories for marketing display
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
        // The platform launched in 2026, so the honest figure is the
        // number of years since then, not a marketing placeholder.
        yearsInBusiness: new Date().getFullYear() - 2026,
        successfulPlacements: 0 // No placement data is tracked yet
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
      // No trustIndicators block. The old one returned 50,000+ job seekers,
      // 30,000+ businesses, 18 years in business, an 82% success rate and
      // a 95% satisfaction rate, none of which this build had any data
      // for. Nothing consumed the block, it was only a public endpoint
      // handing out numbers that were not true.
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