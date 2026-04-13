import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get all payment methods for this user
    const paymentMethods = await db.$queryRaw`
      SELECT 
        pm.*,
        up.email,
        up.clerk_user_id,
        js.membership_plan,
        js.is_on_trial,
        js.trial_ends_at,
        js.membership_expires_at
      FROM payment_methods pm
      JOIN user_profiles up ON (pm.seeker_id = up.id OR pm.employer_id = up.id)
      LEFT JOIN job_seekers js ON pm.seeker_id = js.user_id
      WHERE up.id = ${currentUser.profile.id}
      ORDER BY pm.created_at DESC
    `

    // Get subscription info
    const subscriptions = await db.subscription.findMany({
      where: {
        seekerId: currentUser.profile.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      debug: {
        userId: currentUser.profile.id,
        clerkUserId: currentUser.clerkUser.id,
        email: currentUser.profile.email,
        role: currentUser.profile.role,
        paymentMethods,
        subscriptions,
        paymentMethodCount: Array.isArray(paymentMethods) ? paymentMethods.length : 0,
        subscriptionCount: subscriptions.length
      }
    })

  } catch (error) {
    console.error('Debug payment methods error:', error)
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}