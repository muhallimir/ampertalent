import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { SEEKER_SUBSCRIPTION_PLANS } from '@/lib/subscription-plans'

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

    // Calculate base URL early for use in checkout URL construction
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http${request.headers.get('x-forwarded-proto') === 'https' ? 's' : ''}://${request.headers.get('host')}`

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
      // For existing users, use their user profile ID and a temporary expiration
      console.log('🔍 SEEKER-CHECKOUT: Using existing user profile for checkout session')
      sessionId = userProfile!.id
      sessionToken = 'existing-user-token'
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    }

    // Get plan details to fetch price
    const plan = SEEKER_SUBSCRIPTION_PLANS.find(p => p.id === selectedPackage)
    if (!plan) {
      return NextResponse.json(
        { error: `Plan not found: ${selectedPackage}` },
        { status: 400 }
      )
    }

    // Use PayPal checkout - return checkout page URL with parameters
    const paypalCheckoutUrl = new URL('/checkout/paypal', baseUrl)
    paypalCheckoutUrl.searchParams.set('planId', selectedPackage)
    paypalCheckoutUrl.searchParams.set('pendingSignupId', sessionId)
    paypalCheckoutUrl.searchParams.set('sessionToken', sessionToken)
    paypalCheckoutUrl.searchParams.set('returnUrl', `${baseUrl}/seeker/dashboard`)
    paypalCheckoutUrl.searchParams.set('userType', 'seeker')
    paypalCheckoutUrl.searchParams.set('totalPrice', plan.price.toString())
    // Pass flag for trial plans to show special messaging
    if (selectedPackage === 'trial') {
      paypalCheckoutUrl.searchParams.set('isTrial', 'true')
    }

    const userName = currentUser.clerkUser.firstName && currentUser.clerkUser.lastName
      ? `${currentUser.clerkUser.firstName} ${currentUser.clerkUser.lastName}`
      : currentUser.clerkUser.firstName || ''

    const userInfo = {
      name: userProfile?.name || userName,
      email: userProfile?.email || currentUser.clerkUser.emailAddresses[0]?.emailAddress || '',
      firstName: userProfile?.name?.split(' ')[0] || currentUser.clerkUser.firstName || '',
      lastName: userProfile?.name?.split(' ').slice(1).join(' ') || currentUser.clerkUser.lastName || ''
    }
    paypalCheckoutUrl.searchParams.set('userInfo', JSON.stringify(userInfo))

    const checkoutUrl = paypalCheckoutUrl.toString()
    const paymentMethod = 'paypal'

    console.log('✅ SEEKER-CHECKOUT: Created PayPal subscription checkout session:', {
      sessionId,
      userId: currentUser.clerkUser.id,
      selectedPlan: selectedPackage,
      planPrice: plan.price,
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
