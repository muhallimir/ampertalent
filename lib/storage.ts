/**
 * Supabase Storage Adapter
 * Provides presigned URLs and file operations for resume uploads, profile pictures, etc.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

// Create Supabase client with service role (for presigned URLs)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Generate presigned upload URL
 * @param bucket - Storage bucket name (e.g., 'resumes')
 * @param key - File path within bucket (e.g., 'user-123/resume.pdf')
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Promise<string> - Presigned URL for uploading
 */
export async function generatePresignedUploadUrl(
  bucket: string,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    // Create signed URL for upload
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(key, expiresIn, {
        transform: {
          width: 800,
          height: 800,
          resize: 'cover',
        },
      })

    if (error) {
      throw new Error(`Failed to generate presigned upload URL: ${error.message}`)
    }

    return data.signedUrl
  } catch (error) {
    console.error('[Storage] Error generating presigned upload URL:', error)
    throw error
  }
}

/**
 * Generate presigned download URL
 * @param bucket - Storage bucket name
 * @param key - File path within bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Promise<string> - Presigned URL for downloading
 */
export async function generatePresignedDownloadUrl(
  bucket: string,
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(key, expiresIn)

    if (error) {
      throw new Error(`Failed to generate presigned download URL: ${error.message}`)
    }

    return data.signedUrl
  } catch (error) {
    console.error('[Storage] Error generating presigned download URL:', error)
    throw error
  }
}

/**
 * Get public URL for a file (works if bucket has public access)
 * @param bucket - Storage bucket name
 * @param key - File path within bucket
 * @returns string - Public URL
 */
export function getPublicUrl(bucket: string, key: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(key)
  return data.publicUrl
}

/**
 * Upload a file directly (server-side)
 * @param bucket - Storage bucket name
 * @param key - File path within bucket
 * @param file - File buffer or blob
 * @returns Promise<object> - Upload result with path and public URL
 */
export async function uploadFile(
  bucket: string,
  key: string,
  file: Buffer | Blob | ArrayBuffer
): Promise<{ path: string; url: string }> {
  try {
    const { data, error } = await supabase.storage.from(bucket).upload(key, file, {
      upsert: true, // Overwrite if exists
    })

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`)
    }

    const publicUrl = getPublicUrl(bucket, key)
    return { path: data.path, url: publicUrl }
  } catch (error) {
    console.error('[Storage] Error uploading file:', error)
    throw error
  }
}

/**
 * Delete a file
 * @param bucket - Storage bucket name
 * @param key - File path within bucket
 * @returns Promise<void>
 */
export async function deleteFile(bucket: string, key: string): Promise<void> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([key])

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`)
    }
  } catch (error) {
    console.error('[Storage] Error deleting file:', error)
    throw error
  }
}

/**
 * Get file metadata
 * @param bucket - Storage bucket name
 * @param key - File path within bucket
 * @returns Promise<object> - File metadata
 */
export async function getFileMetadata(
  bucket: string,
  key: string
): Promise<{ name: string; id: string; updated_at: string; metadata: Record<string, any> }> {
  try {
    const { data, error } = await supabase.storage.from(bucket).list(undefined, {
      search: key,
      limit: 1,
    })

    if (error) {
      throw new Error(`Failed to get file metadata: ${error.message}`)
    }

    if (!data || data.length === 0) {
      throw new Error('File not found')
    }

    return data[0]
  } catch (error) {
    console.error('[Storage] Error getting file metadata:', error)
    throw error
  }
}

/**
 * List files in a bucket with optional prefix
 * @param bucket - Storage bucket name
 * @param prefix - Optional path prefix (e.g., 'user-123/')
 * @param limit - Max number of files (default: 100)
 * @returns Promise<array> - Array of file objects
 */
export async function listFiles(
  bucket: string,
  prefix?: string,
  limit: number = 100
): Promise<any[]> {
  try {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      sortBy: { column: 'updated_at', order: 'desc' },
    })

    if (error) {
      throw new Error(`Failed to list files: ${error.message}`)
    }

    return data || []
  } catch (error) {
    console.error('[Storage] Error listing files:', error)
    throw error
  }
}

/**
 * Copy a file from one location to another
 * @param bucket - Storage bucket name
 * @param sourceKey - Source file path
 * @param destKey - Destination file path
 * @returns Promise<void>
 */
export async function copyFile(
  bucket: string,
  sourceKey: string,
  destKey: string
): Promise<void> {
  try {
    // Download source file
    const { data, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(sourceKey)

    if (downloadError) {
      throw new Error(`Failed to download source file: ${downloadError.message}`)
    }

    // Upload to destination
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(destKey, data, { upsert: true })

    if (uploadError) {
      throw new Error(`Failed to upload to destination: ${uploadError.message}`)
    }
  } catch (error) {
    console.error('[Storage] Error copying file:', error)
    throw error
  }
}

/**
 * Move a file (copy then delete source)
 * @param bucket - Storage bucket name
 * @param sourceKey - Source file path
 * @param destKey - Destination file path
 * @returns Promise<void>
 */
export async function moveFile(
  bucket: string,
  sourceKey: string,
  destKey: string
): Promise<void> {
  try {
    await copyFile(bucket, sourceKey, destKey)
    await deleteFile(bucket, sourceKey)
  } catch (error) {
    console.error('[Storage] Error moving file:', error)
    throw error
  }
}

/**
 * Download a file (server-side)
 * @param bucket - Storage bucket name
 * @param key - File path within bucket
 * @returns Promise<Blob> - File blob
 */
export async function downloadFile(bucket: string, key: string): Promise<Blob> {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(key)

    if (error) {
      throw new Error(`Failed to download file: ${error.message}`)
    }

    return data
  } catch (error) {
    console.error('[Storage] Error downloading file:', error)
    throw error
  }
}

/**
 * Check if file exists
 * @param bucket - Storage bucket name
 * @param key - File path within bucket
 * @returns Promise<boolean>
 */
export async function fileExists(bucket: string, key: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage.from(bucket).list()

    if (error) return false

    return data?.some((file) => file.name === key) || false
  } catch {
    return false
  }
}

/**
 * Generate a unique storage key for a file
 * @param userId - User ID
 * @param fileName - Original file name
 * @returns string - Unique storage key
 */
export function generateStorageKey(userId: string, fileName: string): string {
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 8)
  const cleanedName = fileName
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')

  return `${userId}/${timestamp}-${randomId}-${cleanedName}`
}

/**
 * Validate file before upload
 * @param file - File to validate
 * @param allowedMimeTypes - Array of allowed MIME types
 * @param maxSizeBytes - Maximum file size in bytes
 * @returns object - { valid: boolean; error?: string }
 */
export function validateFile(
  file: File,
  allowedMimeTypes: string[] = ['application/pdf', 'application/msword'],
  maxSizeBytes: number = 10 * 1024 * 1024 // 10 MB default
): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds limit of ${Math.round(maxSizeBytes / 1024 / 1024)} MB`,
    }
  }

  // Check MIME type
  if (!allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
    }
  }

  return { valid: true }
}
