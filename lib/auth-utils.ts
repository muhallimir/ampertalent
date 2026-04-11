import { clearMarketingPreselect } from './marketing-preselect'

/**
 * Utility function to handle user logout
 * Clears localStorage, cookies, and signs out from Clerk with redirect
 */
export async function handleUserLogout(
  signOut: (options?: { redirectUrl?: string }) => Promise<void>,
  options?: {
    redirectUrl?: string
    onError?: (error: unknown) => void
  }
): Promise<void> {
  try {
    console.log('🔓 AUTH: Logging out user')

    // Clear local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('onboardingCompleted')
      localStorage.removeItem('userRole')
      localStorage.removeItem('onboardingData')
      // Clear service-only onboarding redirect to prevent affecting next user
      localStorage.removeItem('hmm_post_onboarding_service')
      console.log('✅ AUTH: Cleared localStorage')

      // Clear marketing preselection cookie to prevent affecting next user
      clearMarketingPreselect()
      console.log('✅ AUTH: Cleared hmm_preselect cookie')
    }

    // Clerk sign out with redirect
    const redirectUrl = options?.redirectUrl || '/sign-in'
    await signOut({ redirectUrl })

    console.log('✅ AUTH: User logged out successfully')
  } catch (error) {
    console.error('❌ AUTH: Error during logout:', error)

    // Call custom error handler if provided
    if (options?.onError) {
      options.onError(error)
    }

    // Force redirect to sign-in page
    if (typeof window !== 'undefined') {
      window.location.href = options?.redirectUrl || '/sign-in'
    }
  }
}
