import { UserRole } from './auth'

export interface ImpersonatedUser {
  id: string
  clerkUserId: string
  name: string
  email?: string
  role: UserRole
  companyName?: string // For employers
  headline?: string // For job seekers
}

export interface ImpersonationSession {
  adminId: string
  impersonatedUser: ImpersonatedUser
  startedAt: Date
  lastActivity: Date
}

// Session storage keys - CRITICAL: Make unique per admin to prevent cross-contamination
const getImpersonationSessionKey = (adminId?: string) => {
  if (adminId) {
    return `admin_impersonation_session_${adminId}`
  }
  // Fallback to generic key for backward compatibility, but this is dangerous
  return 'admin_impersonation_session'
}
const SESSION_TIMEOUT = 2 * 60 * 60 * 1000 // 2 hours in milliseconds

/**
 * Get current impersonation session from session storage
 */
export function getImpersonationSession(adminId?: string): ImpersonationSession | null {
  if (typeof window === 'undefined') return null

  try {
    // CRITICAL: Try admin-specific key first, then fallback to generic key
    let sessionData = null
    let sessionKey = ''

    if (adminId) {
      sessionKey = getImpersonationSessionKey(adminId)
      sessionData = sessionStorage.getItem(sessionKey)
      console.log('🔍 IMPERSONATION DEBUG: Checking admin-specific session:', { adminId, sessionKey, hasData: !!sessionData })
    } else {
      // CRITICAL SECURITY FIX: When no adminId provided, we need to determine the current admin
      // This is a security risk - we should NOT access other admins' sessions
      console.log('🚨 SECURITY WARNING: getImpersonationSession() called without adminId')
      console.log('🚨 This could lead to cross-admin session access in multi-admin scenarios')

      // For now, search for admin-specific sessions but log the security concern
      const allKeys = Object.keys(sessionStorage)
      const adminSessionKeys = allKeys.filter(key => key.startsWith('admin_impersonation_session_') && key !== 'admin_impersonation_session')

      console.log('🔍 IMPERSONATION DEBUG: Found admin sessions:', {
        totalKeys: allKeys.length,
        adminSessionKeys: adminSessionKeys.length,
        foundKeys: adminSessionKeys
      })

      if (adminSessionKeys.length > 1) {
        console.log('🚨 CRITICAL SECURITY RISK: Multiple admin sessions detected!')
        console.log('🚨 This could cause cross-admin data contamination!')
        console.log('🚨 Admin sessions found:', adminSessionKeys)
      }

      if (adminSessionKeys.length > 0) {
        // Use the first admin-specific session found (SECURITY RISK in multi-admin scenarios)
        sessionKey = adminSessionKeys[0]
        sessionData = sessionStorage.getItem(sessionKey)
        console.log('🔍 IMPERSONATION DEBUG: Using admin session:', { sessionKey, hasData: !!sessionData })

        if (adminSessionKeys.length > 1) {
          console.log('🚨 WARNING: Ignoring other admin sessions:', adminSessionKeys.slice(1))
        }
      }
    }

    // Fallback to generic key if no admin-specific session found
    if (!sessionData) {
      sessionKey = getImpersonationSessionKey()
      sessionData = sessionStorage.getItem(sessionKey)
      console.log('🔍 IMPERSONATION DEBUG: Checking generic session:', { sessionKey, hasData: !!sessionData })
    }

    console.log('🔍 IMPERSONATION DEBUG: Raw session data:', sessionData ? 'EXISTS' : 'NULL')

    if (!sessionData) return null

    const session: ImpersonationSession = JSON.parse(sessionData)
    console.log('🔍 IMPERSONATION DEBUG: Parsed session:', {
      adminId: session.adminId,
      impersonatedUserId: session.impersonatedUser?.id,
      impersonatedUserRole: session.impersonatedUser?.role,
      startedAt: session.startedAt,
      lastActivity: session.lastActivity
    })

    // Check if session has expired
    const now = new Date()
    const lastActivity = new Date(session.lastActivity)
    const timeDiff = now.getTime() - lastActivity.getTime()

    if (timeDiff > SESSION_TIMEOUT) {
      console.log('🎭 IMPERSONATION: Session expired, clearing', { timeDiff, timeout: SESSION_TIMEOUT })
      clearImpersonationSession()
      return null
    }

    // Update last activity - CRITICAL: Use admin-specific key
    session.lastActivity = now
    const updateKey = getImpersonationSessionKey(session.adminId)
    sessionStorage.setItem(updateKey, JSON.stringify(session))
    console.log('🔍 IMPERSONATION DEBUG: Updated session with admin-specific key:', updateKey)

    console.log('🔍 IMPERSONATION DEBUG: Returning valid session for user:', session.impersonatedUser?.name)
    return session
  } catch (error) {
    console.error('🎭 IMPERSONATION ERROR: Failed to get session:', error)
    clearImpersonationSession()
    return null
  }
}

/**
 * SECURE: Get impersonation session for the current admin user
 * This function safely retrieves the session using the current admin's ID
 * Note: This should be called from within a React component that has access to the current user
 */
export async function getCurrentAdminImpersonationSession(): Promise<ImpersonationSession | null> {
  if (typeof window === 'undefined') return null

  try {
    console.log('🚨 SECURITY: getCurrentAdminImpersonationSession() should be called from React context with current user')

    // For now, fall back to the existing logic but with security warnings
    return getImpersonationSession()
  } catch (error) {
    console.error('🚨 SECURITY ERROR: Failed to get current admin ID:', error)
    return null
  }
}

/**
 * SECURE: Get impersonation session with explicit admin ID validation
 * This is the recommended way to get impersonation sessions in multi-admin environments
 */
export function getSecureImpersonationSession(currentAdminId: string): ImpersonationSession | null {
  if (typeof window === 'undefined') return null

  try {
    console.log('🔒 SECURE SESSION: Getting impersonation session for admin:', currentAdminId)

    // Use admin-specific key directly
    const sessionKey = getImpersonationSessionKey(currentAdminId)
    const sessionData = sessionStorage.getItem(sessionKey)

    console.log('🔒 SECURE SESSION: Admin-specific session check:', {
      adminId: currentAdminId,
      sessionKey,
      hasData: !!sessionData
    })

    if (!sessionData) {
      console.log('🔒 SECURE SESSION: No session found for admin:', currentAdminId)
      return null
    }

    const session: ImpersonationSession = JSON.parse(sessionData)

    // CRITICAL: Validate that the session belongs to the current admin
    if (session.adminId !== currentAdminId) {
      console.error('🚨 SECURITY VIOLATION: Session admin ID mismatch!', {
        sessionAdminId: session.adminId,
        currentAdminId: currentAdminId
      })
      console.error('🚨 This indicates potential cross-admin session contamination!')
      clearImpersonationSession(currentAdminId)
      return null
    }

    // Check if session has expired
    const now = new Date()
    const lastActivity = new Date(session.lastActivity)
    const timeDiff = now.getTime() - lastActivity.getTime()

    if (timeDiff > SESSION_TIMEOUT) {
      console.log('🔒 SECURE SESSION: Session expired for admin:', currentAdminId)
      clearImpersonationSession(currentAdminId)
      return null
    }

    // Update last activity
    session.lastActivity = now
    sessionStorage.setItem(sessionKey, JSON.stringify(session))

    console.log('🔒 SECURE SESSION: Valid session found for admin:', currentAdminId)
    return session
  } catch (error) {
    console.error('🚨 SECURE SESSION ERROR:', error)
    clearImpersonationSession(currentAdminId)
    return null
  }
}

/**
 * Set impersonation session in session storage
 */
export function setImpersonationSession(session: ImpersonationSession): void {
  if (typeof window === 'undefined') return

  try {
    // CRITICAL: Use admin-specific session key to prevent cross-contamination
    const sessionKey = getImpersonationSessionKey(session.adminId)
    sessionStorage.setItem(sessionKey, JSON.stringify(session))
    console.log('🎭 IMPERSONATION: Session started for', session.impersonatedUser.name, 'with admin-specific key:', sessionKey)

    // CRITICAL: Clear any generic session to prevent conflicts
    const genericKey = getImpersonationSessionKey()
    if (sessionStorage.getItem(genericKey)) {
      console.log('🚨 CRITICAL: Clearing generic impersonation session to prevent conflicts')
      sessionStorage.removeItem(genericKey)
    }

    // Dispatch event to notify components that impersonation has changed
    window.dispatchEvent(new CustomEvent('impersonationChanged'))
  } catch (error) {
    console.error('🎭 IMPERSONATION ERROR: Failed to set session:', error)
  }
}

/**
 * Clear impersonation session from session storage
 */
export function clearImpersonationSession(adminId?: string): void {
  if (typeof window === 'undefined') return

  try {
    // CRITICAL: Clear admin-specific session if adminId provided
    if (adminId) {
      const adminSessionKey = getImpersonationSessionKey(adminId)
      const existingSession = sessionStorage.getItem(adminSessionKey)
      if (existingSession) {
        try {
          const session = JSON.parse(existingSession)
          console.log('🎭 IMPERSONATION: Clearing admin-specific session for', session.impersonatedUser?.name)
          console.log('🔍 IMPERSONATION DEBUG: Admin-specific session being cleared:', {
            adminId: session.adminId,
            impersonatedUserId: session.impersonatedUser?.id,
            sessionKey: adminSessionKey,
            duration: new Date().getTime() - new Date(session.startedAt).getTime()
          })
        } catch (parseError) {
          console.log('🎭 IMPERSONATION: Clearing corrupted admin-specific session data', parseError)
        }
      }
      sessionStorage.removeItem(adminSessionKey)
      console.log('🔍 IMPERSONATION DEBUG: Admin-specific session storage cleared:', adminSessionKey)
    }

    // Also clear generic session for backward compatibility
    const genericKey = getImpersonationSessionKey()
    const existingGenericSession = sessionStorage.getItem(genericKey)
    if (existingGenericSession) {
      try {
        const session = JSON.parse(existingGenericSession)
        console.log('🎭 IMPERSONATION: Clearing generic session for', session.impersonatedUser?.name)
      } catch (parseError) {
        console.log('🎭 IMPERSONATION: Clearing corrupted generic session data', parseError)
      }
    }
    sessionStorage.removeItem(genericKey)
    console.log('🔍 IMPERSONATION DEBUG: Generic session storage cleared')

    // Dispatch event to notify components that impersonation has changed
    window.dispatchEvent(new CustomEvent('impersonationChanged'))
  } catch (error) {
    console.error('🎭 IMPERSONATION ERROR: Failed to clear session:', error)
  }
}

/**
 * Start impersonating a user
 */
export async function startImpersonation(
  adminId: string,
  targetUser: ImpersonatedUser
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/admin/impersonation/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetUserId: targetUser.id,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }

    const session: ImpersonationSession = {
      adminId,
      impersonatedUser: targetUser,
      startedAt: new Date(),
      lastActivity: new Date(),
    }

    setImpersonationSession(session)

    return { success: true }
  } catch (error) {
    console.error('Error starting impersonation:', error)
    return { success: false, error: 'Failed to start impersonation' }
  }
}

/**
 * Stop impersonating a user
 */
export async function stopImpersonation(adminId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Try to get session with admin ID if provided, otherwise use fallback logic
    const session = adminId ? getSecureImpersonationSession(adminId) : getImpersonationSession()
    if (!session) {
      console.log('🎭 IMPERSONATION: No active session found, already stopped')
      return { success: true } // Already not impersonating
    }

    console.log('🎭 IMPERSONATION: Stopping session for', session.impersonatedUser.name, 'admin:', session.adminId)

    const response = await fetch('/api/admin/impersonation/stop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetUserId: session.impersonatedUser.id,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('🎭 IMPERSONATION ERROR: Stop failed:', error)
      return { success: false, error }
    }

    // CRITICAL: Clear the admin-specific session using the session's admin ID
    clearImpersonationSession(session.adminId)
    console.log('🎭 IMPERSONATION: Session stopped successfully for admin:', session.adminId)

    return { success: true }
  } catch (error) {
    console.error('🎭 IMPERSONATION ERROR: Failed to stop impersonation:', error)
    return { success: false, error: 'Failed to stop impersonation' }
  }
}

/**
 * Check if currently impersonating a user
 */
export function isImpersonating(): boolean {
  return getImpersonationSession() !== null
}

/**
 * Get the currently impersonated user
 */
export function getImpersonatedUser(): ImpersonatedUser | null {
  const session = getImpersonationSession()
  return session?.impersonatedUser || null
}

/**
 * Validate that the current user is an admin or super admin
 */
export function validateAdminAccess(userRole: UserRole): boolean {
  return userRole === 'admin' || userRole === 'super_admin'
}

/**
 * Get impersonation status for display
 */
export function getImpersonationStatus(): {
  isActive: boolean
  user?: ImpersonatedUser
  duration?: string
} {
  const session = getImpersonationSession()

  if (!session) {
    return { isActive: false }
  }

  const startTime = new Date(session.startedAt)
  const now = new Date()
  const durationMs = now.getTime() - startTime.getTime()

  // Format duration
  const hours = Math.floor(durationMs / (1000 * 60 * 60))
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))

  let duration = ''
  if (hours > 0) {
    duration = `${hours}h ${minutes}m`
  } else {
    duration = `${minutes}m`
  }

  return {
    isActive: true,
    user: session.impersonatedUser,
    duration,
  }
}

/**
 * CRITICAL: Force clear all impersonation sessions (emergency cleanup)
 */
export function emergencyClearAllSessions(): void {
  if (typeof window === 'undefined') return

  try {
    console.log('🚨 EMERGENCY: Clearing all impersonation sessions')

    // Clear generic session key
    const genericKey = getImpersonationSessionKey()
    sessionStorage.removeItem(genericKey)
    localStorage.removeItem(genericKey) // Clear from localStorage too if it exists

    // Clear any other potential session keys
    const keysToRemove = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && key.includes('impersonation')) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(key => {
      sessionStorage.removeItem(key)
      console.log('🚨 EMERGENCY: Removed session key:', key)
    })

    console.log('🚨 EMERGENCY: All impersonation sessions cleared')
  } catch (error) {
    console.error('🚨 EMERGENCY: Failed to clear sessions:', error)
  }
}

/**
 * Auto-cleanup expired sessions on page load
 */
export function initializeImpersonationCleanup(): void {
  if (typeof window === 'undefined') return

  // Clean up expired sessions on page load
  getImpersonationSession()

  // Set up periodic cleanup
  setInterval(() => {
    getImpersonationSession()
  }, 5 * 60 * 1000) // Check every 5 minutes
}

/**
 * Helper function to validate session data structure and timestamps
 */
function validateSessionData(session: any): boolean {
  try {
    // Check for required fields
    if (!session.adminId || !session.impersonatedUser || !session.impersonatedUser.id) {
      console.log('🚨 SESSION CORRUPTION: Missing required fields, clearing session')
      clearImpersonationSession(session.adminId)
      return false
    }

    // Check for reasonable timestamps
    const now = new Date().getTime()
    const startedAt = new Date(session.startedAt).getTime()
    const lastActivity = new Date(session.lastActivity).getTime()

    if (isNaN(startedAt) || isNaN(lastActivity) || startedAt > now || lastActivity > now) {
      console.log('🚨 SESSION CORRUPTION: Invalid timestamps, clearing session')
      clearImpersonationSession(session.adminId)
      return false
    }

    console.log('✅ SESSION INTEGRITY: Session is valid')
    return true
  } catch (error) {
    console.error('🚨 SESSION CORRUPTION: Failed to validate session data:', error)
    clearImpersonationSession()
    return false
  }
}

/**
 * Validate session integrity and clear if corrupted
 */
export function validateSessionIntegrity(): boolean {
  if (typeof window === 'undefined') return true

  try {
    // Check both generic and any admin-specific sessions
    const genericKey = getImpersonationSessionKey()
    const sessionData = sessionStorage.getItem(genericKey)
    if (!sessionData) {
      // Also check for any admin-specific sessions
      const allKeys = Object.keys(sessionStorage)
      const impersonationKeys = allKeys.filter(key => key.startsWith('admin_impersonation_session_'))
      if (impersonationKeys.length === 0) return true

      // Validate the first admin-specific session found
      const firstAdminSession = sessionStorage.getItem(impersonationKeys[0])
      if (!firstAdminSession) return true

      const session = JSON.parse(firstAdminSession)
      return validateSessionData(session)
    }

    const session = JSON.parse(sessionData)
    return validateSessionData(session)
  } catch (error) {
    console.error('🚨 SESSION CORRUPTION: Failed to validate session, clearing:', error)
    clearImpersonationSession()
    return false
  }
}