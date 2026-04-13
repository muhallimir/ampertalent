import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Add retry logic for authentication to handle race conditions
    let currentUser = await getCurrentUser(request);
    let retryCount = 0;
    const maxRetries = 2;

    // If authentication fails but we have a valid request, retry once
    while ((!currentUser || !currentUser.profile?.employer) && retryCount < maxRetries) {
      if (retryCount > 0) {
        console.warn(`🔄 PROFILE API: Retrying authentication (attempt ${retryCount + 1}/${maxRetries + 1})`);
        // Small delay to allow for any async operations to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      currentUser = await getCurrentUser(request);
      retryCount++;
    }

    if (!currentUser || !currentUser.clerkUser) {
      console.error('❌ PROFILE API: No current user or clerk user after retries', { retryCount });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Enhanced logging for debugging intermittent issues
    console.log('🔍 PROFILE API: User context', {
      hasProfile: !!currentUser.profile,
      role: currentUser.profile?.role,
      hasEmployer: !!currentUser.profile?.employer,
      isImpersonating: currentUser.isImpersonating,
      retriesUsed: retryCount
    });

    // Verify employer role with impersonation support
    if (!currentUser.profile) {
      console.error('❌ PROFILE API: No user profile found after retries', { retryCount });
      return NextResponse.json({ error: 'Profile not found' }, { status: 403 });
    }

    // Check if user is employer or admin impersonating employer
    if (currentUser.profile.role !== 'employer' && !currentUser.isImpersonating) {
      console.error('❌ PROFILE API: Access denied', {
        role: currentUser.profile.role,
        isImpersonating: currentUser.isImpersonating,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        retryCount
      });
      return NextResponse.json({ error: 'Access denied - employer role required' }, { status: 403 });
    }

    if (!currentUser.profile.employer) {
      console.error('❌ PROFILE API: No employer profile found for user after retries', {
        userId: currentUser.profile.id,
        isImpersonating: currentUser.isImpersonating,
        retryCount
      });
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 403 });
    }

    const employerId = currentUser.profile.employer.userId;

    // Log impersonation activity for security audit
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Admin accessing applicant profile', {
        adminId: (currentUser as any).adminProfile?.id,
        adminEmail: (currentUser as any).adminProfile?.email,
        impersonatedUserId: currentUser.profile.id,
        impersonatedUserEmail: currentUser.profile.email,
        employerId,
        applicationId: (await params).id,
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
      });
    }
    const { id: applicationId } = await params;

    console.log('✅ PROFILE API: Authentication successful', { employerId, applicationId, retriesUsed: retryCount });

    // First, get the application and verify the employer owns the job
    const application = await db.application.findFirst({
      where: {
        id: applicationId,
        job: {
          employerId
        }
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            employerId: true,
            status: true
          }
        },
        seeker: {
          include: {
            user: true,
          }
        }
      }
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Structure the response data based on current schema
    const profileData = {
      application: {
        id: application.id,
        status: application.status,
        appliedAt: application.appliedAt,
        coverLetter: application.coverLetter,
        resumeUrl: application.resumeUrl,
      },
      job: {
        id: application.job.id,
        title: application.job.title,
      },
      seeker: {
        id: application.seeker.userId,
        name: application.seeker.user.name,
        email: (application.status === 'interview' || application.status === 'hired') && application.job.status !== 'expired'
          ? application.seeker.user.email
          : null, // Hide email for non-interview/hired statuses or expired jobs
        phone: application.seeker.user.phone,
        profilePictureUrl: application.seeker.user.profilePictureUrl,
        headline: application.seeker.headline,
        aboutMe: application.seeker.aboutMe,
        availability: application.seeker.availability,
        skills: application.seeker.skills,
        portfolioUrls: application.seeker.portfolioUrls,
        resumeUrl: application.seeker.resumeUrl,
        resumeLastUploaded: application.seeker.resumeLastUploaded,
        membershipPlan: application.seeker.membershipPlan,
        allowDirectMessages: application.seeker.user.allowDirectMessages,
      }
    };

    return NextResponse.json(profileData);
  } catch (error) {
    console.error('Error fetching applicant profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}