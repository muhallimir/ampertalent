import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // 1. AUTHENTICATION: Verify user is authenticated
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { planId, pendingSignupId, sessionToken, returnUrl, userInfo } = body

    // 2. INPUT VALIDATION: Validate required parameters
    if (!planId || !pendingSignupId || !sessionToken || !returnUrl) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // 3. AUTHORIZATION: Verify the pending signup belongs to the authenticated user
    const pendingSignup = await db.pendingSignup.findUnique({
      where: {
        id: pendingSignupId,
        sessionToken: sessionToken // Double verification
      }
    })

    if (!pendingSignup) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 403 }
      )
    }

    // 4. OWNERSHIP VERIFICATION: Ensure the pending signup belongs to the current user
    if (pendingSignup.clerkUserId !== currentUser.clerkUser.id) {
      return NextResponse.json(
        { error: 'Access denied - Invalid session ownership' },
        { status: 403 }
      )
    }

    // 5. SESSION EXPIRY CHECK: Verify session hasn't expired
    if (pendingSignup.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Session expired - Please restart the process' },
        { status: 410 }
      )
    }

    // 6. PLAN VALIDATION: Ensure the plan ID is valid
    const validPlanIds = [
      // Subscription plan IDs (from subscription-plans.ts)
      'trial', 'gold', 'vip-platinum', 'annual-platinum',
      // Mapped plan IDs (for backward compatibility)
      'trial_monthly', 'gold_bimonthly', 'vip_quarterly', 'annual_platinum',
      // Employer plan IDs
      'employer_basic', 'employer_standard', 'employer_premium'
    ]

    if (!validPlanIds.includes(planId)) {
      console.error('❌ SERVER-API: Invalid plan ID received:', planId)
      console.error('❌ SERVER-API: Valid plan IDs are:', validPlanIds)
      return NextResponse.json(
        { error: 'Invalid plan ID' },
        { status: 400 }
      )
    }

    // 7. RETURN URL VALIDATION: Ensure return URL is from our domain
    const allowedDomains = [
      process.env.NEXT_PUBLIC_APP_URL,
      'http://localhost:3000',
      'https://app.ampertalent.com'
    ].filter(Boolean)

    const isValidReturnUrl = allowedDomains.some(domain =>
      returnUrl.startsWith(domain)
    )

    if (!isValidReturnUrl) {
      return NextResponse.json(
        { error: 'Invalid return URL' },
        { status: 400 }
      )
    }

    // 8. RATE LIMITING: Prevent abuse (simple implementation)
    const recentRequests = await db.pendingSignup.count({
      where: {
        clerkUserId: currentUser.clerkUser.id,
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        }
      }
    })

    if (recentRequests > 10) {
      return NextResponse.json(
        { error: 'Too many requests - Please wait before trying again' },
        { status: 429 }
      )
    }

    // 9. Use Stripe checkout - return checkout page URL with parameters
    const stripeCheckoutUrl = new URL('/api/payments/stripe-checkout', request.url)
    // Pass through the parameters to the Stripe checkout API
    stripeCheckoutUrl.searchParams.set('planId', planId)
    stripeCheckoutUrl.searchParams.set('pendingSignupId', pendingSignupId)
    stripeCheckoutUrl.searchParams.set('sessionToken', sessionToken)
    stripeCheckoutUrl.searchParams.set('returnUrl', returnUrl)

    if (userInfo) {
      stripeCheckoutUrl.searchParams.set('userInfo', JSON.stringify(userInfo))
    }

    console.log('✅ SERVER-API: Generated Stripe checkout URL:', stripeCheckoutUrl.toString())

    // 10. AUDIT LOG: Log the checkout URL generation for security monitoring
    console.log('Stripe checkout URL generated:', {
      userId: currentUser.clerkUser.id,
      planId,
      pendingSignupId,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    })

    return NextResponse.json({
      checkoutUrl: stripeCheckoutUrl.toString(),
      paymentMethod: 'stripe'
    })

  } catch (error) {
    console.error('Error generating checkout URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate checkout URL' },
      { status: 500 }
    )
  }
}