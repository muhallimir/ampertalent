/**
 * Pending Signup - Latest
 * Returns the most recent pending signup for the current user
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Find the most recent pending signup for this user
        const pendingSignup = await db.pendingSignup.findFirst({
            where: { clerkUserId: userId },
            orderBy: { createdAt: 'desc' },
        })

        if (!pendingSignup) {
            return NextResponse.json(
                { pendingSignup: null, onboardingData: null },
                { status: 200 }
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
                pendingSignup,
                onboardingData,
            },
            { status: 200 }
        )
    } catch (error) {
        console.error('[Pending Signup Latest] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
