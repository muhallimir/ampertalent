import { auth, clerkClient } from '@clerk/nextjs/server'
import { db } from './db'
import { NextRequest } from 'next/server'

// Define UserRole type locally to avoid Prisma import issues in production
export type UserRole = 'seeker' | 'employer' | 'admin' | 'super_admin' | 'team_member'

// Per-request cache for Clerk user calls to avoid repeated API requests within the same request
const requestCache = new WeakMap<NextRequest, { user: any; timestamp: number }>()
const CACHE_DURATION = 30000 // 30 seconds

/**
 * Get Clerk user with per-request caching to avoid repeated API requests
 */
async function getClerkUser(request?: NextRequest) {
  // If we have a request object, check for cached user in request scope
  if (request) {
    const cachedEntry = requestCache.get(request)
    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_DURATION) {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('✅ Using per-request cached Clerk user', {
          userId: cachedEntry.user?.id,
          cacheAge: Date.now() - cachedEntry.timestamp
        })
      }
      return cachedEntry.user
    }
  }

  if (process.env.DEBUG_MODE === 'true') {
    console.log('🔄 Fetching fresh Clerk user')
  }
  const { userId } = await auth()

  if (!userId) {
    if (process.env.DEBUG_MODE === 'true') {
      console.log('❌ No Clerk userId found')
    }
    return null
  }

  const clerk = await clerkClient()
  const user = await clerk.users.getUser(userId)

  if (process.env.DEBUG_MODE === 'true') {
    console.log('✅ Clerk user fetched', {
      userId: user?.id,
      hasUser: !!user
    })
  }

  // If we have a request object, cache the user for this request
  if (request && user) {
    requestCache.set(request, { user, timestamp: Date.now() })
  }

  return user
}

/**
 * Get user role from database using Clerk user ID
 */
export async function getUserRole(clerkUserId: string): Promise<UserRole | null> {
  try {
    const userProfile = await db.userProfile.findUnique({
      where: { clerkUserId },
      select: { role: true }
    })

    return userProfile?.role as UserRole || null
  } catch (error) {
    console.error('Error fetching user role:', error)
    return null
  }
}

/**
 * Get complete user profile including role
 */
export async function getUserProfile(clerkUserId: string) {
  const startTime = Date.now()
  try {
    if (process.env.DEBUG_MODE === 'true') {
      console.log(`🔍 DB: Starting getUserProfile(${clerkUserId})`)
    }

    const profileStartTime = Date.now()
    const userProfile = await db.userProfile.findUnique({
      where: { clerkUserId },
      include: {
        employer: true
      }
    })
    const profileDuration = Date.now() - profileStartTime

    if (process.env.DEBUG_MODE === 'true') {
      if (profileDuration > 100) {
        console.warn(`🐌 SLOW PROFILE QUERY (${profileDuration}ms): userProfile.findUnique for ${clerkUserId}`)
      } else {
        console.log(`✅ Profile base query: ${profileDuration}ms`)
      }
    }

    // If user has jobSeeker role, fetch jobSeeker data separately
    if (userProfile && userProfile.role === 'seeker') {
      try {
        const seekerStartTime = Date.now()
        const jobSeeker = await db.jobSeeker.findUnique({
          where: { userId: userProfile.id },
          select: {
            userId: true,
            headline: true,
            aboutMe: true,
            availability: true,
            skills: true,
            portfolioUrls: true,
            resumeUrl: true,
            resumeLastUploaded: true,
            membershipPlan: true,
            membershipExpiresAt: true,
            isSuspended: true,
            createdAt: true,
            updatedAt: true
          }
        })
        const seekerDuration = Date.now() - seekerStartTime

        if (process.env.DEBUG_MODE === 'true') {
          if (seekerDuration > 100) {
            console.warn(`🐌 SLOW SEEKER QUERY (${seekerDuration}ms): jobSeeker.findUnique for userId ${userProfile.id}`)
          } else {
            console.log(`✅ Seeker query: ${seekerDuration}ms`)
          }

          const totalDuration = Date.now() - startTime
          console.log(`🎯 PROFILE COMPLETE: Total ${totalDuration}ms (Profile: ${profileDuration}ms, Seeker: ${seekerDuration}ms)`)
        }

        return {
          ...userProfile,
          jobSeeker
        }
      } catch (seekerError) {
        const errorDuration = Date.now() - startTime
        console.error(`🚨 SEEKER QUERY ERROR after ${errorDuration}ms:`, seekerError)
        return userProfile
      }
    }

    if (process.env.DEBUG_MODE === 'true') {
      const totalDuration = Date.now() - startTime
      console.log(`🎯 PROFILE COMPLETE: Total ${totalDuration}ms (Profile only: ${profileDuration}ms)`)
    }

    return userProfile
  } catch (error) {
    // Always log actual errors
    const errorDuration = Date.now() - startTime
    console.error(`🚨 PROFILE QUERY ERROR after ${errorDuration}ms:`, error)
    return null
  }
}

/**
 * Create user profile after Clerk registration
 */
export async function createUserProfile(data: {
  clerkUserId: string
  role: UserRole
  name: string
  email?: string
  phone?: string
  timezone?: string
}) {
  try {
    const userProfile = await db.userProfile.create({
      data: {
        clerkUserId: data.clerkUserId,
        role: data.role,
        name: data.name,
        email: data.email,
        phone: data.phone,
        timezone: data.timezone || 'America/Chicago'
      }
    })

    // Create role-specific profile
    if (data.role === 'seeker') {
      await db.jobSeeker.create({
        data: {
          userId: userProfile.id
        }
      })
    } else if (data.role === 'employer') {
      await db.employer.create({
        data: {
          userId: userProfile.id,
          companyName: '' // Will be filled in profile setup
        }
      })
    }

    return userProfile
  } catch (error) {
    console.error('Error creating user profile:', error)
    throw error
  }
}

/**
 * Get current user from Clerk and their role, with impersonation support
 */
export async function getCurrentUser(request?: NextRequest) {
  const startTime = Date.now()
  try {
    if (process.env.DEBUG_MODE === 'true') {
      console.log('🔍 AUTH: Starting getCurrentUser()')
    }

    // Check for impersonation headers
    const impersonatedUserId = request?.headers.get('x-impersonated-user-id')
    const adminUserId = request?.headers.get('x-admin-user-id')

    if (impersonatedUserId && adminUserId) {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('🎭 IMPERSONATION: Detected impersonation headers', { impersonatedUserId, adminUserId })
      }

      // Validate admin user first
      const adminClerkUser = await getClerkUser(request)

      if (!adminClerkUser || adminClerkUser.id !== adminUserId) {
        console.error('❌ IMPERSONATION: Invalid admin user')
        return null
      }

      // Get admin profile to verify admin role
      const adminProfile = await getUserProfile(adminUserId)
      if (!adminProfile || (adminProfile.role !== 'admin' && adminProfile.role !== 'super_admin')) {
        console.error('❌ IMPERSONATION: User is not admin or super admin')
        return null
      }

      // Get impersonated user profile by profile ID
      const impersonatedProfile = await db.userProfile.findUnique({
        where: { id: impersonatedUserId },
        include: {
          employer: true
        }
      })

      if (!impersonatedProfile || !impersonatedProfile.clerkUserId) {
        console.error('❌ IMPERSONATION: Impersonated user not found or has no Clerk ID')
        return null
      }

      // Get the impersonated user's Clerk data
      let impersonatedClerkUser = null
      try {
        const clerk = await clerkClient()
        impersonatedClerkUser = await clerk.users.getUser(impersonatedProfile.clerkUserId!)
        if (process.env.DEBUG_MODE === 'true') {
          console.log('🎭 IMPERSONATION: Got Clerk user for impersonated user')
        }
      } catch (clerkError) {
        console.error('❌ IMPERSONATION: Could not get Clerk data for impersonated user:', clerkError)
        // Create mock Clerk user object
        impersonatedClerkUser = {
          id: impersonatedProfile.clerkUserId,
          primaryEmailAddress: { emailAddress: impersonatedProfile.email || '' },
          firstName: impersonatedProfile.firstName,
          lastName: impersonatedProfile.lastName
        }
      }

      // If impersonated user is a seeker, get their seeker data
      let fullImpersonatedProfile: any = impersonatedProfile
      if (impersonatedProfile.role === 'seeker') {
        try {
          const jobSeeker = await db.jobSeeker.findUnique({
            where: { userId: impersonatedProfile.id },
            select: {
              userId: true,
              headline: true,
              aboutMe: true,
              availability: true,
              skills: true,
              portfolioUrls: true,
              resumeUrl: true,
              resumeLastUploaded: true,
              membershipPlan: true,
              membershipExpiresAt: true,
              isSuspended: true,
              createdAt: true,
              updatedAt: true
            }
          })

          fullImpersonatedProfile = {
            ...impersonatedProfile,
            jobSeeker
          }
        } catch (seekerError) {
          console.error('🚨 SEEKER QUERY ERROR during impersonation:', seekerError)
        }
      }

      if (process.env.DEBUG_MODE === 'true') {
        console.log('✅ IMPERSONATION: Successfully validated impersonation context')
      }

      // Return impersonated user context
      return {
        clerkUser: impersonatedClerkUser,
        adminClerkUser: adminClerkUser,
        profile: fullImpersonatedProfile,
        isImpersonating: true,
        adminProfile: adminProfile
      }
    }

    // Normal authentication flow
    const clerkStartTime = Date.now()
    const user = await getClerkUser(request)
    const clerkDuration = Date.now() - clerkStartTime

    if (process.env.DEBUG_MODE === 'true') {
      console.log('🔍 AUTH DEBUG: Normal auth flow - Clerk user:', {
        clerkUserId: user?.id,
        hasUser: !!user,
        userEmail: user?.primaryEmailAddress?.emailAddress
      })

      if (clerkDuration > 100) {
        console.warn(`🐌 SLOW CLERK AUTH (${clerkDuration}ms): getClerkUser(request)`)
      } else {
        console.log(`✅ Clerk Auth: ${clerkDuration}ms`)
      }
    }

    if (!user) {
      if (process.env.DEBUG_MODE === 'true') {
        console.log('❌ AUTH: No user found')
      }
      return null
    }

    const profileStartTime = Date.now()
    const userProfile = await getUserProfile(user.id)
    const profileDuration = Date.now() - profileStartTime

    if (process.env.DEBUG_MODE === 'true') {
      if (profileDuration > 100) {
        console.warn(`🐌 SLOW PROFILE LOOKUP (${profileDuration}ms): getUserProfile(${user.id})`)
      } else {
        console.log(`✅ Profile lookup: ${profileDuration}ms`)
      }

      const totalDuration = Date.now() - startTime
      console.log(`🎯 AUTH COMPLETE: Total ${totalDuration}ms (Clerk: ${clerkDuration}ms, Profile: ${profileDuration}ms)`)
    }

    const result = {
      clerkUser: user,
      profile: userProfile,
      isImpersonating: false
    }

    if (process.env.DEBUG_MODE === 'true') {
      console.log('🚨 CRITICAL: [AUTH] getCurrentUser returning:', {
        hasClerkUser: !!result.clerkUser,
        hasProfile: !!result.profile,
        clerkUserId: result.clerkUser?.id,
        profileId: result.profile?.id,
        profileRole: result.profile?.role,
        profileEmail: result.profile?.email,
        isImpersonating: result.isImpersonating
      })
    }

    return result
  } catch (error) {
    // Always log actual errors
    const totalDuration = Date.now() - startTime
    console.error(`🚨 AUTH ERROR after ${totalDuration}ms:`, error)
    return null
  }
}

/**
 * Check if user has required role
 */
export async function hasRole(clerkUserId: string, requiredRoles: UserRole[]): Promise<boolean> {
  const role = await getUserRole(clerkUserId)
  return role ? requiredRoles.includes(role) : false
}

/**
 * Check if a role matches the required roles
 * Synchronous helper for after role is already fetched
 */
export function checkRole(role: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(role)
}

/**
 * Middleware helper for role-based access control
 */
export function requireAuth(allowedRoles: UserRole[]) {
  return async (_request: Request) => {
    try {
      const { userId } = await auth()
      if (!userId) {
        return new Response('Unauthorized', { status: 401 })
      }

      const hasRequiredRole = await hasRole(userId, allowedRoles)
      if (!hasRequiredRole) {
        return new Response('Forbidden', { status: 403 })
      }

      return null // Continue to route handler
    } catch (error) {
      console.error('Auth middleware error:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  }
}

/**
 * Log admin actions for audit trail
 */
export async function logAdminAction(
  adminId: string,
  actionType: string,
  targetEntity: string,
  targetId: string,
  details?: Record<string, unknown>
) {
  try {
    await db.adminActionLog.create({
      data: {
        adminId,
        actionType,
        targetEntity,
        targetId,
        details: details as any
      }
    })
  } catch (error) {
    console.error('Error logging admin action:', error)
  }
}