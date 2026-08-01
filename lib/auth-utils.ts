import { clearAllClientState } from './auth-cleanup'

/**
 * Utility function to handle user logout
 *
 * Wipes every byte of app-owned client state (localStorage, sessionStorage,
 * non-Clerk cookies) BEFORE handing off to Clerk's `signOut`, which clears
 * Clerk's own session cookies and reloads the page.
 *
 * Critical: this also clears impersonation sessionStorage. If the admin clicks
 * "Sign Out" while still viewing an employer or seeker via impersonation,
 * otherwise the `admin_impersonation_session_{adminId}` key would resurface
 * the banner + role override on the next sign-in.
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

    // 1. Wipe localStorage, sessionStorage, and non-Clerk cookies.
    //    This includes demo markers, onboarding flags, PayPal pending state,
    //    exclusive-plan flags, and impersonation session — everything our
    //    app might have written to the browser.
    clearAllClientState()
    console.log('✅ AUTH: Cleared localStorage, sessionStorage, and app cookies')

    // 2. Clerk sign out with redirect — always go to marketing home.
    //    `signOut` clears Clerk's session cookies and triggers the redirect.
    const redirectUrl = options?.redirectUrl || '/'
    await signOut({ redirectUrl })

    console.log('✅ AUTH: User logged out successfully')
  } catch (error) {
    console.error('❌ AUTH: Error during logout:', error)

    // Call custom error handler if provided
    if (options?.onError) {
      options.onError(error)
    }

    // Force redirect to marketing home
    if (typeof window !== 'undefined') {
      window.location.href = options?.redirectUrl || '/'
    }
  }
}
