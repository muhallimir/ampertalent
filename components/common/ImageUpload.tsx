'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { X, Image as ImageIcon } from 'lucide-react'
import { FileUpload } from '@/components/common/FileUpload'
import { getImpersonationSession } from '@/lib/admin-impersonation'

interface ImageUploadProps {
  currentImageUrl?: string
  onUploadComplete?: (imageUrl: string) => void
  acceptedTypes?: string[]
  maxSize?: number
  aspectRatio?: 'square' | 'rectangle' | 'wide'
  placeholder?: string
  className?: string
  fileType?: 'logo' | 'image'
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down'
}

export function ImageUpload({
  currentImageUrl,
  onUploadComplete,
  maxSize = 5 * 1024 * 1024, // 5MB default
  aspectRatio = 'square',
  placeholder = 'Upload image',
  className = '',
  fileType = 'image',
  objectFit = 'contain'
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null)
  const [isUploading, setIsUploading] = useState(false)
  const [imageLoadError, setImageLoadError] = useState(false)
  const [presignedUrl, setPresignedUrl] = useState<string | undefined>()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // For ampertalent, logos are stored in Supabase public buckets - no presigned URL needed
  useEffect(() => {
    const fetchPresignedUrl = async () => {
      if (currentImageUrl && currentImageUrl.trim() !== '' && fileType === 'logo') {
        // Supabase public bucket URLs are directly accessible - use them as-is
        setPresignedUrl(currentImageUrl)
        setImageLoadError(false)
        setIsRefreshing(false)
        setIsInitialLoad(false)
        return
      }

      // For non-logo images, no presigned URL fetching needed
      setPresignedUrl(currentImageUrl || undefined)
      setIsRefreshing(false)
      setIsInitialLoad(false)
    }

    setPreviewUrl(currentImageUrl || null)
    setImageLoadError(false)

    // Always set up the URL for display
    if (currentImageUrl && currentImageUrl.trim() !== '') {
      fetchPresignedUrl()
    } else {
      setPresignedUrl(undefined)
      setIsRefreshing(false)
      setIsInitialLoad(false)
    }
  }, [currentImageUrl, fileType])

  // Get the display URL - for logos, use presignedUrl (direct Supabase URL), for others use preview or current
  const displayImageUrl = presignedUrl || previewUrl || currentImageUrl

  // Show image when we have any URL
  const shouldShowImage = !!displayImageUrl

  // Show loading state when we have a currentImageUrl but no display URL yet
  const isLoadingImage = fileType === 'logo' && currentImageUrl && !displayImageUrl && isInitialLoad

  // Handle image load errors
  const handleImageError = () => {
    setImageLoadError(true)
  }

  const handleImageLoad = () => {
    setImageLoadError(false)
  }

  const handleUploadComplete = (fileUrl: string) => {
    setPreviewUrl(fileUrl)
    setIsUploading(false)
    
    // For logos, clear presigned URL so it gets refetched with the new URL
    if (fileType === 'logo') {
      setPresignedUrl(undefined)
    }
    
    onUploadComplete?.(fileUrl)
  }

  const handleUploadStart = () => {
    setIsUploading(true)
  }

  const handleUploadError = (error: string) => {
    console.error('Image upload error:', error)
    // You could show a toast notification here
  }

  const handleRemove = () => {
    setPreviewUrl(null)
    setPresignedUrl(undefined)
    setImageLoadError(false)
    onUploadComplete?.('')
  }

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case 'square':
        return 'aspect-square'
      case 'rectangle':
        return 'aspect-[4/3]'
      case 'wide':
        return 'aspect-[16/9]'
      default:
        return 'aspect-square'
    }
  }

  const getObjectFitClass = () => {
    switch (objectFit) {
      case 'cover':
        return 'object-cover'
      case 'contain':
        return 'object-contain'
      case 'fill':
        return 'object-fill'
      case 'scale-down':
        return 'object-scale-down'
      default:
        return 'object-contain'
    }
  }

  return (
    <div className={className}>
      {isLoadingImage ? (
        <Card className="border-2 border-gray-200">
          <CardContent className="p-8">
            <div className={`${getAspectRatioClass()} w-full max-w-xs mx-auto flex flex-col items-center justify-center bg-gray-50 rounded-lg`}>
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-600 font-medium mb-1">Loading logo...</p>
                <p className="text-xs text-gray-500">Please wait</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : shouldShowImage ? (
        <Card className="relative">
          <CardContent className="p-4">
            <div className={`relative ${getAspectRatioClass()} w-full max-w-xs mx-auto bg-white border border-gray-200 rounded-lg overflow-hidden`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayImageUrl}
                alt="Preview"
                className={`w-full h-full ${getObjectFitClass()} transition-opacity duration-300 ${isRefreshing ? 'opacity-50' : 'opacity-100'}`}
                onError={handleImageError}
                onLoad={handleImageLoad}
              />
              {isRefreshing && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-xs text-gray-600 font-medium">Updating...</p>
                  </div>
                </div>
              )}
              {imageLoadError && !isRefreshing && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                  <div className="text-center">
                    <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Image failed to load</p>
                  </div>
                </div>
              )}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleRemove}
                disabled={isRefreshing}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4">
              <FileUpload
                onUpload={handleUploadComplete}
                accept="image/jpeg,image/png,image/svg+xml"
                maxSize={maxSize}
                className="w-full"
                disabled={isUploading || isRefreshing}
                uploadType={fileType === 'logo' ? 'logo' : 'image'}
              >
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    {isUploading ? 'Uploading new image...' : isRefreshing ? 'Refreshing...' : 'Click to replace image'}
                  </p>
                </div>
              </FileUpload>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
          <CardContent className="p-8">
            <div className={`${getAspectRatioClass()} w-full max-w-xs mx-auto flex flex-col items-center justify-center`}>
              <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">{placeholder}</p>
              <p className="text-sm text-gray-500 text-center mb-4">
                Drag and drop an image here, or click to select
              </p>
              <FileUpload
                onUpload={handleUploadComplete}
                accept="image/jpeg,image/png,image/svg+xml"
                maxSize={maxSize}
                className="w-full"
                disabled={isUploading}
                uploadType={fileType === 'logo' ? 'logo' : 'image'}
              />
              <p className="text-xs text-gray-400 mt-2">
                Max size: {Math.round(maxSize / (1024 * 1024))}MB
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}