/**
 * Pending Signup - Create/Update
 * Saves onboarding data temporarily while the user is still in the process
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { email, ...onboardingData } = body

    // Find existing pending signup for this user
    const existing = await db.pendingSignup.findFirst({
      where: { clerkUserId: userId },
      orderBy: { createdAt: 'desc' },
    })

    // If exists, update it; otherwise create new
    let pendingSignup
    if (existing) {
      pendingSignup = await db.pendingSignup.update({
        where: { id: existing.id },
        data: {
          onboardingData: JSON.stringify(onboardingData),
          updatedAt: new Date(),
        },
      })
    } else {
      pendingSignup = await db.pendingSignup.create({
        data: {
          clerkUserId: userId,
          email: email || '',
          onboardingData: JSON.stringify(onboardingData),
          selectedPlan: onboardingData.selectedPackage || 'trial_monthly',
          sessionToken: `session_${userId}_${Date.now()}`,
          returnUrl: '/onboarding',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })
    }

    return NextResponse.json(
      { pendingSignup, success: true },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Pending Signup] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
