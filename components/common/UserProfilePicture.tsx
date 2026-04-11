'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { User } from 'lucide-react'
import { getImpersonationSession } from '@/lib/admin-impersonation'

interface UserProfilePictureProps {
  userId: string
  userName: string
  profilePictureUrl: string | null
  /** Pre-resolved presigned URL — skips the individual API fetch entirely */
  resolvedUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
}

export function UserProfilePicture({
  userId,
  userName,
  profilePictureUrl,
  resolvedUrl,
  size = 'md'
}: UserProfilePictureProps) {
  const [presignedUrl, setPresignedUrl] = useState<string | null>(resolvedUrl ?? null)
  const [isLoading, setIsLoading] = useState(false)

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-8 w-8'
  }

  useEffect(() => {
    if (resolvedUrl !== undefined) {
      setPresignedUrl(resolvedUrl)
      return
    }

    if (!profilePictureUrl) return

    const isGravatarUrl = profilePictureUrl.includes('gravatar.com/avatar/')

    if (isGravatarUrl) {
      setPresignedUrl(profilePictureUrl)
      setIsLoading(false)
      return
    }

    // For S3 URLs, fetch the presigned URL
    const fetchPresignedUrl = async () => {
      try {
        setIsLoading(true)

        // Check for impersonation context and add headers if needed
        const headers: HeadersInit = {}

        if (typeof window !== 'undefined') {
          const impersonationSession = getImpersonationSession()
          if (impersonationSession) {
            headers['x-impersonated-user-id'] =
              impersonationSession.impersonatedUser.id
            headers['x-admin-user-id'] = impersonationSession.adminId
          }
        }

        const response = await fetch(`/api/user/profile-picture/${userId}`, {
          headers
        })

        if (response.ok) {
          const data = await response.json()
          setPresignedUrl(data.profilePictureUrl)
        } else {
          console.error(
            'Failed to fetch presigned URL for user profile picture'
          )
        }
      } catch (error) {
        console.error(
          'Error fetching presigned URL for user profile picture:',
          error
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchPresignedUrl()
  }, [userId, profilePictureUrl, resolvedUrl])

  if (!profilePictureUrl || (!presignedUrl && !isLoading)) {
    return (
      <div
        className={`${sizeClasses[size]} bg-brand-teal-light rounded-full flex items-center justify-center border-2 border-brand-teal flex-shrink-0`}
      >
        <User className={`${iconSizes[size]} text-brand-teal`} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div
        className={`${sizeClasses[size]} bg-gray-200 rounded-full flex items-center justify-center border-2 border-gray-300 flex-shrink-0 animate-pulse`}
      >
        <User className={`${iconSizes[size]} text-gray-400`} />
      </div>
    )
  }

  return (
    <div
      className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-2 border-brand-teal flex-shrink-0`}
    >
      <Image
        src={presignedUrl || ''}
        alt={userName || 'User'}
        fill
        className="object-cover"
        onError={() => {
          console.error('Error loading profile picture')
        }}
        unoptimized={presignedUrl?.includes('gravatar.com')}
      />
    </div>
  )
}
