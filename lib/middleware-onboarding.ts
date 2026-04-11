import { NextRequest } from 'next/server'

interface OnboardingStatus {
  completed: boolean
  role: string | null
}

/**
 * Check onboarding status for middleware use
 * This is a lightweight version that avoids heavy database calls in middleware
 */
export async function checkOnboardingStatusForMiddleware(
  request: NextRequest,
  userId: string
): Promise<OnboardingStatus | null> {
  try {
    // Create internal API call to check onboarding status
    const baseUrl = request.nextUrl.origin
    const response = await fetch(`${baseUrl}/api/onboarding/status`, {
      headers: {
        'Cookie': request.headers.get('cookie') || '',
        'User-Agent': request.headers.get('user-agent') || '',
        // Add internal header to identify middleware requests
        'X-Middleware-Request': 'true'
      },
      // Use a shorter timeout for middleware to avoid blocking
      signal: AbortSignal.timeout(3000)
    })

    if (!response.ok) {
      console.warn(`Middleware onboarding check failed: ${response.status}`)
      return null
    }

    const data = await response.json()
    return {
      completed: data.completed || false,
      role: data.role || null
    }
  } catch (error) {
    console.error('Middleware onboarding check error:', error)
    // Return null to allow fallback to client-side logic
    return null
  }
}

/**
 * Get dashboard path based on user role
 */
export function getDashboardPath(role: string): string {
  switch (role) {
    case 'employer':
      return '/employer/dashboard'
    case 'admin':
    case 'super_admin':
      return '/admin/dashboard'
    case 'team_member':
      // For team members, we should get their company-specific dashboard
      // But in this context, we don't have access to company info
      // So we return a generic path and let middleware handle the redirect
      return '/employer/team'
    case 'seeker':
    default:
      return '/seeker/dashboard'
  }
}
