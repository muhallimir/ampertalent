import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { ConciergeService } from '@/lib/concierge-service';

interface JobData {
  title: string;
  description: string;
  requirements?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: 'hourly' | 'monthly' | 'yearly';
  location?: string;
  jobType?: 'FULL_TIME' | 'PART_TIME' | 'PERMANENT' | 'TEMPORARY';
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'lead';
  category?: string;
  skills?: string[];
  benefits?: string;
  applicationDeadline?: string;
  website?: string;
  linkedinProfile?: string;
  contactPhone?: string;
  isCompanyPrivate?: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Get current authenticated user
    const currentUser = await getCurrentUser(request);
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an admin
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { jobId } = await params;
    const jobData: JobData = await request.json();

    // Verify this is a concierge job
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        conciergeRequested: true
      },
      include: {
        employer: true
      }
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Concierge job not found' },
        { status: 404 }
      );
    }

    // Update job with latest data and post live
    const updatedJobData: any = {
      title: jobData.title,
      description: jobData.description,
      requirements: jobData.requirements || null,
      payRangeMin: jobData.salaryMin ? parseFloat(jobData.salaryMin.toString()) : null,
      payRangeMax: jobData.salaryMax ? parseFloat(jobData.salaryMax.toString()) : null,
      salaryType: jobData.salaryType || null,
      locationText: jobData.location || null,
      type: jobData.jobType || 'FULL_TIME',
      experienceLevel: jobData.experienceLevel || null,
      category: jobData.category || 'OTHER',
      skillsRequired: jobData.skills || [],
      benefits: jobData.benefits || null,
      applicationDeadline: jobData.applicationDeadline ? new Date(jobData.applicationDeadline) : null,
      website: jobData.website || null,
      linkedinProfile: jobData.linkedinProfile || null,
      contactPhone: jobData.contactPhone || null,
      isCompanyPrivate: jobData.isCompanyPrivate || false,
      // Post live settings
      status: 'approved',
      approvedAt: new Date(),
      // Auto-feature concierge jobs
      isFeatured: true,
      featuredStatus: 'completed',
      featuredRequestedAt: new Date(),
      featuredCompletedAt: new Date(),
      // Set expiry to 30 days from now
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    };

    // Update the job
    const updatedJob = await db.job.update({
      where: { id: jobId },
      data: updatedJobData
    });

    // Update concierge status to indicate job is live
    try {
      await db.$queryRaw`
        UPDATE concierge_requests 
        SET status = 'job_optimization',
            updated_at = NOW()
        WHERE job_id = ${jobId}
      `;
    } catch (conciergeError) {
      console.warn('Could not update concierge request status:', conciergeError);
    }

    // Create featured job request record for tracking
    try {
      // Find or create employer package for featured job tracking
      const employerPackage = await db.employerPackage.findFirst({
        where: {
          employerId: job.employerId,
          listingsRemaining: { gt: 0 }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (employerPackage) {
        await db.featuredJobRequest.create({
          data: {
            jobId: updatedJob.id,
            employerId: job.employerId,
            packageId: employerPackage.id,
            status: 'completed',
            requestedAt: new Date(),
            startedAt: new Date(),
            completedAt: new Date(),
            adminNotes: `Auto-featured concierge job posted live by admin ${currentUser.profile.name}`
          }
        });
      }
    } catch (featuredError) {
      console.warn('Could not create featured job request record:', featuredError);
    }

    console.log('🚀 ADMIN: Concierge job posted live', {
      jobId: updatedJob.id,
      title: updatedJob.title,
      adminId: currentUser.profile.id,
      adminName: currentUser.profile.name,
      isFeatured: updatedJob.isFeatured,
      status: updatedJob.status,
      approvedAt: updatedJob.approvedAt
    });

    return NextResponse.json({
      success: true,
      job: {
        id: updatedJob.id,
        title: updatedJob.title,
        status: updatedJob.status,
        isFeatured: updatedJob.isFeatured,
        approvedAt: updatedJob.approvedAt?.toISOString(),
        expiresAt: updatedJob.expiresAt?.toISOString()
      },
      message: 'Concierge job posted live successfully and added to featured section!'
    });

  } catch (error) {
    console.error('Error posting concierge job live:', error);
    return NextResponse.json(
      { error: 'Failed to post job live' },
      { status: 500 }
    );
  }
}