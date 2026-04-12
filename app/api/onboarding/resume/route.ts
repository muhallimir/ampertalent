/**
 * Resume Onboarding Data Endpoint
 * Retrieves preserved onboarding data that was saved with a resume
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const resumeId = searchParams.get('id')
    const sessionToken = searchParams.get('token')

    if (!resumeId || !sessionToken) {
      return NextResponse.json(
        { error: 'Missing resume ID or session token' },
        { status: 400 }
      )
    }

    // Find the pending signup with matching resume info
    const pendingSignup = await db.pendingSignup.findFirst({
      where: {
        sessionToken,
        id: resumeId, // This might need adjustment based on your schema
      },
    })

    if (!pendingSignup) {
      return NextResponse.json(
        { error: 'Resume onboarding data not found or expired' },
        { status: 404 }
      )
    }

    // Parse the JSON onboarding data
    let onboardingData = null
    try {
      onboardingData = JSON.parse(pendingSignup.onboardingData)
    } catch (e) {
      console.warn('Failed to parse onboarding data:', e)
    }

    return NextResponse.json(
      {
        success: true,
        onboardingData,
        email: pendingSignup.email,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Resume Onboarding] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
