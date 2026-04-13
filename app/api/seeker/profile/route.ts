import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasActiveSubscription } from '@/lib/subscription-check';

export async function GET(request: NextRequest) {
  try {
    console.log('🚨 CRITICAL: Seeker profile API called');
    const currentUser = await getCurrentUser(request);

    console.log('🚨 CRITICAL: Seeker profile - getCurrentUser returned', {
      hasClerkUser: !!currentUser?.clerkUser,
      hasProfile: !!currentUser?.profile,
      clerkUserId: (currentUser?.clerkUser as any)?.id,
      profileId: currentUser?.profile?.id,
      profileEmail: currentUser?.profile?.email,
      profileName: currentUser?.profile?.name,
      profileRole: currentUser?.profile?.role,
      isImpersonating: currentUser?.isImpersonating,
    });

    if (!currentUser?.clerkUser || !currentUser.profile) {
      console.log(
        '🚨 CRITICAL: Seeker profile - Unauthorized - missing user data'
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log(
        '🎭 IMPERSONATION: Seeker profile API called with impersonated user',
        {
          adminId: currentUser.isImpersonating
            ? (currentUser as any).adminProfile?.id
            : undefined,
          impersonatedUserId: currentUser.profile?.id,
          impersonatedRole: currentUser.profile?.role,
        }
      );
    }

    // Verify seeker role (impersonation is handled in getCurrentUser)
    if (currentUser.profile.role !== 'seeker') {
      console.error('❌ SEEKER ACCESS DENIED (Profile):', {
        hasProfile: !!currentUser.profile,
        role: currentUser.profile?.role,
        isImpersonating: currentUser.isImpersonating,
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get seeker profile with user profile data and primary resume in one query
    let seekerProfile;
    try {
      seekerProfile = await db.jobSeeker.findUnique({
        where: { userId: currentUser.profile.id },
        include: {
          user: {
            select: {
              name: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              timezone: true,
              profilePictureUrl: true,
            },
          },
          resumes: {
            where: {
              isPrimary: true,
            },
            orderBy: {
              uploadedAt: 'desc',
            },
            take: 1,
          },
        },
      });
    } catch (dbError: any) {
      // Handle missing professional_summary column on legacy databases
      if (dbError.message && dbError.message.includes('professional_summary')) {
        seekerProfile = await db.jobSeeker.findUnique({
          where: { userId: currentUser.profile.id },
          include: {
            user: {
              select: {
                name: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                timezone: true,
                profilePictureUrl: true,
              },
            },
            resumes: {
              where: {
                isPrimary: true,
              },
              orderBy: {
                uploadedAt: 'desc',
              },
              take: 1,
            },
          },
        });
      } else {
        throw dbError;
      }
    }

    if (!seekerProfile) {
      return NextResponse.json(
        { error: 'Seeker profile not found' },
        { status: 404 }
      );
    }

    // Get the primary resume from the joined data
    const primaryResume = seekerProfile.resumes[0] || null;

    // Use database firstName/lastName if available, otherwise split name for backward compatibility
    let firstName = seekerProfile.user.firstName || '';
    let lastName = seekerProfile.user.lastName || '';

    if (!firstName && !lastName && seekerProfile.user.name) {
      const nameParts = seekerProfile.user.name.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    // Transform for frontend
    const profile = {
      // User profile data
      id: currentUser.profile.id,
      name: seekerProfile.user.name,
      firstName: firstName,
      lastName: lastName,
      email: seekerProfile.user.email,
      phone: seekerProfile.user.phone,
      timezone: seekerProfile.user.timezone,
      profilePictureUrl: seekerProfile.user.profilePictureUrl,

      // Seeker-specific data
      headline: seekerProfile.headline,
      aboutMe: seekerProfile.aboutMe,
      professionalSummary: seekerProfile && 'professionalSummary' in seekerProfile ? (seekerProfile as any).professionalSummary : null,
      availability: seekerProfile.availability,
      salaryExpectations: seekerProfile.salaryExpectations,
      skills: seekerProfile.skills,
      portfolioUrls: seekerProfile.portfolioUrls,
      // the seekerProfile.resumeUrl here doesnt have amny data, need to fetched it
      resumeUrl: primaryResume?.fileUrl || seekerProfile.resumeUrl, // Use new Resume table, fallback to legacy
      resumeLastUploaded: seekerProfile.resumeLastUploaded?.toISOString(),
      workExperience: seekerProfile.workExperience,
      education: seekerProfile.education,
      membershipPlan: seekerProfile.membershipPlan,
      membershipExpiresAt: seekerProfile.membershipExpiresAt?.toISOString(),
      hasActiveSubscription: await hasActiveSubscription(currentUser.profile.id),
      resumeCredits: seekerProfile.resumeCredits,
      createdAt: seekerProfile.createdAt.toISOString(),
      updatedAt: seekerProfile.updatedAt.toISOString(),
    };

    console.log('🚨 CRITICAL: Returning seeker profile data for user', {
      profileId: currentUser.profile.id,
      profileEmail: currentUser.profile.email,
      profileName: currentUser.profile.name,
      seekerUserId: seekerProfile.userId,
      seekerEmail: seekerProfile.user.email,
      seekerName: seekerProfile.user.name,
      hasPersonalData: !!(profile.phone || profile.email || profile.resumeUrl),
      professionalSummaryLength: profile.professionalSummary?.length || 0,
      professionalSummaryPreview: profile.professionalSummary?.substring(0, 50) || 'null'
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error fetching seeker profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log(
        '🎭 IMPERSONATION: Seeker profile PUT API called with impersonated user',
        {
          adminId: currentUser.isImpersonating
            ? (currentUser as any).adminProfile?.id
            : undefined,
          impersonatedUserId: currentUser.profile?.id,
          impersonatedRole: currentUser.profile?.role,
        }
      );
    }

    // Verify seeker role (impersonation is handled in getCurrentUser)
    if (currentUser.profile.role !== 'seeker') {
      console.error('❌ SEEKER ACCESS DENIED (Profile PUT):', {
        hasProfile: !!currentUser.profile,
        role: currentUser.profile?.role,
        isImpersonating: currentUser.isImpersonating,
      });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      // User profile fields
      name,
      firstName,
      lastName,
      phone,
      timezone,

      // Seeker-specific fields
      headline,
      aboutMe,
      professionalSummary,
      availability,
      salaryExpectations,
      skills = [],
      portfolioUrls = [],
      workExperience,
      education = [],
    } = body;

    // Update user profile if provided
    if (name || firstName || lastName || phone || timezone) {
      const updateData: any = {};

      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;

      if (firstName && lastName) {
        updateData.name = `${firstName} ${lastName}`;
      } else if (name) {
        updateData.name = name;
      }

      if (phone) updateData.phone = phone;
      if (timezone) updateData.timezone = timezone;

      await db.userProfile.update({
        where: { id: currentUser.profile.id },
        data: updateData,
      });
    }

    // Validate education data if provided
    if (education && Array.isArray(education)) {
      if (education.length > 10) {
        return NextResponse.json(
          { error: 'Maximum 10 education entries allowed' },
          { status: 400 }
        );
      }

      // Validate each education entry
      for (let i = 0; i < education.length; i++) {
        const edu = education[i];
        if (!edu.institution || edu.institution.length > 200) {
          return NextResponse.json(
            {
              error: `Education entry ${i + 1
                }: Institution is required and must be less than 200 characters`,
            },
            { status: 400 }
          );
        }
        if (!edu.certifications || edu.certifications.length > 300) {
          return NextResponse.json(
            {
              error: `Education entry ${i + 1
                }: Certifications are required and must be less than 300 characters`,
            },
            { status: 400 }
          );
        }
        if (!edu.startDate) {
          return NextResponse.json(
            { error: `Education entry ${i + 1}: Start date is required` },
            { status: 400 }
          );
        }
        if (edu.endDate && new Date(edu.endDate) < new Date(edu.startDate)) {
          return NextResponse.json(
            {
              error: `Education entry ${i + 1
                }: End date must be after start date`,
            },
            { status: 400 }
          );
        }
        if (edu.notes && edu.notes.length > 500) {
          return NextResponse.json(
            {
              error: `Education entry ${i + 1
                }: Notes must be less than 500 characters`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Validate work experience length
    if (workExperience && workExperience.length > 5000) {
      return NextResponse.json(
        { error: 'Work experience must be less than 5000 characters' },
        { status: 400 }
      );
    }

    // Update seeker profile with joined resume data
    const updatedSeeker = await db.jobSeeker.update({
      where: { userId: currentUser.profile.id },
      data: {
        ...(headline !== undefined && { headline }),
        ...(aboutMe !== undefined && { aboutMe }),
        ...(professionalSummary !== undefined && { professionalSummary }),
        ...(availability !== undefined && { availability }),
        ...(salaryExpectations !== undefined && { salaryExpectations }),
        ...(skills && { skills }),
        ...(portfolioUrls && { portfolioUrls }),
        ...(workExperience !== undefined && { workExperience }),
        ...(education !== undefined && { education }),
      },
      include: {
        user: {
          select: {
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            timezone: true,
            profilePictureUrl: true,
          },
        },
        resumes: {
          where: {
            isPrimary: true,
          },
          orderBy: {
            uploadedAt: 'desc',
          },
          take: 1,
        },
      },
    });

    // Get the primary resume from the joined data
    const primaryResume = updatedSeeker.resumes[0] || null;

    // Use database firstName/lastName if available, otherwise split name for backward compatibility
    let updatedFirstName = updatedSeeker.user.firstName || '';
    let updatedLastName = updatedSeeker.user.lastName || '';

    if (!updatedFirstName && !updatedLastName && updatedSeeker.user.name) {
      const updatedNameParts = updatedSeeker.user.name.split(' ');
      updatedFirstName = updatedNameParts[0] || '';
      updatedLastName = updatedNameParts.slice(1).join(' ') || '';
    }

    // Return updated profile
    const profile = {
      name: updatedSeeker.user.name,
      firstName: updatedFirstName,
      lastName: updatedLastName,
      email: updatedSeeker.user.email,
      phone: updatedSeeker.user.phone,
      timezone: updatedSeeker.user.timezone,
      profilePictureUrl: updatedSeeker.user.profilePictureUrl,
      headline: updatedSeeker.headline,
      aboutMe: updatedSeeker.aboutMe,
      professionalSummary: updatedSeeker && 'professionalSummary' in updatedSeeker ? (updatedSeeker as any).professionalSummary : null,
      availability: updatedSeeker.availability,
      salaryExpectations: updatedSeeker.salaryExpectations,
      skills: updatedSeeker.skills,
      portfolioUrls: updatedSeeker.portfolioUrls,
      resumeUrl: primaryResume?.fileUrl || updatedSeeker.resumeUrl, // Use new Resume table, fallback to legacy
      resumeLastUploaded: updatedSeeker.resumeLastUploaded?.toISOString(),
      workExperience: updatedSeeker.workExperience,
      education: updatedSeeker.education,
      membershipPlan: updatedSeeker.membershipPlan,
      membershipExpiresAt: updatedSeeker.membershipExpiresAt?.toISOString(),
      resumeCredits: updatedSeeker.resumeCredits,
      updatedAt: updatedSeeker.updatedAt.toISOString(),
    };

    // ✅ PHASE 2: Sync profile update to GHL
    // This ensures all changes (name, email, phone, custom fields) are reflected in GHL contact
    try {
      const { createGHLService } = await import('@/lib/ghl-sync-service');
      const ghlService = await createGHLService();

      if (ghlService) {
        console.log('[Seeker Profile Update] Syncing updated profile to GHL...', {
          userId: currentUser.profile.id,
          email: updatedSeeker.user.email,
          fieldsUpdated: Object.keys(body)
        });

        // Fetch full user with all relations needed for field mapping
        const fullUser = await db.userProfile.findUnique({
          where: { id: currentUser.profile.id },
          include: {
            jobSeeker: {
              include: {
                subscriptions: {
                  orderBy: { createdAt: 'desc' },
                  take: 1
                }
              }
            }
          }
        });

        if (fullUser) {
          // transformUserToGHLContact() uses field mappings to map all 10 auto-generated fields
          const ghlContact = await (ghlService as any).transformUserToGHLContact(fullUser);
          const result = await ghlService.upsertContact(ghlContact);

          console.log('[Seeker Profile Update] GHL sync successful:', {
            message: result.message,
            contactId: result.contact.id,
            email: result.contact.email
          });
        }
      } else {
        console.warn('[Seeker Profile Update] GHL service not available - skipping sync');
      }
    } catch (ghlError) {
      // Log error but don't fail the profile update
      console.error('[Seeker Profile Update] GHL sync failed:', ghlError);
    }

    // Create a response that includes instructions to dispatch the profile update event
    const response = NextResponse.json({
      success: true,
      profile,
      dispatchEvent: 'userProfileUpdated', // Signal to frontend to dispatch event
    });

    return response;
  } catch (error) {
    console.error('Error updating seeker profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify seeker role
    if (currentUser.profile.role !== 'seeker') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if seeker has active applications
    const activeApplications = await db.application.count({
      where: {
        seekerId: currentUser.profile.id,
        status: {
          in: ['pending', 'reviewed', 'interview'],
        },
      },
    });

    if (activeApplications > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot delete profile with active job applications. Please withdraw applications first.',
        },
        { status: 400 }
      );
    }

    // Check for active subscription
    const activeSubscription = await db.subscription.findFirst({
      where: {
        seekerId: currentUser.profile.id,
        status: 'active',
      },
    });

    if (activeSubscription) {
      return NextResponse.json(
        {
          error:
            'Cannot delete profile with active subscription. Please cancel subscription first.',
        },
        { status: 400 }
      );
    }

    // Delete seeker profile (cascade will handle related data)
    await db.jobSeeker.delete({
      where: { userId: currentUser.profile.id },
    });

    // Delete user profile
    await db.userProfile.delete({
      where: { id: currentUser.profile.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Profile deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting seeker profile:', error);
    return NextResponse.json(
      { error: 'Failed to delete profile' },
      { status: 500 }
    );
  }
}
