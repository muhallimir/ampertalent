import crypto from 'crypto'
import { db } from '@/lib/db'
import { MembershipPlan } from '@prisma/client'

export interface CheckoutSession {
  id: string
  userId: string
  checkoutData: any
  selectedPlan: string
  sessionToken: string
  returnUrl: string
  expiresAt: Date
  userType: 'seeker' | 'employer'
}

/**
 * Complete seeker onboarding from a pending signup record
 * Used by PayPal flow when the user returns after approval
 */
export async function completeSeekerOnboardingFromPendingSignup(
  pendingSignupId: string,
  clerkUserId: string
): Promise<{
  success: boolean;
  userProfileId?: string;
  jobSeekerId?: string;
  error?: string;
}> {
  console.log('🔄 ONBOARDING: Starting completeSeekerOnboardingFromPendingSignup:', {
    pendingSignupId,
    clerkUserId
  });

  try {
    // Check if user already has a profile
    const existingProfile = await db.userProfile.findUnique({
      where: { clerkUserId },
      include: { jobSeeker: true }
    });

    if (existingProfile) {
      console.log('✅ ONBOARDING: User already has profile:', existingProfile.id);
      return {
        success: true,
        userProfileId: existingProfile.id,
        jobSeekerId: existingProfile.jobSeeker?.userId
      };
    }

    // Fetch the pending signup
    const pendingSignup = await db.pendingSignup.findUnique({
      where: { id: pendingSignupId }
    });

    if (!pendingSignup) {
      console.error('❌ ONBOARDING: Pending signup not found:', pendingSignupId);
      return { success: false, error: 'Pending signup not found' };
    }

    // Verify the clerk user ID matches
    if (pendingSignup.clerkUserId !== clerkUserId) {
      console.error('❌ ONBOARDING: Clerk user ID mismatch:', {
        pendingSignupClerkUserId: pendingSignup.clerkUserId,
        providedClerkUserId: clerkUserId
      });
      return { success: false, error: 'User ID mismatch' };
    }

    // Parse onboarding data
    let onboardingData: any = {};
    try {
      onboardingData = JSON.parse(pendingSignup.onboardingData);
    } catch (parseError) {
      console.error('❌ ONBOARDING: Failed to parse onboarding data:', parseError);
      return { success: false, error: 'Failed to parse onboarding data' };
    }

    const userFirstName = onboardingData.firstName || '';
    const userLastName = onboardingData.lastName || '';
    const userName = `${userFirstName} ${userLastName}`.trim();

    if (!userFirstName || !userLastName) {
      console.error('❌ ONBOARDING: Missing required name fields:', {
        firstName: userFirstName,
        lastName: userLastName
      });
      return { success: false, error: 'Missing required name fields' };
    }

    // Create user profile
    const newUserProfile = await db.userProfile.create({
      data: {
        clerkUserId,
        role: 'seeker',
        name: userName,
        firstName: userFirstName,
        lastName: userLastName,
        email: pendingSignup.email || ''
      }
    });

    console.log('✅ ONBOARDING: Created user profile:', newUserProfile.id);

    // Map plan ID to membership plan
    const planId = pendingSignup.selectedPlan;
    let membershipPlan: MembershipPlan = 'trial_monthly';
    let subscriptionDays = 33; // Default for trial

    switch (planId) {
      case 'trial':
        membershipPlan = 'trial_monthly';
        subscriptionDays = 33;
        break;
      case 'gold':
        membershipPlan = 'gold_bimonthly';
        subscriptionDays = 60;
        break;
      case 'vip-platinum':
        membershipPlan = 'vip_quarterly';
        subscriptionDays = 90;
        break;
      case 'annual-platinum':
        membershipPlan = 'annual_platinum';
        subscriptionDays = 365;
        break;
    }

    // Create job seeker profile with initial membership settings
    // Note: Subscription status is tracked in the Subscription model, not JobSeeker
    // membershipExpiresAt is set here but subscription.status will be 'active' after payment
    const newJobSeeker = await db.jobSeeker.create({
      data: {
        userId: newUserProfile.id,
        membershipPlan,
        membershipExpiresAt: new Date(Date.now() + subscriptionDays * 24 * 60 * 60 * 1000),
      }
    });

    console.log('✅ ONBOARDING: Created job seeker profile:', newJobSeeker.userId);

    // Clean up the pending signup
    await db.pendingSignup.delete({
      where: { id: pendingSignupId }
    });

    console.log('✅ ONBOARDING: Deleted pending signup record');

    return {
      success: true,
      userProfileId: newUserProfile.id,
      jobSeekerId: newJobSeeker.userId
    };
  } catch (error) {
    console.error('❌ ONBOARDING: Exception during onboarding:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during onboarding'
    };
  }
}

/**
 * Create a checkout session for EXISTING users (not new signups)
 * This is different from pending signups which are only for NEW users
 */
export async function createCheckoutSession({
  userId,
  checkoutData,
  selectedPlan,
  returnUrl,
  email,
  userType
}: {
  userId: string
  checkoutData: any
  selectedPlan: string
  returnUrl: string
  email: string
  userType: 'seeker' | 'employer'
}): Promise<CheckoutSession> {

  console.log('🔍 CHECKOUT-SESSION: Creating checkout session for existing user:', {
    userId,
    selectedPlan,
    returnUrl,
    email,
    userType,
    checkoutDataKeys: Object.keys(checkoutData || {})
  })

  const sessionToken = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours for checkout sessions

  try {
    // For existing users, we don't create pending signups
    // We just return a session object that can be used for checkout
    console.log('✅ CHECKOUT-SESSION: Created checkout session for existing user')

    return {
      id: crypto.randomBytes(16).toString('hex'), // Generate a temporary ID
      userId,
      checkoutData,
      selectedPlan,
      sessionToken,
      returnUrl,
      expiresAt,
      userType
    }
  } catch (error) {
    console.error('❌ CHECKOUT-SESSION: Error creating checkout session:', error)
    throw error
  }
}

/**
 * Create a pending signup session for NEW users going through onboarding
 * This should ONLY be used during the onboarding process
 */
export async function createPendingSignupSession({
  userId,
  onboardingData,
  selectedPlan,
  returnUrl,
  email
}: {
  userId: string
  onboardingData: any
  selectedPlan: string
  returnUrl: string
  email: string
}): Promise<{
  id: string
  userId: string
  onboardingData: any
  selectedPlan: string
  sessionToken: string
  returnUrl: string
  expiresAt: Date
}> {

  console.log('🔍 PENDING-SIGNUP: Creating pending signup session for NEW user:', {
    userId,
    selectedPlan,
    returnUrl,
    email,
    onboardingDataKeys: Object.keys(onboardingData || {})
  })

  // Check if user already has a profile - if so, they shouldn't be in pending signups
  const existingProfile = await db.userProfile.findUnique({
    where: { clerkUserId: userId }
  })

  if (existingProfile) {
    console.warn('⚠️ PENDING-SIGNUP: User already has profile, should not create pending signup:', {
      userId,
      existingProfileId: existingProfile.id
    })
    throw new Error('User already exists - should not create pending signup')
  }

  const sessionToken = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days for onboarding

  try {
    console.log('🔄 PENDING-SIGNUP: Creating database record for new user...')

    const pendingSignup = await db.pendingSignup.create({
      data: {
        clerkUserId: userId,
        email,
        onboardingData: JSON.stringify(onboardingData),
        selectedPlan,
        sessionToken,
        returnUrl,
        expiresAt
      }
    })

    console.log('✅ PENDING-SIGNUP: Database record created for new user:', {
      id: pendingSignup.id,
      clerkUserId: pendingSignup.clerkUserId,
      email: pendingSignup.email
    })

    return {
      id: pendingSignup.id,
      userId: pendingSignup.clerkUserId || userId, // Use the input userId as fallback
      onboardingData,
      selectedPlan: pendingSignup.selectedPlan,
      sessionToken,
      returnUrl,
      expiresAt
    }
  } catch (dbError) {
    console.error('❌ PENDING-SIGNUP: Database error creating pending signup:', dbError)
    throw dbError
  }
}

export async function validateSessionToken(
  pendingSignupId: string,
  sessionToken: string
): Promise<any | null> {

  const pendingSignup = await db.pendingSignup.findUnique({
    where: { id: pendingSignupId }
  })

  if (!pendingSignup ||
    pendingSignup.sessionToken !== sessionToken) {
    return null
  }

  return {
    id: pendingSignup.id,
    userId: pendingSignup.clerkUserId,
    onboardingData: JSON.parse(pendingSignup.onboardingData),
    selectedPlan: pendingSignup.selectedPlan,
    sessionToken: pendingSignup.sessionToken,
    returnUrl: pendingSignup.returnUrl,
    expiresAt: pendingSignup.expiresAt
  }
}

export async function cleanupExpiredPendingSignups(): Promise<number> {
  try {
    const result = await db.pendingSignup.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })

    console.log(`Cleaned up ${result.count} expired pending signups`)
    return result.count
  } catch (error) {
    console.error('Error cleaning up pending signups:', error)
    throw error
  }
}

export function generateSecureId(): string {
  return crypto.randomBytes(16).toString('hex')
}