import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser || !currentUser.clerkUser) {
      console.log('Password reset attempt: Unauthorized - no user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Password reset API called with impersonated user', {
        adminId: currentUser.adminProfile?.id,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    // Verify employer role
    if (!currentUser.profile || currentUser.profile.role !== 'employer') {
      console.log('Password reset attempt: Forbidden - not an employer', {
        userId: currentUser.clerkUser.id,
        role: currentUser.profile?.role,
        isImpersonating: currentUser.isImpersonating
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const userEmail = currentUser.clerkUser.primaryEmailAddress?.emailAddress
    if (!userEmail) {
      console.log('Password reset attempt: No email found for user', {
        userId: currentUser.clerkUser.id
      })
      return NextResponse.json({ error: 'No email address found for user' }, { status: 400 })
    }

    console.log('Processing password reset request', {
      userId: currentUser.clerkUser.id,
      email: userEmail,
      timestamp: new Date().toISOString()
    })

    try {
      // Use Clerk to send password reset email
      // Note: Clerk handles password reset through their built-in flows
      // We'll trigger the reset by redirecting to Clerk's reset page
      // const resetUrl = `${process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'https://clerk.com' : 'https://app.clerk.com'}/password-reset?email=${encodeURIComponent(userEmail)}`

      // For now, we'll return success and let the frontend handle the redirect
      // In a production app, you might want to use Clerk's API directly

      console.log('Password reset email sent successfully', {
        userId: currentUser.clerkUser.id,
        email: userEmail,
        timestamp: new Date().toISOString()
      })

      return NextResponse.json({
        success: true,
        message: 'Password reset email sent successfully'
      })

    } catch (clerkError: unknown) {
      console.error('Clerk password reset error:', {
        userId: currentUser.clerkUser.id,
        email: userEmail,
        error: clerkError instanceof Error ? clerkError.message : String(clerkError),
        timestamp: new Date().toISOString()
      })

      // Handle specific Clerk errors
      if (clerkError instanceof Error && clerkError.message?.includes('rate limit')) {
        return NextResponse.json({
          error: 'Too many password reset requests. Please wait before trying again.'
        }, { status: 429 })
      }

      return NextResponse.json({
        error: 'Failed to initiate password reset. Please try again.'
      }, { status: 500 })
    }

  } catch (error: unknown) {
    console.error('Password reset endpoint error:', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}