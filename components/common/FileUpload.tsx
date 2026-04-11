'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { Upload, X, AlertCircle } from 'lucide-react'
import { getImpersonationSession } from '@/lib/admin-impersonation'

export interface FileUploadProps {
  onUpload: (url: string) => void
  accept?: string
  maxSize?: number
  className?: string
  disabled?: boolean
  children?: React.ReactNode
  uploadType?: string
}

export function FileUpload({
  onUpload,
  accept = '*/*',
  maxSize = 10 * 1024 * 1024, // 10MB default
  className,
  disabled = false,
  children,
  uploadType = 'document'
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    // Check if file exists
    if (!file) {
      return 'No file selected. Please choose a file to upload.'
    }

    // Check file size
    if (file.size === 0) {
      return 'The selected file is empty. Please choose a valid file.'
    }

    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / 1024 / 1024)
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(2)
      return `File size (${fileSizeMB}MB) exceeds the maximum allowed size of ${maxSizeMB}MB. Please choose a smaller file.`
    }

    // Check file type
    if (accept !== '*/*') {
      const acceptedTypes = accept.split(',').map(type => type.trim())
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
      const mimeType = file.type

      const isValidType = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExtension === type.toLowerCase()
        }
        return mimeType.match(type.replace('*', '.*'))
      })

      if (!isValidType) {
        // Create user-friendly accepted types list
        const friendlyTypes = acceptedTypes.map(type => {
          if (type.includes('jpeg')) return 'JPEG'
          if (type.includes('jpg')) return 'JPG'
          if (type.includes('png')) return 'PNG'
          if (type.includes('svg')) return 'SVG'
          if (type.includes('pdf')) return 'PDF'
          return type
        }).filter((v, i, a) => a.indexOf(v) === i).join(', ')

        return `File type "${fileExtension || 'unknown'}" is not supported. Please upload one of these file types: ${friendlyTypes}`
      }
    }

    return null
  }

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    // Store the callback reference to ensure it's available
    const uploadCallback = onUpload

    try {
      // Build headers with impersonation support
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (typeof window !== 'undefined') {
        const impersonationSession = getImpersonationSession()
        if (impersonationSession) {
          headers['x-impersonated-user-id'] = impersonationSession.impersonatedUser.id
          headers['x-admin-user-id'] = impersonationSession.adminId
        }
      }

      // Get presigned URL for upload
      const presignedResponse = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          uploadType: uploadType
        })
      })

      if (!presignedResponse.ok) {
        const errorData = await presignedResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to prepare file upload. Please try again.')
      }

      const { uploadUrl, fileUrl, uploadId } = await presignedResponse.json()

      // Upload file to S3 using presigned URL
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage. Please check your internet connection and try again.')
      }

      setUploadProgress(100)

      // Confirm upload completion
      const confirmResponse = await fetch('/api/upload/confirm', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          uploadId: uploadId,
          fileUrl: fileUrl
        })
      })

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to confirm upload. Please try again.')
      }

      // ✅ Only call callback after successful confirmation
      if (typeof uploadCallback === 'function') {
        uploadCallback(fileUrl)
      } else {
        console.warn('onUpload callback not provided, upload completed successfully')
        // Set a success state to show the file was uploaded
        setUploadedFileUrl(fileUrl)
        setError(null)
      }
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : 'Upload failed due to an unexpected error. Please try again.'
      setError(errorMessage)
      console.error('File upload error:', err)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [onUpload])

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      setError('No file selected. Please choose a file to upload.')
      return
    }

    const file = files[0]
    const validationError = validateFile(file)

    if (validationError) {
      setError(validationError)
      return
    }

    await uploadFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (disabled) return

    const files = e.dataTransfer.files
    handleFileSelect(files)
  }

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
  }

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragging && !disabled
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed',
          isUploading && 'pointer-events-none'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        {uploadedFileUrl ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Upload className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-green-900 mb-1">
                File uploaded successfully!
              </p>
              <p className="text-xs text-green-600">
                Your file has been saved and is ready to use.
              </p>
            </div>
          </div>
        ) : isUploading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <Upload className="w-8 h-8 text-blue-500 animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">
                Uploading...
              </p>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-gray-500 mt-1">
                {uploadProgress}% complete
              </p>
            </div>
          </div>
        ) : children ? (
          children
        ) : (
          <div>
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              {accept !== '*/*' && `Accepted: ${accept} • `}
              Max size: {Math.round(maxSize / 1024 / 1024)}MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4 border-red-300 bg-red-50">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="flex items-start justify-between gap-2 ml-2">
            <div className="flex-1">
              <p className="font-semibold text-red-900 mb-1">Upload Error</p>
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="hover:bg-red-100 text-red-600 hover:text-red-700 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}