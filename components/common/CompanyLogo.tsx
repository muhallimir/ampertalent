'use client'

import { useState, useEffect } from 'react'
import { Building } from 'lucide-react'

interface CompanyLogoProps {
  companyLogoUrl?: string | null
  companyName: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function CompanyLogo({
  companyLogoUrl,
  companyName,
  size = 'md',
  className = ''
}: CompanyLogoProps) {
  const [presignedUrl, setPresignedUrl] = useState<string | undefined>()
  const [imageLoadError, setImageLoadError] = useState(false)

  // Handle company logo URL - use the URL directly (presigned URLs are generated server-side)
  useEffect(() => {
    console.log('🖼️ CompanyLogo: Processing logo URL', {
      companyLogoUrl,
      companyName,
      hasUrl: !!companyLogoUrl,
      urlLength: companyLogoUrl?.length
    })

    if (companyLogoUrl && companyLogoUrl.trim() !== '') {
      console.log('🖼️ CompanyLogo: Using provided URL directly', companyLogoUrl)
      setPresignedUrl(companyLogoUrl)
      setImageLoadError(false)
    } else {
      console.log('🖼️ CompanyLogo: No logo URL provided, showing fallback')
      setPresignedUrl(undefined)
      setImageLoadError(false)
    }
  }, [companyLogoUrl, companyName])

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
    console.error('🖼️ CompanyLogo: Image failed to load', {
      src: e.currentTarget.src,
      companyName,
      error: e
    })
    setImageLoadError(true)
  }

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.log('🖼️ CompanyLogo: Image loaded successfully', {
      src: e.currentTarget.src,
      companyName
    })
    setImageLoadError(false)
  }

  // Show logo if we have a presigned URL and no load error
  if (presignedUrl && !imageLoadError) {
    console.log('🖼️ CompanyLogo: Rendering image', {
      presignedUrl,
      imageLoadError,
      companyName
    })
    return (
      <div className={`${getSizeClasses()} ${className} overflow-hidden rounded-lg bg-white border border-gray-200 flex items-center justify-center p-1`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={presignedUrl}
          alt={`${companyName} logo`}
          className="w-full h-full object-contain"
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      </div>
    )
  }

  // Fallback to company initial or building icon
  const initial = companyName?.charAt(0)?.toUpperCase() || ''

  console.log('🖼️ CompanyLogo: Showing fallback', {
    presignedUrl,
    imageLoadError,
    companyName,
    initial,
    reason: !presignedUrl ? 'No presigned URL' : imageLoadError ? 'Image load error' : 'Unknown'
  })

  return (
    <div className={`${getSizeClasses()} ${className} bg-gray-100 rounded-lg flex items-center justify-center`}>
      {initial ? (
        <span className={`font-semibold text-gray-600 ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-xl' : 'text-sm'}`}>
          {initial}
        </span>
      ) : (
        <Building className={`${getIconSize()} text-gray-400`} />
      )}
    </div>
  )
}