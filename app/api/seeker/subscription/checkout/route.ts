import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { createCheckoutSession } from '@/lib/checkout-session-management'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { selectedPackage, upgradeType = 'new' } = await request.json()

    if (!selectedPackage) {
      return NextResponse.json(
        { error: 'Package selection required' },
        { status: 400 }
      )
    }

    // Get user profile (may not exist during onboarding)
    const userProfile = await db.userProfile.findUnique({
      where: { clerkUserId: currentUser.clerkUser.id },
      include: {
        jobSeeker: {
          select: {
            membershipPlan: true,
            membershipExpiresAt: true,
            isOnTrial: true
          }
        }
      }
    })

    // For onboarding users, we may not have a profile yet
    const isOnboardingUser = !userProfile
    console.log('🔍 SEEKER-CHECKOUT: User profile status:', {
      userId: currentUser.clerkUser.id,
      hasProfile: !!userProfile,
      isOnboardingUser,
      email: currentUser.clerkUser.emailAddresses[0]?.emailAddress
    })

    let sessionId: string
    let sessionToken: string
    let expiresAt: Date

    if (isOnboardingUser) {
      // For onboarding users, find existing pending signup instead of creating new session
      console.log('🔍 SEEKER-CHECKOUT: Looking for existing pending signup for onboarding user')

      const existingPendingSignup = await db.pendingSignup.findFirst({
        where: {
          clerkUserId: currentUser.clerkUser.id,
          expiresAt: {
            gt: new Date() // Not expired
          }
        },
        orderBy: {
          createdAt: 'desc' // Get the most recent one
        }
      })

      if (!existingPendingSignup) {
        console.error('❌ SEEKER-CHECKOUT: No pending signup found for onboarding user')
        return NextResponse.json(
          { error: 'No pending signup found. Please restart the onboarding process.' },
          { status: 400 }
        )
      }

      console.log('✅ SEEKER-CHECKOUT: Found existing pending signup:', {
        id: existingPendingSignup.id,
        selectedPlan: existingPendingSignup.selectedPlan,
        email: existingPendingSignup.email
      })

      // Update the pending signup with the selected package if different
      if (existingPendingSignup.selectedPlan !== selectedPackage) {
        console.log('🔄 SEEKER-CHECKOUT: Updating pending signup with new package selection')
        await db.pendingSignup.update({
          where: { id: existingPendingSignup.id },
          data: { selectedPlan: selectedPackage }
        })
      }

      sessionId = existingPendingSignup.id
      sessionToken = existingPendingSignup.sessionToken
      expiresAt = existingPendingSignup.expiresAt
    } else {
      // For existing users, create a temporary checkout session
      console.log('🔍 SEEKER-CHECKOUT: Creating checkout session for existing user')

      const userName = currentUser.clerkUser.firstName && currentUser.clerkUser.lastName
        ? `${currentUser.clerkUser.firstName} ${currentUser.clerkUser.lastName}`
        : currentUser.clerkUser.firstName || ''

      const checkoutData = {
        userId: userProfile?.id || 'pending',
        clerkUserId: currentUser.clerkUser.id,
        selectedPlan: selectedPackage,
        upgradeType,
        currentPlan: userProfile?.jobSeeker?.membershipPlan || 'none',
        userEmail: userProfile?.email || currentUser.clerkUser.emailAddresses[0]?.emailAddress,
        userName: userProfile?.name || userName,
        isExistingUser: true
      }

      const session = await createCheckoutSession({
        userId: userProfile?.id || 'pending',
        checkoutData: checkoutData,
        selectedPlan: selectedPackage,
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/seeker/membership?checkout=success`,
        email: userProfile?.email || currentUser.clerkUser.emailAddresses[0]?.emailAddress || '',
        userType: 'seeker'
      })

      sessionId = session.id
      sessionToken = session.sessionToken
      expiresAt = session.expiresAt
    }

    // Use Authorize.net checkout - return checkout page URL with parameters
    const authorizeNetCheckoutUrl = new URL('/checkout/authnet', `${process.env.NEXT_PUBLIC_APP_URL}`)
    authorizeNetCheckoutUrl.searchParams.set('planId', selectedPackage)
    authorizeNetCheckoutUrl.searchParams.set('pendingSignupId', sessionId)
    authorizeNetCheckoutUrl.searchParams.set('sessionToken', sessionToken)
    authorizeNetCheckoutUrl.searchParams.set('returnUrl', `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/external-return`)

    const userName = currentUser.clerkUser.firstName && currentUser.clerkUser.lastName
      ? `${currentUser.clerkUser.firstName} ${currentUser.clerkUser.lastName}`
      : currentUser.clerkUser.firstName || ''

    const userInfo = {
      name: userProfile?.name || userName,
      email: userProfile?.email || currentUser.clerkUser.emailAddresses[0]?.emailAddress || '',
      firstName: userProfile?.name?.split(' ')[0] || currentUser.clerkUser.firstName || '',
      lastName: userProfile?.name?.split(' ').slice(1).join(' ') || currentUser.clerkUser.lastName || ''
    }
    authorizeNetCheckoutUrl.searchParams.set('userInfo', JSON.stringify(userInfo))

    const checkoutUrl = authorizeNetCheckoutUrl.toString()
    const paymentMethod = 'authorize-net'

    console.log('✅ SEEKER-CHECKOUT: Created Authorize.net subscription checkout session:', {
      sessionId,
      userId: currentUser.clerkUser.id,
      selectedPlan: selectedPackage,
      upgradeType,
      isOnboardingUser,
      checkoutUrl
    })

    return NextResponse.json({
      checkoutUrl,
      sessionId,
      expiresAt,
      paymentMethod
    })

  } catch (error) {
    console.error('Error creating subscription checkout:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
