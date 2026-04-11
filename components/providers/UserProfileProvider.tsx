'use client'

import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { useUser } from '@clerk/nextjs'
import { getImpersonationSession } from '@/lib/admin-impersonation'

interface UserProfile {
  id: string
  clerkUserId?: string
  profilePictureUrl?: string
  presignedProfilePictureUrl?: string
  fullName?: string
  companyName?: string
  role?: string
  name?: string
  email?: string
  phone?: string
  timezone?: string
}

interface UserProfileContextValue {
  profile: UserProfile | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const UserProfileContext = createContext<UserProfileContextValue | undefined>(undefined)

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useUser()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const consecutiveFailuresRef = useRef(0)
  const isBlockedRef = useRef(false)

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null)
      setIsLoading(false)
      consecutiveFailuresRef.current = 0
      isBlockedRef.current = false
      return
    }

    // Circuit breaker: Stop retrying after 3 consecutive auth failures
    if (isBlockedRef.current) {
      console.log('🚫 Profile fetch blocked due to repeated auth failures')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)

      // Check for impersonation context and add headers if needed
      const headers: HeadersInit = {}

      if (typeof window !== 'undefined') {
        // Use getImpersonationSession without parameter to find any active session
        // This is safer because it will search for any admin-specific session
        const impersonationSession = getImpersonationSession()

        if (impersonationSession) {
          console.log('🎭 FRONTEND: Adding impersonation headers to profile request', {
            impersonatedUserId: impersonationSession.impersonatedUser.id,
            adminId: impersonationSession.adminId,
            currentClerkUserId: user?.id
          })
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }

      const response = await fetch('/api/user/profile', { headers })

      if (response.ok) {
        const data = await response.json()
        let profileData = data.profile

        // If user has a profile picture, fetch presigned URL
        if (profileData?.profilePictureUrl) {
          try {
            const presignedResponse = await fetch('/api/user/profile-picture', { headers })
            if (presignedResponse.ok) {
              const presignedData = await presignedResponse.json()
              profileData = {
                ...profileData,
                presignedProfilePictureUrl: presignedData.profilePictureUrl
              }
            }
          } catch (err) {
            console.error('Error fetching presigned profile picture URL:', err)
            // Continue without presigned URL
          }
        }

        setProfile(profileData)
        setError(null)
        consecutiveFailuresRef.current = 0 // Reset on success
      } else {
        // Handle authentication failures
        if (response.status === 401) {
          consecutiveFailuresRef.current++
          console.log(`⚠️ Auth failure ${consecutiveFailuresRef.current}/3`)

          // After 3 consecutive failures, block further requests
          if (consecutiveFailuresRef.current >= 3) {
            isBlockedRef.current = true
            console.log('🚫 Blocking profile fetches - session appears invalid')
          }
        } else {
          setError('Failed to load profile')
          consecutiveFailuresRef.current = 0
        }
        setProfile(null)
      }
    } catch (err) {
      console.error('Error fetching user profile:', err)
      setError('Failed to load profile')
      setProfile(null)
      consecutiveFailuresRef.current = 0
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    // Only fetch when we have a valid user ID
    if (user?.id) {
      fetchProfile()
    } else {
      setProfile(null)
      setIsLoading(false)
    }
  }, [user?.id, fetchProfile])

  // Listen for profile update events
  useEffect(() => {
    const handleProfileUpdate = () => {
      if (user?.id) {
        fetchProfile()
      }
    }

    // Listen for impersonation changes to refetch profile
    const handleImpersonationChange = () => {
      console.log('🎭 IMPERSONATION CHANGE: Refetching profile')
      if (user?.id) {
        // Reset blocked state to allow fresh fetch
        isBlockedRef.current = false
        consecutiveFailuresRef.current = 0
        fetchProfile()
      }
    }

    window.addEventListener('userProfileUpdated', handleProfileUpdate)
    window.addEventListener('impersonationChanged', handleImpersonationChange)
    
    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate)
      window.removeEventListener('impersonationChanged', handleImpersonationChange)
    }
  }, [user?.id, fetchProfile])

  const value = {
    profile,
    isLoading,
    error,
    refetch: fetchProfile
  }

  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  )
}

export function useUserProfile() {
  const context = useContext(UserProfileContext)
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider')
  }
  return context
}
