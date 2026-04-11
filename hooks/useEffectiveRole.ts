'use client'

import { useUserProfile } from '@/hooks/useUserProfile'
import { useImpersonation } from '@/components/admin/ImpersonationContext'
import { UserRole } from '@/lib/auth'

/**
 * Hook that returns the effective user role for UI rendering.
 * When impersonating, returns the impersonated user's role.
 * Otherwise, returns the actual logged-in user's role.
 */
export function useEffectiveRole(): UserRole | null {
  const { profile } = useUserProfile()
  const { isImpersonating, impersonatedUser } = useImpersonation()

  // If impersonating, return the impersonated user's role
  if (isImpersonating && impersonatedUser) {
    return impersonatedUser.role
  }

  // Otherwise, return the actual user's role
  return (profile?.role as UserRole) || null
}

/**
 * Hook that returns detailed effective user context for UI rendering.
 * When impersonating, returns the impersonated user's context.
 * Otherwise, returns the actual logged-in user's context.
 */
export function useEffectiveUser() {
  const { profile } = useUserProfile()
  const { isImpersonating, impersonatedUser } = useImpersonation()

  if (isImpersonating && impersonatedUser) {
    return {
      role: impersonatedUser.role,
      name: impersonatedUser.name,
      email: impersonatedUser.email,
      isImpersonating: true,
      impersonatedUser,
      actualUser: {
        role: profile?.role as UserRole,
        name: profile?.name,
        email: profile?.email
      }
    }
  }

  return {
    role: profile?.role as UserRole,
    name: profile?.name,
    email: profile?.email,
    isImpersonating: false,
    impersonatedUser: null,
    actualUser: null
  }
}