import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { id } = await params

    const jobId = id;

    // Get specific job details for public display
    const job = await db.job.findUnique({
      where: {
        id: jobId,
        status: 'approved'
      },
      select: {
        id: true,
        title: true,
        category: true,
        type: true,
        description: true,
        payRangeText: true,
        payRangeMin: true,
        payRangeMax: true,
        skillsRequired: true,
        benefits: true,
        isFlexibleHours: true,
        hoursPerWeek: true,
        remoteSchedule: true,
        locationText: true,
        createdAt: true,
        expiresAt: true,
        isCompanyPrivate: true, // Critical field for privacy functionality
        employer: {
          select: {
            companyName: true,
            companyLogoUrl: true,
            companyWebsite: true,
            companyDescription: true
          }
        }
      }
    });

    if (!job) {
      return Response.json(
        { error: 'Job not found or not available' },
        { status: 404 }
      );
    }

    // Check if job is expired
    if (job.expiresAt && job.expiresAt < new Date()) {
      return Response.json(
        { error: 'Job posting has expired' },
        { status: 410 }
      );
    }

    // Check if company information should be private
    const isCompanyPrivate = job.isCompanyPrivate || false
    const companyName = isCompanyPrivate ? 'Private Company' : job.employer.companyName

    // Format job for public consumption
    const publicJob = {
      id: job.id,
      title: job.title,
      company: {
        name: companyName,
        logo: isCompanyPrivate ? null : job.employer.companyLogoUrl,
        website: isCompanyPrivate ? null : job.employer.companyWebsite,
        description: isCompanyPrivate ? null : job.employer.companyDescription
      },
      location: job.locationText || 'Remote',
      type: job.type,
      category: job.category,
      description: job.description,
      payRange: job.payRangeText,
      payRangeMin: job.payRangeMin,
      payRangeMax: job.payRangeMax,
      skillsRequired: job.skillsRequired,
      benefits: job.benefits,
      isFlexibleHours: job.isFlexibleHours,
      hoursPerWeek: job.hoursPerWeek,
      remoteSchedule: job.remoteSchedule,
      postedAt: job.createdAt,
      expiresAt: job.expiresAt,
      applyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/jobs/${job.id}`,
      // SEO-friendly data
      seo: {
        title: `${job.title} at ${companyName} - HireMyMom`,
        description: job.description.length > 160
          ? job.description.substring(0, 160) + '...'
          : job.description,
        keywords: [job.category, job.type, 'remote work', 'work from home', ...job.skillsRequired].join(', ')
      }
    };

    return Response.json({ job: publicJob });
  } catch (error) {
    console.error('Error fetching public job details:', error);
    return Response.json(
      { error: 'Failed to fetch job details' },
      { status: 500 }
    );
  }
}