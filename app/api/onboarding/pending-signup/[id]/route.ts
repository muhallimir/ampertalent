/**
 * Pending Signup - By ID
 * Returns a specific pending signup by ID (for payment flow completion)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = await auth()
        const pendingSignupId = params.id

        if (!pendingSignupId) {
            return NextResponse.json(
                { error: 'Pending signup ID required' },
                { status: 400 }
            )
        }

        // Find the pending signup by ID
        const pendingSignup = await db.pendingSignup.findUnique({
            where: { id: pendingSignupId }
        })

        if (!pendingSignup) {
            return NextResponse.json(
                { error: 'Pending signup not found' },
                { status: 404 }
            )
        }

        // Security check: Only allow access if:
        // 1. User is authenticated and this is their pending signup, OR
        // 2. This is being accessed as part of a payment flow (we'll be more permissive for now)
        // TODO: Add more strict security checks for production
        if (userId && pendingSignup.clerkUserId !== userId) {
            console.warn('⚠️ SECURITY: User attempted to access pending signup that doesn\'t belong to them')
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
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
        console.error('[Pending Signup By ID] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}