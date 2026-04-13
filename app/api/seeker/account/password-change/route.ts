import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { clerkClient } from '@clerk/nextjs/server'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser) {
      console.log('Password change attempt: Unauthorized - no user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Password change API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    // Verify user is a job seeker or admin impersonating a seeker
    if (!currentUser.profile || (currentUser.profile.role !== 'seeker' && !(currentUser.isImpersonating && currentUser.profile.role === 'seeker'))) {
      console.log('🚫 SEEKER PASSWORD CHANGE: Access denied', {
        userId: currentUser.clerkUser.id,
        role: currentUser.profile?.role,
        isImpersonating: currentUser.isImpersonating,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { newPassword } = await request.json()

    // Validate input - currentPassword is optional for backend changes
    if (!newPassword) {
      console.log('Password change attempt: Missing new password', {
        userId: currentUser.clerkUser.id,
        hasNewPassword: !!newPassword
      })
      return NextResponse.json({ error: 'New password is required' }, { status: 400 })
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters long' }, { status: 400 })
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return NextResponse.json({
        error: 'New password must contain at least one uppercase letter, one lowercase letter, and one number'
      }, { status: 400 })
    }

    // For backend password changes, we don't enforce the "different from current" rule
    // since we can't verify the current password securely

    console.log('Processing password change request', {
      userId: currentUser.clerkUser.id,
      timestamp: new Date().toISOString()
    })

    try {
      // Use Clerk backend SDK to update password
      const clerk = await clerkClient()

      console.log('Updating password for user:', currentUser.clerkUser.id)

      // Update the user's password using Clerk backend SDK
      // Note: Clerk backend SDK doesn't verify current password - that's handled client-side
      // For backend password changes, we trust the authenticated request
      await clerk.users.updateUser(currentUser.clerkUser.id, {
        password: newPassword
      })

      console.log('Password change successful', {
        userId: currentUser?.clerkUser?.id,
        timestamp: new Date().toISOString()
      })

      return NextResponse.json({
        success: true,
        message: 'Password changed successfully'
      })

    } catch (clerkError: unknown) {
      console.error('Clerk password change error:', {
        userId: currentUser.clerkUser.id,
        error: clerkError instanceof Error ? clerkError.message : String(clerkError),
        errorName: clerkError instanceof Error ? clerkError.name : 'Unknown',
        errorStack: clerkError instanceof Error ? clerkError.stack : undefined,
        timestamp: new Date().toISOString()
      })

      // Handle specific Clerk errors
      if (clerkError instanceof Error) {
        const errorMessage = clerkError.message.toLowerCase()
        if (errorMessage.includes('invalid password') || errorMessage.includes('incorrect password') || errorMessage.includes('wrong password')) {
          return NextResponse.json({
            error: 'Current password is incorrect'
          }, { status: 400 })
        }

        if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
          return NextResponse.json({
            error: 'Too many password change attempts. Please wait before trying again.'
          }, { status: 429 })
        }

        if (errorMessage.includes('weak password') || errorMessage.includes('password strength')) {
          return NextResponse.json({
            error: 'New password does not meet security requirements'
          }, { status: 400 })
        }

        if (errorMessage.includes('same password') || errorMessage.includes('cannot be the same')) {
          return NextResponse.json({
            error: 'New password must be different from current password'
          }, { status: 400 })
        }
      }

      // Return the actual Clerk error message for debugging
      const errorMessage = clerkError instanceof Error ? clerkError.message : 'Failed to change password. Please try again.'
      return NextResponse.json({
        error: errorMessage
      }, { status: 500 })
    }

  } catch (error: unknown) {
    console.error('Password change endpoint error:', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}