import { NextRequest, NextResponse } from 'next/server';
import { ConciergeService } from '@/lib/concierge-service';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Get concierge request details for a specific job
 */
export async function GET(
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

    // Get concierge request details
    const conciergeDetails = await ConciergeService.getConciergeRequestDetails(jobId);

    if (!conciergeDetails) {
      return NextResponse.json(
        { error: 'Concierge request not found' },
        { status: 404 }
      );
    }

    // Get complete job details with company information
    const jobDetails = await ConciergeService.getJobWithConciergeDetails(jobId);

    if (!jobDetails) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Get employer's concierge package type to determine visibility rules
    let conciergePackageType = null;
    try {
      const employerPackages = await db.employerPackage.findMany({
        where: {
          employerId: conciergeDetails.employerId,
          packageType: {
            in: ['concierge_lite', 'concierge_level_1', 'concierge_level_2', 'concierge_level_3']
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1
      });

      if (employerPackages.length > 0) {
        conciergePackageType = employerPackages[0].packageType;
      }
    } catch (error) {
      console.error('Error fetching concierge package type:', error);
      // Continue without package type information
    }

    // Return combined data
    return NextResponse.json({
      ...conciergeDetails,
      jobTitle: jobDetails.title,
      jobDescription: jobDetails.description,
      description: jobDetails.description,
      location: jobDetails.location,
      salaryMin: jobDetails.salaryMin,
      salaryMax: jobDetails.salaryMax,
      jobStatus: jobDetails.status,
      companyName: jobDetails.companyName,
      companyLogoUrl: jobDetails.companyLogoUrl,
      applicantsVisibleToEmployer: jobDetails.applicantsVisibleToEmployer,
      chatEnabled: jobDetails.chatEnabled,
      isCompanyPrivate: jobDetails.isCompanyPrivate,
      applications: jobDetails.applications || [],
      conciergePackageType: conciergePackageType
    });
  } catch (error) {
    console.error('Error getting concierge request details:', error);
    return NextResponse.json(
      { error: 'Failed to get concierge request details' },
      { status: 500 }
    );
  }
}