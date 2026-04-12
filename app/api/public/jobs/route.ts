import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const category = searchParams.get('category');
    const type = searchParams.get('type');

    // Build where clause for filtering
    const where: any = {
      status: 'approved',
      isArchived: false, // Hide archived jobs from public listings
      isPaused: false, // Hide paused jobs from seekers
      expiresAt: {
        gt: new Date()
      }
    };

    if (category) {
      where.category = category;
    }

    if (type) {
      where.type = type;
    }

    // Get approved jobs for public display
    const jobs = await db.job.findMany({
      where,
      select: {
        id: true,
        title: true,
        category: true,
        type: true,
        description: true,
        payRangeText: true,
        skillsRequired: true,
        benefits: true,
        isFlexibleHours: true,
        hoursPerWeek: true,
        locationText: true,
        createdAt: true,
        expiresAt: true,
        isCompanyPrivate: true, // Critical field for privacy functionality
        employer: {
          select: {
            companyName: true,
            companyLogoUrl: true,
            companyWebsite: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    // Get total count for pagination
    const totalCount = await db.job.count({ where });

    // Format jobs for public consumption
    const publicJobs = jobs.map(job => {
      const isCompanyPrivate = job.isCompanyPrivate || false

      return {
        id: job.id,
        title: job.title,
        company: isCompanyPrivate ? 'Private Company' : job.employer.companyName,
        companyLogo: isCompanyPrivate ? null : job.employer.companyLogoUrl,
        companyWebsite: isCompanyPrivate ? null : job.employer.companyWebsite,
        location: job.locationText || 'Remote',
        type: job.type,
        category: job.category,
        description: job.description.length > 300
          ? job.description.substring(0, 300) + '...'
          : job.description,
        payRange: job.payRangeText,
        skillsRequired: job.skillsRequired,
        isFlexibleHours: job.isFlexibleHours,
        hoursPerWeek: job.hoursPerWeek,
        postedAt: job.createdAt,
        expiresAt: job.expiresAt,
        applyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/jobs/${job.id}`,
        benefits: job.benefits
      }
    });

    return Response.json({
      jobs: publicJobs,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching public jobs:', error);
    return Response.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}