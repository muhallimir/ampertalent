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
    const { packageId, pendingJobId, sessionToken, returnUrl, userInfo, addOnIds, totalPrice } = body

    // 2. INPUT VALIDATION: Validate required parameters
    if (!packageId || !pendingJobId || !sessionToken || !returnUrl) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // 3. AUTHORIZATION: Verify the pending job post belongs to the authenticated user
    const pendingJobPost = await db.pendingJobPost.findUnique({
      where: {
        id: pendingJobId,
        sessionToken: sessionToken // Double verification
      }
    })

    if (!pendingJobPost) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 403 }
      )
    }

    // 4. OWNERSHIP VERIFICATION: Ensure the pending job post belongs to the current user
    if (pendingJobPost.clerkUserId !== currentUser.clerkUser.id) {
      return NextResponse.json(
        { error: 'Access denied - Invalid session ownership' },
        { status: 403 }
      )
    }

    // 5. SESSION EXPIRY CHECK: Verify session hasn't expired
    if (pendingJobPost.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Session expired - Please restart the process' },
        { status: 410 }
      )
    }

    // 6. PACKAGE VALIDATION: Ensure the package ID is valid
    const validPackageIds = [
      // Job posting packages
      'standard', 'featured', 'email_blast', 'gold_plus',
      // Concierge packages
      'concierge_lite', 'concierge_level_1', 'concierge_level_2', 'concierge_level_3',
      // Legacy employer packages (for backward compatibility)
      'employer_basic', 'employer_standard', 'employer_premium',
      'starter', 'professional', 'enterprise'
    ]

    if (!validPackageIds.includes(packageId)) {
      console.error('❌ SERVER-API: Invalid package ID received:', packageId)
      console.error('❌ SERVER-API: Valid package IDs are:', validPackageIds)
      return NextResponse.json(
        { error: 'Invalid package ID' },
        { status: 400 }
      )
    }

    // 7. RETURN URL VALIDATION: Ensure return URL is from our domain
    const allowedDomains = [
      process.env.NEXT_PUBLIC_APP_URL,
      'http://localhost:3000',
      'https://localhost:3000',
      'https://app.hiremymom.com'
    ].filter(Boolean)

    const isValidReturnUrl = allowedDomains.some(domain =>
      returnUrl.startsWith(domain)
    )

    if (!isValidReturnUrl) {
      return NextResponse.json(
        { error: 'Invalid return URL' + returnUrl },
        { status: 400 }
      )
    }

    // 8. RATE LIMITING: Prevent abuse (simple implementation)
    const recentRequests = await db.pendingJobPost.count({
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

    // 9. Map employer package IDs to plan IDs
    const planIdMapping: { [key: string]: string } = {
      // Job posting packages (matching PackageCard.tsx)
      'standard': 'standard',
      'featured': 'featured',
      'email_blast': 'email_blast',
      'gold_plus': 'gold_plus',

      // Concierge packages (matching PackageCard.tsx)
      'concierge_lite': 'concierge_lite',
      'concierge_level_1': 'concierge_level_1',
      'concierge_level_2': 'concierge_level_2',
      'concierge_level_3': 'concierge_level_3',

      // Legacy employer packages (for backward compatibility)
      'employer_basic': 'standard',
      'employer_standard': 'featured',
      'employer_premium': 'concierge_lite',
      'starter': 'standard',
      'professional': 'featured',
      'enterprise': 'concierge_lite'
    }

    const planId = planIdMapping[packageId] || 'standard'

    // ✅ CRITICAL: Update the pending job post with the selected package and add-ons
    // This ensures the abandoned cart system can track which package and add-ons were selected
    console.log('📝 EMPLOYER-CHECKOUT: Updating pending job post with selected package:', packageId)
    console.log('📝 EMPLOYER-CHECKOUT: Selected add-ons:', addOnIds || [])

    try {
      await db.pendingJobPost.update({
        where: { id: pendingJobId },
        data: {
          selectedPackage: packageId,
          // Store add-ons in metadata if needed (check schema for field availability)
          // For now, we'll just pass them through to checkout
        }
      })
      console.log('✅ EMPLOYER-CHECKOUT: Successfully updated pending job post with package:', packageId)
    } catch (updateError) {
      console.error('❌ EMPLOYER-CHECKOUT: Failed to update pending job post:', updateError)
      // Don't fail the checkout if update fails, but log it for monitoring
    }

    // Use Stripe/PayPal checkout - redirect to employer checkout page
    const checkoutUrl = new URL('/checkout/employer', request.url)
    checkoutUrl.searchParams.set('planId', planId)
    checkoutUrl.searchParams.set('pendingJobPostId', pendingJobId)
    checkoutUrl.searchParams.set('sessionToken', sessionToken)
    checkoutUrl.searchParams.set('returnUrl', returnUrl)

    // Add totalPrice if provided
    if (totalPrice) {
      checkoutUrl.searchParams.set('totalPrice', totalPrice.toString())
      console.log('📝 EMPLOYER-CHECKOUT: Using custom total price:', totalPrice)
    }

    // Add selected add-ons to checkout URL
    if (addOnIds && addOnIds.length > 0) {
      checkoutUrl.searchParams.set('addOnIds', JSON.stringify(addOnIds))
      console.log('📝 EMPLOYER-CHECKOUT: Including add-ons in checkout URL:', addOnIds)
    }

    if (userInfo) {
      checkoutUrl.searchParams.set('userInfo', JSON.stringify(userInfo))
    }

    console.log('✅ EMPLOYER-CHECKOUT: Generated Stripe/PayPal checkout URL:', checkoutUrl.toString())

    // 10. AUDIT LOG: Log the checkout URL generation for security monitoring
    console.log('Employer checkout URL generated:', {
      userId: currentUser.clerkUser.id,
      packageId,
      pendingJobId,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    })

    return NextResponse.json({
      checkoutUrl: checkoutUrl.toString(),
      paymentMethod: 'stripe'
    })

  } catch (error) {
    console.error('Error generating employer checkout URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate checkout URL' },
      { status: 500 }
    )
  }
}