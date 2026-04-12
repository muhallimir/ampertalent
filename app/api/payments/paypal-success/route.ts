import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const transactionId = searchParams.get('transaction_id')
        const pendingSignupId = searchParams.get('pendingSignupId')
        const paymentStatus = searchParams.get('payment_status')

        console.log('🔄 PAYPAL-SUCCESS: Received request:', {
            fullUrl: request.url,
            transactionId,
            pendingSignupId,
            paymentStatus,
            allParams: Object.fromEntries(searchParams.entries())
        })

        if (!transactionId || !pendingSignupId || paymentStatus !== 'success') {
            console.error('❌ PAYPAL-SUCCESS: Missing required parameters')
            return NextResponse.redirect(new URL('/sign-in?error=invalid_return', request.url))
        }

        // Get the pending signup
        const pendingSignup = await db.pendingSignup.findUnique({
            where: { id: pendingSignupId }
        })

        if (!pendingSignup) {
            console.error('❌ PAYPAL-SUCCESS: Pending signup not found')
            return NextResponse.redirect(new URL('/sign-in?error=session_expired', request.url))
        }

        // Check if user profile already exists (created by onboarding completion)
        const userProfile = await db.userProfile.findUnique({
            where: { clerkUserId: pendingSignup.clerkUserId }
        })

        if (userProfile) {
            // Payment processed - complete sign-in and redirect
            console.log('✅ PAYPAL-SUCCESS: User profile found, completing sign-in')

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
                console.error('❌ PAYPAL-SUCCESS: Error during redirect:', signInError)
            }

            // Fallback: redirect to dashboard
            const dashboardUrl = new URL('/seeker/dashboard', request.url)
            dashboardUrl.searchParams.set('welcome', 'true')

            return NextResponse.redirect(dashboardUrl)
        } else {
            // Profile not created yet - redirect to onboarding to complete the flow
            console.log('⏳ PAYPAL-SUCCESS: Profile not found, redirecting to onboarding for completion')
            const onboardingUrl = new URL('/onboarding', request.url)
            onboardingUrl.searchParams.set('payment_status', 'success')
            onboardingUrl.searchParams.set('sessionId', transactionId) // Use transaction ID as session identifier
            onboardingUrl.searchParams.set('pendingSignupId', pendingSignupId)

            return NextResponse.redirect(onboardingUrl)
        }

    } catch (error) {
        console.error('❌ Error handling PayPal success:', error)
        return NextResponse.redirect(new URL('/sign-in?error=processing_failed', request.url))
    }
}
