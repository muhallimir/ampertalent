import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as any
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')
    const pendingSignupId = searchParams.get('pendingSignupId')

    console.log('🔄 STRIPE-SUCCESS: Received request:', {
      fullUrl: request.url,
      sessionId,
      pendingSignupId,
      allParams: Object.fromEntries(searchParams.entries())
    })

    if (!sessionId || !pendingSignupId) {
      console.error('Missing required parameters')
      return NextResponse.redirect(new URL('/sign-in?error=invalid_return', request.url))
    }

    // Verify the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (!session || session.payment_status !== 'paid') {
      console.error('Invalid or unpaid Stripe session')
      return NextResponse.redirect(new URL('/sign-in?error=payment_failed', request.url))
    }

    // Get the pending signup
    const pendingSignup = await db.pendingSignup.findUnique({
      where: { id: pendingSignupId }
    })

    if (!pendingSignup) {
      console.error('Pending signup not found')
      return NextResponse.redirect(new URL('/sign-in?error=session_expired', request.url))
    }

    // Check if user profile already exists (created by onboarding completion)
    const userProfile = await db.userProfile.findUnique({
      where: { clerkUserId: pendingSignup.clerkUserId }
    })

    if (userProfile) {
      // Payment processed - complete sign-in and redirect
      console.log('✅ STRIPE-SUCCESS: User profile found, completing sign-in')

      try {
        // Clean up pending signup
        await db.pendingSignup.delete({
          where: { id: pendingSignupId }
        }).catch(console.error)

        // Redirect to dashboard with welcome message
        const dashboardUrl = new URL('/seeker/dashboard', request.url)
        dashboardUrl.searchParams.set('welcome', 'true')
        if (pendingSignup.clerkUserId) {
          dashboardUrl.searchParams.set('auto_signin', pendingSignup.clerkUserId)
        }

        return NextResponse.redirect(dashboardUrl)
      } catch (signInError) {
        console.error('Error during redirect:', signInError)
      }

      // Fallback: redirect to dashboard
      const dashboardUrl = new URL('/seeker/dashboard', request.url)
      dashboardUrl.searchParams.set('welcome', 'true')

      return NextResponse.redirect(dashboardUrl)
    } else {
      // Profile not created yet - redirect to onboarding to complete the flow
      console.log('⏳ STRIPE-SUCCESS: Profile not found, redirecting to onboarding for completion')
      const onboardingUrl = new URL('/onboarding', request.url)
      onboardingUrl.searchParams.set('payment_status', 'success')
      onboardingUrl.searchParams.set('sessionId', sessionId)
      onboardingUrl.searchParams.set('pendingSignupId', pendingSignupId)

      return NextResponse.redirect(onboardingUrl)
    }

  } catch (error) {
    console.error('❌ Error handling Stripe success:', error)
    return NextResponse.redirect(new URL('/sign-in?error=processing_failed', request.url))
  }
}