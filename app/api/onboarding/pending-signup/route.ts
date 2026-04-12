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
    })

    // Create or update pending signup
    const pendingSignup = await db.pendingSignup.upsert({
      where: { id: existing?.id || 'new-' + Date.now() },
      update: {
        onboardingData: JSON.stringify(onboardingData),
        updatedAt: new Date(),
      },
      create: {
        clerkUserId: userId,
        email: email || '',
        onboardingData: JSON.stringify(onboardingData),
        selectedPlan: onboardingData.selectedPackage || '',
        sessionToken: 'temp-' + Date.now(),
        returnUrl: '',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

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
