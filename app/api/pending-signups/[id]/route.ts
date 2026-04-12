import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: pendingSignupId } = await params

    // Fetch the pending signup record
    const pendingSignup = await db.pendingSignup.findUnique({
      where: { id: pendingSignupId }
    })

    if (!pendingSignup) {
      return NextResponse.json({ error: 'Pending signup not found' }, { status: 404 })
    }

    // Verify that the user can access this pending signup (either it's theirs or they're admin)
    const isOwner = pendingSignup.clerkUserId === currentUser.clerkUser.id
    const isAdmin = currentUser.profile.role === 'admin' || currentUser.profile.role === 'super_admin'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse onboarding data
    let onboardingData = {}
    let userType = 'seeker'

    try {
      onboardingData = JSON.parse(pendingSignup.onboardingData)
      userType = (onboardingData as any).userType || 'seeker'
    } catch (error) {
      console.error('Error parsing onboarding data:', error)
    }

    const enrichedPendingSignup = {
      ...pendingSignup,
      userType,
      onboardingData,
      isExpired: pendingSignup.expiresAt < new Date(),
      timeRemaining: pendingSignup.expiresAt.getTime() - Date.now()
    }

    return NextResponse.json({
      pendingSignup: enrichedPendingSignup
    })

  } catch (error) {
    console.error('Error fetching pending signup:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending signup' },
      { status: 500 }
    )
  }
}