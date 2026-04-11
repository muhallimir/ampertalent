'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { User } from 'lucide-react'
import { getImpersonationSession } from '@/lib/admin-impersonation'

interface ApplicantProfilePictureProps {
  applicantId: string
  applicantName: string
  profilePictureUrl: string | null
  size?: 'sm' | 'md' | 'lg'
}

export function ApplicantProfilePicture({ 
  applicantId, 
  applicantName, 
  profilePictureUrl,
  size = 'md'
}: ApplicantProfilePictureProps) {
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null)
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
    if (!profilePictureUrl) return

    const fetchPresignedUrl = async () => {
      try {
        setIsLoading(true)
        
        // Check for impersonation context and add headers if needed
        const headers: HeadersInit = {}
        
        if (typeof window !== 'undefined') {
          const impersonationSession = getImpersonationSession()
          if (impersonationSession) {
            headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
            headers['x-admin-user-id'] = impersonationSession.adminId
          }
        }
        
        const response = await fetch(`/api/applicant/profile-picture/${applicantId}`, { headers })
        
        if (response.ok) {
          const data = await response.json()
          setPresignedUrl(data.profilePictureUrl)
        } else {
          console.error('Failed to fetch presigned URL for applicant profile picture')
        }
      } catch (error) {
        console.error('Error fetching presigned URL for applicant profile picture:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPresignedUrl()
  }, [applicantId, profilePictureUrl])

  if (!profilePictureUrl || (!presignedUrl && !isLoading)) {
    return (
      <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-2 border-brand-teal flex-shrink-0`}>
        <Image
          src="/assets/hmm_avatar_.png"
          alt={applicantName || 'Default Avatar'}
          fill
          className="object-cover"
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`${sizeClasses[size]} bg-gray-200 rounded-full flex items-center justify-center border-2 border-gray-300 flex-shrink-0 animate-pulse`}>
        <User className={`${iconSizes[size]} text-gray-400`} />
      </div>
    )
  }

  return (
    <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-2 border-brand-teal flex-shrink-0`}>
      <Image
        src={presignedUrl || ''}
        alt={applicantName || 'Applicant'}
        fill
        className="object-cover"
      />
    </div>
  )
}