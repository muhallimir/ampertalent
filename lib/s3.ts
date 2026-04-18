// Supabase Storage service for secure file upload and management
// Replaces AWS S3 — uses @supabase/supabase-js storage client

import { createClient, SupabaseClient } from '@supabase/supabase-js'

export interface UploadConfig {
  bucket: string
  key: string
  contentType: string
  maxSize?: number
  allowedTypes?: string[]
}

export interface PresignedUrlConfig {
  bucket: string
  key: string
  contentType: string
  expiresIn?: number
}

export interface FileMetadata {
  key: string
  size: number
  contentType: string
  lastModified: Date
  etag: string
  url: string
}

/**
 * Supabase Storage service — drop-in replacement for S3Service.
 * Keeps the same static method interface so all callers work unchanged.
 */
export class S3Service {
  private static _client: SupabaseClient | null = null

  /** Initialize Supabase client with service-role key for server-side ops */
  private static getClient(): SupabaseClient {
    if (!this._client) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!url || !key) {
        throw new Error('Missing Supabase credentials: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
      }
      this._client = createClient(url, key)
      console.log('✅ Supabase Storage: Client initialized successfully')
    }
    return this._client
  }

  /** Build the public URL for a stored object */
  private static buildPublicUrl(bucket: string, key: string): string {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    return `${url}/storage/v1/object/public/${bucket}/${key}`
  }

  /**
   * Generate a presigned upload URL (Supabase: createSignedUploadUrl)
   */
  static async generatePresignedUploadUrl(config: PresignedUrlConfig): Promise<{
    uploadUrl: string
    key: string
    fields: Record<string, string>
  }> {
    try {
      const supabase = this.getClient()
      const { bucket, key, contentType } = config

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUploadUrl(key)

      if (error) throw error

      return {
        uploadUrl: data.signedUrl,
        key,
        fields: { 'Content-Type': contentType }
      }
    } catch (error) {
      console.error('Error generating presigned upload URL:', error)
      throw new Error('Failed to generate upload URL')
    }
  }

  /**
   * Generate a presigned download URL (Supabase: createSignedUrl)
   */
  static async generatePresignedDownloadUrl(
    bucket: string,
    key: string,
    expiresIn: number = 3600,
    _inline: boolean = false
  ): Promise<string> {
    try {
      const supabase = this.getClient()

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(key, expiresIn)

      if (error) throw error
      return data.signedUrl
    } catch (error) {
      console.error('Error generating presigned download URL:', error)
      throw new Error('Failed to generate download URL')
    }
  }

  /**
   * Generate multiple presigned URLs in batch
   */
  static async generateBatchPresignedDownloadUrls(
    bucket: string,
    keys: string[],
    expiresIn: number = 3600
  ): Promise<Record<string, string>> {
    try {
      const supabase = this.getClient()
      const results: Record<string, string> = {}

      const batchSize = 10
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize)
        const batchPromises = batch.map(async (key) => {
          try {
            const { data, error } = await supabase.storage
              .from(bucket)
              .createSignedUrl(key, expiresIn)
            if (error) return { key, url: null }
            return { key, url: data.signedUrl }
          } catch {
            return { key, url: null }
          }
        })

        const batchResults = await Promise.all(batchPromises)
        batchResults.forEach(({ key, url }) => {
          if (url) results[key] = url
        })
      }

      return results
    } catch (error) {
      console.error('Error generating batch presigned download URLs:', error)
      throw new Error('Failed to generate batch download URLs')
    }
  }

  /**
   * Upload file directly (server-side)
   */
  static async uploadFile(
    bucket: string,
    key: string,
    file: Buffer | Uint8Array | string,
    contentType: string,
    _metadata?: Record<string, string>
  ): Promise<{ key: string; url: string }> {
    try {
      const supabase = this.getClient()

      const body = typeof file === 'string' ? Buffer.from(file) : file

      const { error } = await supabase.storage
        .from(bucket)
        .upload(key, body, { contentType, upsert: true })

      if (error) throw error

      const url = this.buildPublicUrl(bucket, key)
      return { key, url }
    } catch (error) {
      console.error('Error uploading file:', error)
      throw new Error('Failed to upload file')
    }
  }

  /**
   * Delete file from Supabase Storage
   */
  static async deleteFile(bucket: string, key: string): Promise<void> {
    try {
      const supabase = this.getClient()
      const { error } = await supabase.storage.from(bucket).remove([key])
      if (error) throw error
    } catch (error) {
      console.error('Error deleting file:', error)
      throw new Error('Failed to delete file')
    }
  }

  /**
   * Get file metadata (Supabase: list with search)
   */
  static async getFileMetadata(bucket: string, key: string): Promise<FileMetadata> {
    try {
      console.log(`📊 Storage: Getting metadata for: ${bucket}/${key}`)
      const supabase = this.getClient()

      // Split key into folder prefix and filename
      const lastSlash = key.lastIndexOf('/')
      const prefix = lastSlash >= 0 ? key.substring(0, lastSlash) : ''
      const filename = lastSlash >= 0 ? key.substring(lastSlash + 1) : key

      const { data, error } = await supabase.storage
        .from(bucket)
        .list(prefix, { search: filename })

      if (error) throw error

      const fileInfo = data?.find((f) => f.name === filename)
      if (!fileInfo) throw new Error(`File not found: ${key}`)

      return {
        key,
        size: fileInfo.metadata?.size || 0,
        contentType: fileInfo.metadata?.mimetype || 'application/octet-stream',
        lastModified: fileInfo.updated_at ? new Date(fileInfo.updated_at) : new Date(),
        etag: fileInfo.id || '',
        url: this.buildPublicUrl(bucket, key)
      }
    } catch (error) {
      console.error(`❌ Storage: Error getting file metadata for ${bucket}/${key}:`, error)
      throw new Error(`Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * List files in a bucket with prefix
   */
  static async listFiles(
    bucket: string,
    prefix?: string,
    maxKeys: number = 1000
  ): Promise<FileMetadata[]> {
    try {
      const supabase = this.getClient()

      const { data, error } = await supabase.storage
        .from(bucket)
        .list(prefix || '', { limit: maxKeys })

      if (error) throw error

      return (data || []).map((file) => ({
        key: prefix ? `${prefix}/${file.name}` : file.name,
        size: file.metadata?.size || 0,
        contentType: file.metadata?.mimetype || 'application/octet-stream',
        lastModified: file.updated_at ? new Date(file.updated_at) : new Date(),
        etag: file.id || '',
        url: this.buildPublicUrl(bucket, prefix ? `${prefix}/${file.name}` : file.name)
      }))
    } catch (error) {
      console.error('Error listing files:', error)
      throw new Error('Failed to list files')
    }
  }

  /**
   * Check if file exists
   */
  static async fileExists(bucket: string, key: string): Promise<boolean> {
    try {
      await this.getFileMetadata(bucket, key)
      return true
    } catch {
      return false
    }
  }

  /**
   * Copy file within Supabase Storage (download + re-upload)
   */
  static async copyFile(
    sourceBucket: string,
    sourceKey: string,
    destinationBucket: string,
    destinationKey: string
  ): Promise<{ key: string; url: string }> {
    try {
      const supabase = this.getClient()

      // Download source
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(sourceBucket)
        .download(sourceKey)

      if (downloadError) throw downloadError

      const buffer = Buffer.from(await fileData.arrayBuffer())

      // Upload to destination
      const { error: uploadError } = await supabase.storage
        .from(destinationBucket)
        .upload(destinationKey, buffer, { upsert: true })

      if (uploadError) throw uploadError

      const url = this.buildPublicUrl(destinationBucket, destinationKey)
      return { key: destinationKey, url }
    } catch (error) {
      console.error('Error copying file:', error)
      throw new Error('Failed to copy file')
    }
  }

  /**
   * Generate unique file key with timestamp and random suffix
   */
  static generateFileKey(
    userId: string,
    fileType: 'resume' | 'logo' | 'document' | 'image' | 'avatar',
    originalFilename: string
  ): string {
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const sanitizedFilename = originalFilename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 50)

    return `${fileType}s/${userId}/${timestamp}_${randomSuffix}_${sanitizedFilename}`
  }

  /**
   * Get file URL (public)
   */
  static getFileUrl(bucket: string, key: string, _isPublic: boolean = false): string {
    return this.buildPublicUrl(bucket, key)
  }

  /**
   * Validate file before upload
   */
  static validateFile(
    file: File,
    allowedTypes: string[],
    maxSize: number
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (file.size > maxSize) {
      errors.push(`File size must be less than ${this.formatFileSize(maxSize)}`)
    }

    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`)
    }

    if (file.name.length > 255) {
      errors.push('File name is too long (max 255 characters)')
    }

    return { isValid: errors.length === 0, errors }
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  static getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      rtf: 'application/rtf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      zip: 'application/zip',
      csv: 'text/csv',
      json: 'application/json',
    }
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream'
  }

  static async cleanupOldFiles(
    bucket: string,
    prefix: string,
    olderThanDays: number
  ): Promise<{ deletedCount: number; errors: string[] }> {
    try {
      const files = await this.listFiles(bucket, prefix)
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)

      let deletedCount = 0
      const errors: string[] = []

      for (const file of files) {
        if (file.lastModified < cutoffDate) {
          try {
            await this.deleteFile(bucket, file.key)
            deletedCount++
          } catch (error) {
            errors.push(`Failed to delete ${file.key}: ${error}`)
          }
        }
      }

      return { deletedCount, errors }
    } catch (error) {
      console.error('Error cleaning up old files:', error)
      throw new Error('Failed to cleanup old files')
    }
  }

  static async getStorageStats(bucket: string, prefix?: string): Promise<{
    totalFiles: number
    totalSize: number
    averageSize: number
    oldestFile: Date | null
    newestFile: Date | null
  }> {
    try {
      const files = await this.listFiles(bucket, prefix)

      if (files.length === 0) {
        return { totalFiles: 0, totalSize: 0, averageSize: 0, oldestFile: null, newestFile: null }
      }

      const totalSize = files.reduce((sum, file) => sum + file.size, 0)
      const dates = files.map((file) => file.lastModified)

      return {
        totalFiles: files.length,
        totalSize,
        averageSize: totalSize / files.length,
        oldestFile: new Date(Math.min(...dates.map((d) => d.getTime()))),
        newestFile: new Date(Math.max(...dates.map((d) => d.getTime())))
      }
    } catch (error) {
      console.error('Error getting storage stats:', error)
      throw new Error('Failed to get storage statistics')
    }
  }
}

// File type configurations — bucket now points to Supabase bucket name
export const FILE_CONFIGS = {
  resume: {
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    maxSize: 5 * 1024 * 1024, // 5MB
    bucket: process.env.SUPABASE_STORAGE_BUCKET || 'ampertalent-files'
  },
  logo: {
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 2 * 1024 * 1024, // 2MB
    bucket: process.env.SUPABASE_STORAGE_BUCKET || 'ampertalent-files'
  },
  document: {
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf'
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
    bucket: process.env.SUPABASE_STORAGE_BUCKET || 'ampertalent-files'
  },
  image: {
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    maxSize: 5 * 1024 * 1024, // 5MB
    bucket: process.env.SUPABASE_STORAGE_BUCKET || 'ampertalent-files'
  },
  avatar: {
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
    bucket: process.env.SUPABASE_STORAGE_BUCKET || 'ampertalent-files'
  }
}
