import { NextResponse } from 'next/server'
import { getCurrentUser } from './auth'
import type { UserRole } from './auth'

/**
 * Helper to check super_admin auth in API routes
 * Returns user profile if authorized, or error response if not
 */
export async function checkSuperAdminAuth() {
    const user = await getCurrentUser()

    if (!user) {
        return {
            error: NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }
    }

    if (!user.profile) {
        return {
            error: NextResponse.json(
                { error: 'Profile not found' },
                { status: 404 }
            )
        }
    }

    if (user.profile.role !== 'super_admin') {
        return {
            error: NextResponse.json(
                { error: 'Forbidden - Super admin access required' },
                { status: 403 }
            )
        }
    }

    return {
        user: user.profile,
        clerkUserId: user.clerkUser?.id || user.profile.clerkUserId
    }
}

/**
 * Get super admin name for change log
 */
export function getSuperAdminName(user: any): string {
    const firstName = user.firstName || ''
    const lastName = user.lastName || ''
    const fullName = `${firstName} ${lastName}`.trim()
    return fullName || user.name || user.email || 'Unknown'
}
