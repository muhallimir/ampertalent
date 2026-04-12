import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

interface JobUpdateData {
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
  isDraft?: boolean;
}

export async function PUT(
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
    const updateData: JobUpdateData = await request.json();

    // Verify this is a concierge job
    const job = await db.job.findFirst({
      where: {
        id: jobId,
        conciergeRequested: true
      }
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Concierge job not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const jobUpdateFields: any = {
      title: updateData.title,
      description: updateData.description,
      requirements: updateData.requirements || null,
      payRangeMin: updateData.salaryMin ? parseFloat(updateData.salaryMin.toString()) : null,
      payRangeMax: updateData.salaryMax ? parseFloat(updateData.salaryMax.toString()) : null,
      salaryType: updateData.salaryType || null,
      locationText: updateData.location || null,
      type: updateData.jobType || 'FULL_TIME',
      experienceLevel: updateData.experienceLevel || null,
      category: updateData.category || 'OTHER',
      skillsRequired: updateData.skills || [],
      benefits: updateData.benefits || null,
      applicationDeadline: updateData.applicationDeadline ? new Date(updateData.applicationDeadline) : null,
      website: updateData.website || null,
      linkedinProfile: updateData.linkedinProfile || null,
      contactPhone: updateData.contactPhone || null,
      isCompanyPrivate: updateData.isCompanyPrivate || false,
      updatedAt: new Date()
    };

    // If it's still a draft, keep it as draft
    if (updateData.isDraft && job.status === 'draft') {
      jobUpdateFields.status = 'draft';
    }

    // Update the job
    const updatedJob = await db.job.update({
      where: { id: jobId },
      data: jobUpdateFields
    });

    console.log('🔧 ADMIN: Concierge job updated', {
      jobId: updatedJob.id,
      adminId: currentUser.profile.id,
      isDraft: updateData.isDraft,
      status: updatedJob.status
    });

    return NextResponse.json({
      success: true,
      job: {
        id: updatedJob.id,
        title: updatedJob.title,
        status: updatedJob.status,
        updatedAt: updatedJob.updatedAt.toISOString()
      },
      message: updateData.isDraft ? 'Job draft saved successfully' : 'Job updated successfully'
    });

  } catch (error) {
    console.error('Error updating concierge job:', error);
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  }
}