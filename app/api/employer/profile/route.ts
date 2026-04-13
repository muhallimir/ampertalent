import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    console.log('🚨 CRITICAL: Employer profile API called')
    const currentUser = await getCurrentUser(request)

    console.log('🚨 CRITICAL: Employer profile - getCurrentUser returned', {
      hasClerkUser: !!currentUser?.clerkUser,
      hasProfile: !!currentUser?.profile,
      clerkUserId: currentUser?.clerkUser?.id,
      profileId: currentUser?.profile?.id,
      profileEmail: currentUser?.profile?.email,
      profileName: currentUser?.profile?.name,
      profileRole: currentUser?.profile?.role,
      isImpersonating: currentUser?.isImpersonating
    })

    if (!currentUser || !currentUser.clerkUser) {
      console.log('🚨 CRITICAL: Employer profile - Unauthorized - missing user data')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Profile API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    // Verify employer role
    if (!currentUser.profile || currentUser.profile.role !== 'employer' || !currentUser.profile.employer) {
      console.error('❌ EMPLOYER ACCESS DENIED (Profile GET):', {
        hasProfile: !!currentUser.profile,
        role: currentUser.profile?.role,
        hasEmployer: !!currentUser.profile?.employer,
        isImpersonating: currentUser.isImpersonating
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const employer = currentUser.profile.employer

    // Transform to match frontend interface
    const profile = {
      id: employer.userId,
      companyName: employer.companyName,
      companyWebsite: employer.companyWebsite,
      companyDescription: employer.companyDescription,
      missionStatement: employer.missionStatement,
      coreValues: employer.coreValues,
      billingAddress: employer.billingAddress,
      taxId: employer.taxId,
      companyLogoUrl: employer.companyLogoUrl,
      profilePictureUrl: currentUser.profile.profilePictureUrl,
      createdAt: employer.createdAt.toISOString(),
      updatedAt: employer.updatedAt.toISOString()
    }

    // Get user email from Clerk - now properly handles impersonation
    let userEmail = 'No email found'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clerkUserAny = currentUser.clerkUser as any;

    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Using impersonated user Clerk data', {
        impersonatedUserId: currentUser.profile.id,
        impersonatedClerkUserId: currentUser.clerkUser.id,
        adminClerkUserId: (currentUser as any).adminClerkUser?.id,
        clerkUserEmail: clerkUserAny.primaryEmailAddress?.emailAddress || clerkUserAny.emailAddresses?.[0]?.emailAddress
      })
    }

    console.log('Clerk user object:', {
      id: currentUser.clerkUser.id,
      availableProperties: Object.keys(currentUser.clerkUser),
      primaryEmailAddress: clerkUserAny.primaryEmailAddress,
      emailAddresses: clerkUserAny.emailAddresses,
      firstName: clerkUserAny.firstName,
      lastName: clerkUserAny.lastName,
      isImpersonating: currentUser.isImpersonating
    })

    // Try different possible email properties from Clerk user (now correctly points to impersonated user when impersonating)
    if (clerkUserAny.primaryEmailAddress?.emailAddress) {
      userEmail = clerkUserAny.primaryEmailAddress.emailAddress
    } else if (clerkUserAny.emailAddresses && clerkUserAny.emailAddresses.length > 0) {
      userEmail = clerkUserAny.emailAddresses[0].emailAddress
    } else if (currentUser.isImpersonating && currentUser.profile.email) {
      // Fallback to profile email if Clerk user doesn't have email
      userEmail = currentUser.profile.email
    }

    console.log('Employer profile loaded successfully', {
      userId: currentUser.clerkUser.id,
      email: userEmail,
      companyName: employer.companyName,
      isImpersonating: currentUser.isImpersonating,
      emailSource: clerkUserAny.primaryEmailAddress?.emailAddress ? 'primaryEmailAddress' :
        clerkUserAny.emailAddresses ? 'emailAddresses array' :
          currentUser.isImpersonating ? 'profile fallback' : 'none'
    })

    // Get user's personal name from multiple sources
    let firstName = ''
    let lastName = ''
    let fullName = ''

    // Priority order: Clerk firstName/lastName -> Clerk full name -> Profile name -> Email-based fallback
    if (clerkUserAny.firstName || clerkUserAny.lastName) {
      firstName = clerkUserAny.firstName || ''
      lastName = clerkUserAny.lastName || ''
      fullName = `${firstName} ${lastName}`.trim()
      console.log('Using Clerk firstName/lastName:', fullName)
    } else if (currentUser.profile?.name) {
      fullName = currentUser.profile.name
      console.log('Using profile name:', fullName)
    } else {
      // Fallback: extract name from email
      const emailName = userEmail.split('@')[0].replace(/[._]/g, ' ')
      fullName = emailName
      console.log('Using email-based fallback name:', fullName)
    }

    // Split full name into first and last name
    if (fullName) {
      const nameParts = fullName.trim().split(' ')
      firstName = nameParts[0] || ''
      lastName = nameParts.slice(1).join(' ') || ''
    }

    console.log('Final name extraction result:', { fullName, firstName, lastName, userEmail })

    console.log('🚨 CRITICAL: Returning employer profile data for user', {
      profileId: currentUser.profile.id,
      profileEmail: currentUser.profile.email,
      profileName: currentUser.profile.name,
      employerUserId: employer.userId,
      companyName: employer.companyName,
      companyWebsite: employer.companyWebsite,
      userEmail: userEmail,
      hasCompanyData: !!(employer.companyName || employer.companyWebsite || employer.taxId)
    })

    return NextResponse.json({
      profile,
      userEmail,
      firstName,
      lastName,
      fullName
    })

  } catch (error) {
    console.error('Error fetching employer profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser || !currentUser.clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Profile UPDATE API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    // Verify employer role
    if (!currentUser.profile || currentUser.profile.role !== 'employer' || !currentUser.profile.employer) {
      console.error('❌ EMPLOYER ACCESS DENIED (Profile PUT):', {
        hasProfile: !!currentUser.profile,
        role: currentUser.profile?.role,
        hasEmployer: !!currentUser.profile?.employer,
        isImpersonating: currentUser.isImpersonating
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const employerId = currentUser.profile.employer.userId
    const data = await request.json()

    // Validate required fields
    if (!data.companyName || data.companyName.trim() === '') {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    // Update employer profile
    const updatedEmployer = await db.employer.update({
      where: { userId: employerId },
      data: {
        companyName: data.companyName,
        companyWebsite: data.companyWebsite || null,
        companyDescription: data.companyDescription || null,
        missionStatement: data.missionStatement || null,
        coreValues: data.coreValues || null,
        billingAddress: data.billingAddress || null,
        taxId: data.taxId || null,
        companyLogoUrl: data.companyLogoUrl || null,
        updatedAt: new Date()
      }
    })

    // Transform response
    const profile = {
      id: updatedEmployer.userId,
      companyName: updatedEmployer.companyName,
      companyWebsite: updatedEmployer.companyWebsite,
      companyDescription: updatedEmployer.companyDescription,
      missionStatement: updatedEmployer.missionStatement,
      coreValues: updatedEmployer.coreValues,
      billingAddress: updatedEmployer.billingAddress,
      taxId: updatedEmployer.taxId,
      companyLogoUrl: updatedEmployer.companyLogoUrl,
      createdAt: updatedEmployer.createdAt.toISOString(),
      updatedAt: updatedEmployer.updatedAt.toISOString()
    }

    // ✅ PHASE 2: Sync employer profile update to GHL
    // This ensures all changes (companyName, website, etc.) are reflected in GHL contact
    try {
      const { createGHLService } = await import('@/lib/ghl-sync-service');
      const ghlService = await createGHLService();

      if (ghlService) {
        console.log('[Employer Profile Update] Syncing updated profile to GHL...', {
          userId: employerId,
          companyName: updatedEmployer.companyName,
          fieldsUpdated: Object.keys(data)
        });

        // Fetch full user with employer relations needed for field mapping
        const fullUser = await db.userProfile.findUnique({
          where: { id: employerId },
          include: {
            employer: true
          }
        });

        if (fullUser) {
          // transformUserToGHLContact() uses field mappings to map all 10 auto-generated fields
          const ghlContact = await (ghlService as any).transformUserToGHLContact(fullUser);
          const result = await ghlService.upsertContact(ghlContact);

          console.log('[Employer Profile Update] GHL sync successful:', {
            message: result.message,
            contactId: result.contact.id,
            email: result.contact.email
          });
        }
      } else {
        console.warn('[Employer Profile Update] GHL service not available - skipping sync');
      }
    } catch (ghlError) {
      // Log error but don't fail the profile update
      console.error('[Employer Profile Update] GHL sync failed:', ghlError);
    }

    return NextResponse.json({
      success: true,
      profile
    })

  } catch (error) {
    console.error('Error updating employer profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser || !currentUser.clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Profile DELETE API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    // Verify employer role
    if (!currentUser.profile || currentUser.profile.role !== 'employer' || !currentUser.profile.employer) {
      console.error('❌ EMPLOYER ACCESS DENIED (Profile DELETE):', {
        hasProfile: !!currentUser.profile,
        role: currentUser.profile?.role,
        hasEmployer: !!currentUser.profile?.employer,
        isImpersonating: currentUser.isImpersonating
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const employerId = currentUser.profile.employer.userId

    // Check if employer has active jobs
    const activeJobs = await db.job.count({
      where: {
        employerId: employerId,
        status: {
          in: ['draft', 'pending_vetting', 'approved']
        }
      }
    })

    if (activeJobs > 0) {
      return NextResponse.json({
        error: 'Cannot delete profile with active job postings. Please delete or expire all jobs first.'
      }, { status: 400 })
    }

    // Check if employer has any packages with remaining listings
    const activePackages = await db.employerPackage.count({
      where: {
        employerId: employerId,
        listingsRemaining: {
          gt: 0
        }
      }
    })

    if (activePackages > 0) {
      return NextResponse.json({
        error: 'Cannot delete profile with unused job listing packages. Please use all listings or contact support.'
      }, { status: 400 })
    }

    // Delete employer profile (cascade will handle related data)
    await db.employer.delete({
      where: { userId: employerId }
    })

    // Delete user profile
    await db.userProfile.delete({
      where: { id: employerId }
    })

    return NextResponse.json({
      success: true,
      message: 'Profile deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting employer profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}