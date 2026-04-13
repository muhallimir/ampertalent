import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { syncResumeCredits } from '@/lib/resume-credits';
import { hasActiveSubscription } from '@/lib/subscription-check';
import { planResumeLimit, planDisplayName } from '@/lib/subscription-plans';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Allow admin impersonation or actual seeker role
    const isValidUser =
      currentUser.profile.role === 'seeker' ||
      (currentUser.isImpersonating && currentUser.profile.role === 'seeker');

    if (!isValidUser) {
      console.log(
        '❌ RESUMES API: Forbidden - not a seeker or impersonating seeker, role:',
        currentUser.profile.role,
        'impersonating:',
        currentUser.isImpersonating
      );
      return NextResponse.json(
        { error: 'Only job seekers can access resumes' },
        { status: 403 }
      );
    }

    const jobSeeker = currentUser.profile.jobSeeker;
    if (!jobSeeker) {
      return NextResponse.json(
        { error: 'Job seeker profile not found' },
        { status: 404 }
      );
    }

    // Get all resumes from the new Resume model
    const resumes = await db.resume.findMany({
      where: {
        seekerId: currentUser.profile.id,
      },
      orderBy: [
        { isPrimary: 'desc' }, // Primary resume first
        { uploadedAt: 'desc' }, // Then by upload date
      ],
    });

    // If no resumes in new model, check for legacy resume
    if (resumes.length === 0 && jobSeeker.resumeUrl) {
      // Migrate legacy resume to new model
      const legacyResume = await db.resume.create({
        data: {
          seekerId: currentUser.profile.id,
          filename: 'Profile Resume',
          fileUrl: jobSeeker.resumeUrl,
          isPrimary: true,
          uploadedAt:
            jobSeeker.resumeLastUploaded || jobSeeker.updatedAt || new Date(),
        },
      });
      resumes.push(legacyResume);
    }

    // Format resumes for frontend
    const formattedResumes = resumes.map((resume) => ({
      id: resume.id,
      filename: resume.filename,
      uploadedAt: resume.uploadedAt.toISOString(),
      url: resume.fileUrl,
      isPrimary: resume.isPrimary,
      fileSize: resume.fileSize,
    }));

    // Sync resume credits before returning limits
    await syncResumeCredits(currentUser.profile.id);

    // Re-fetch jobSeeker with updated credits
    const updatedJobSeeker = await db.jobSeeker.findUnique({
      where: { userId: currentUser.profile.id },
      select: {
        membershipPlan: true,
        membershipExpiresAt: true,
        resumeCredits: true,
      },
    });

    if (!updatedJobSeeker) {
      return NextResponse.json(
        { error: 'Job seeker profile not found' },
        { status: 404 }
      );
    }

    // Check subscription status using centralized function
    const hasSubscription = await hasActiveSubscription(currentUser.profile.id);

    // Get resume limits info
    const remainingCredits = updatedJobSeeker.resumeCredits || 0;
    let resumeLimit = 0;
    let planName = 'No Plan';
    let isExpired = !hasSubscription;

    if (
      hasSubscription &&
      updatedJobSeeker.membershipPlan &&
      updatedJobSeeker.membershipPlan !== 'none'
    ) {
      resumeLimit = planResumeLimit(updatedJobSeeker.membershipPlan)
      planName = planDisplayName(updatedJobSeeker.membershipPlan)
    }

    // If no active subscription or expired, default to free limits
    if (resumeLimit === 0 || isExpired) {
      resumeLimit = 0; // Free users get 0 resumes
      planName = isExpired ? 'Expired Plan' : 'No Active Plan';
    }

    const currentResumeCount = resumes.length;

    // Calculate actual remaining uploads based on plan limit and current count
    let remainingUploads: number | 'unlimited' = 0;
    if (resumeLimit === 999) {
      remainingUploads = 'unlimited';
    } else if (resumeLimit > 0) {
      remainingUploads = Math.max(0, resumeLimit - currentResumeCount);
    }

    // Can upload if:
    // 1. Has remaining credits AND
    // 2. Current resume count is less than plan limit (or unlimited plan)
    const canUpload =
      remainingCredits > 0 &&
      (resumeLimit === 999 || currentResumeCount < resumeLimit);

    const response = NextResponse.json({
      success: true,
      resumes: formattedResumes,
      limits: {
        currentResumeCount,
        resumeLimit: resumeLimit === 999 ? 'unlimited' : resumeLimit,
        canUpload,
        remainingUploads,
        planName,
        isExpired,
        membershipExpiresAt:
          updatedJobSeeker.membershipExpiresAt?.toISOString(),
      },
    });

    return response;
  } catch (error) {
    console.error('Error fetching resumes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resumes' },
      { status: 500 }
    );
  }
}
