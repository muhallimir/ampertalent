'use client'

import { useState, useEffect } from 'react'
import { User } from 'lucide-react'

interface ProfilePictureProps {
  profilePictureUrl?: string | null
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ProfilePicture({
  profilePictureUrl,
  name,
  size = 'md',
  className = ''
}: ProfilePictureProps) {
  const [presignedUrl, setPresignedUrl] = useState<string | undefined>()
  const [imageLoadError, setImageLoadError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Handle profile picture URL - use direct URL if it's a complete URL, otherwise fetch presigned URL
  useEffect(() => {
    const handleProfilePictureUrl = async () => {
      console.log('🖼️ ProfilePicture: Processing profile picture URL', {
        profilePictureUrl,
        name,
        hasUrl: !!profilePictureUrl,
        urlLength: profilePictureUrl?.length
      })

      if (profilePictureUrl && profilePictureUrl.trim() !== '') {
        // Check if it's an S3 URL that might be expired
        const isS3Url = profilePictureUrl.includes('hire-my-mom-files.s3.') || profilePictureUrl.includes('.amazonaws.com')

        // Check if it's already a complete URL (starts with http/https)
        if ((profilePictureUrl.startsWith('http://') || profilePictureUrl.startsWith('https://')) && !isS3Url) {
          console.log('🖼️ ProfilePicture: Using direct external URL', profilePictureUrl)
          // Use external URLs directly (non-S3 URLs)
          setPresignedUrl(profilePictureUrl)
          setImageLoadError(false)
          return
        }

        // If it's an S3 URL (even if complete) or not a complete URL, fetch fresh presigned URL
        // This handles both S3 keys and expired S3 URLs
        console.log('🖼️ ProfilePicture: Fetching fresh presigned URL for S3 URL/key', {
          profilePictureUrl,
          isS3Url,
          isCompleteUrl: profilePictureUrl.startsWith('http://') || profilePictureUrl.startsWith('https://')
        })
        setIsLoading(true)
        try {
          const response = await fetch('/api/admin/profile-picture', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ profilePictureUrl })
          })
          console.log('🖼️ ProfilePicture: API response status', response.status)

          if (response.ok) {
            const data = await response.json()
            console.log('🖼️ ProfilePicture: Got presigned URL', data.presignedUrl)
            setPresignedUrl(data.presignedUrl)
            setImageLoadError(false)
          } else {
            const errorData = await response.json().catch(() => ({}))
            console.log('🖼️ ProfilePicture: API error, falling back to direct URL', {
              status: response.status,
              error: errorData,
              fallbackUrl: profilePictureUrl
            })
            // If presigned URL fails, fall back to direct URL
            setPresignedUrl(profilePictureUrl)
          }
        } catch (error) {
          console.error('🖼️ ProfilePicture: Error fetching presigned URL, falling back to direct URL:', error)
          // Fall back to direct URL
          setPresignedUrl(profilePictureUrl)
        } finally {
          setIsLoading(false)
        }
      } else {
        console.log('🖼️ ProfilePicture: No profile picture URL provided, showing fallback')
        setPresignedUrl(undefined)
      }
    }

    setImageLoadError(false)
    handleProfilePictureUrl()
  }, [profilePictureUrl, name])

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-8 h-8'
      case 'md':
        return 'w-12 h-12'
      case 'lg':
        return 'w-16 h-16'
      default:
        return 'w-12 h-12'
    }
  }

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-4 w-4'
      case 'md':
        return 'h-6 w-6'
      case 'lg':
        return 'h-8 w-8'
      default:
        return 'h-6 w-6'
    }
  }

  // Handle image load errors
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('🖼️ ProfilePicture: Image failed to load', {
      src: e.currentTarget.src,
      name,
      error: e
    })
    setImageLoadError(true)
  }

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.log('🖼️ ProfilePicture: Image loaded successfully', {
      src: e.currentTarget.src,
      name
    })
    setImageLoadError(false)
  }

  // Show loading state
  if (isLoading && profilePictureUrl) {
    return (
      <div className={`${getSizeClasses()} ${className} bg-gray-100 rounded-full flex items-center justify-center animate-pulse`}>
        <User className={`${getIconSize()} text-gray-400`} />
      </div>
    )
  }

  // Show profile picture if we have a presigned URL and no load error
  if (presignedUrl && !imageLoadError) {
    console.log('🖼️ ProfilePicture: Rendering image', {
      presignedUrl,
      imageLoadError,
      name
    })
    return (
      <div className={`${getSizeClasses()} ${className} overflow-hidden rounded-full bg-gray-100 flex items-center justify-center`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={presignedUrl}
          alt={`${name}'s profile picture`}
          className="w-full h-full object-cover"
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      </div>
    )
  }

  // Fallback to name initial or user icon
  const initial = name?.charAt(0)?.toUpperCase() || ''

  console.log('🖼️ ProfilePicture: Showing fallback', {
    presignedUrl,
    imageLoadError,
    name,
    initial,
    reason: !presignedUrl ? 'No presigned URL' : imageLoadError ? 'Image load error' : 'Unknown'
  })

  return (
    <div className={`${getSizeClasses()} ${className} bg-gray-100 rounded-full flex items-center justify-center`}>
      {initial ? (
        <span className={`font-semibold text-gray-600 ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-xl' : 'text-sm'}`}>
          {initial}
        </span>
      ) : (
        <User className={`${getIconSize()} text-gray-400`} />
      )}
    </div>
  )
}