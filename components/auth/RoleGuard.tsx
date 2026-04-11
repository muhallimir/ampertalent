'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { getImpersonatedUser, isImpersonating, validateSessionIntegrity } from '@/lib/admin-impersonation'

// Routes that bypass RoleGuard checks (for onboarding payment flows)
const BYPASS_ROUTES = [
  '/seeker/subscription/paypal-return',
  '/seeker/subscription/paypal-cancel',
]

interface RoleGuardProps {
  allowedRoles: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    async function checkAccess() {
      // Wait for Clerk to load
      if (!isLoaded) {
        return
      }

      // Check if current route should bypass RoleGuard
      // This is needed for PayPal return pages during onboarding
      // where the user has no profile yet but needs to complete payment
      const shouldBypass = BYPASS_ROUTES.some(route => pathname?.startsWith(route))
      if (shouldBypass && user) {
        console.log('🔓 ROLE GUARD: Bypassing role check for payment callback route:', pathname)
        setHasAccess(true)
        setIsLoading(false)
        return
      }

      if (!user) {
        console.log('🔍 ROLE GUARD DEBUG: No user, redirecting to sign-in')
        router.push('/sign-in')
        return
      }

      console.log('🔍 ROLE GUARD DEBUG: Starting access check for user:', user.id)
      console.log('🔍 ROLE GUARD DEBUG: Allowed roles:', allowedRoles)

      // CRITICAL: Validate session integrity first
      const sessionValid = validateSessionIntegrity()
      if (!sessionValid) {
        console.log('🚨 ROLE GUARD: Session integrity check failed, continuing without impersonation')
      }

      try {
        // Get user's actual role from the database first
        const response = await fetch('/api/auth/user-role')
        if (!response.ok) {
          throw new Error('Failed to fetch user role')
        }

        const { role: actualRole } = await response.json()
        console.log('👤 ROLE GUARD: Actual user role:', actualRole)

        // Check impersonation state
        const impersonating = isImpersonating()
        const impersonatedUser = getImpersonatedUser()
        console.log('🔍 ROLE GUARD DEBUG: Impersonation state:', {
          isImpersonating: impersonating,
          impersonatedUser: impersonatedUser ? {
            id: impersonatedUser.id,
            role: impersonatedUser.role,
            name: impersonatedUser.name
          } : null
        })

        // If user is admin or super_admin, check for impersonation
        if (actualRole === 'admin' || actualRole === 'super_admin') {
          if (impersonating) {
            const impersonatedRole = impersonatedUser?.role || null
            console.log('🎭 ROLE GUARD: Admin impersonating role:', impersonatedRole)

            // Check if impersonated role matches allowed roles
            const hasRequiredRole = impersonatedRole && allowedRoles.includes(impersonatedRole)

            if (!hasRequiredRole) {
              console.log(`🚫 ROLE GUARD: Impersonated role '${impersonatedRole}' not in allowed roles:`, allowedRoles)

              // Redirect to appropriate dashboard based on impersonated role
              let redirectPath = '/admin/dashboard'

              if (impersonatedRole === 'seeker') {
                redirectPath = '/seeker/dashboard'
              } else if (impersonatedRole === 'employer') {
                redirectPath = '/employer/dashboard'
              }

              router.push(redirectPath)
              return
            }

            console.log(`✅ ROLE GUARD: Admin impersonation access granted for role '${impersonatedRole}'`)
            setHasAccess(true)
          } else {
            // Admin not impersonating, check if admin or super_admin role is allowed
            const hasRequiredRole = allowedRoles.includes('admin') || allowedRoles.includes('super_admin')
            console.log('🔍 ROLE GUARD DEBUG: Admin not impersonating, checking admin role access:', {
              hasRequiredRole,
              allowedRoles
            })

            if (!hasRequiredRole) {
              console.log(`🚫 ROLE GUARD: Admin role not in allowed roles:`, allowedRoles)
              router.push('/admin/dashboard')
              return
            }

            console.log(`✅ ROLE GUARD: Admin access granted`)
            setHasAccess(true)
          }
        } else {
          // Non-admin user, check their actual role
          const hasRequiredRole = actualRole && allowedRoles.includes(actualRole)
          console.log('🔍 ROLE GUARD DEBUG: Non-admin user access check:', {
            actualRole,
            hasRequiredRole,
            allowedRoles
          })

          if (!hasRequiredRole) {
            console.log(`🚫 ROLE GUARD: User role '${actualRole}' not in allowed roles:`, allowedRoles)

            // Redirect to appropriate dashboard based on user's role
            let redirectPath = '/onboarding'

            if (actualRole === 'seeker') {
              redirectPath = '/seeker/dashboard'
            } else if (actualRole === 'employer') {
              redirectPath = '/employer/dashboard'
            }

            console.log('🔍 ROLE GUARD DEBUG: Redirecting to:', redirectPath)
            router.push(redirectPath)
            return
          }

          console.log(`✅ ROLE GUARD: Access granted for role '${actualRole}'`)
          setHasAccess(true)
        }
      } catch (error) {
        console.error('🚨 ROLE GUARD: Error checking user role:', error)
        router.push('/onboarding')
        return
      } finally {
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [user, isLoaded, router, allowedRoles, pathname])

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!hasAccess) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
          </div>
        </div>
      )
    )
  }

  return <>{children}</>
}