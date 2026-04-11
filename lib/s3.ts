// AWS S3 service for secure file upload and management

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

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
 * AWS S3 service for file upload, download, and management
 */
export class S3Service {
  private static client: S3Client | null = null

  /**
   * Initialize S3 client with configuration
   */
  private static getClient(): S3Client {
    if (!this.client) {
      const region = process.env.AWS_REGION || 'us-east-2'
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
      
      console.log('🔧 S3: Initializing client with config:', {
        region,
        hasAccessKeyId: !!accessKeyId,
        hasSecretAccessKey: !!secretAccessKey,
        accessKeyIdLength: accessKeyId?.length || 0
      })
      
      if (!accessKeyId || !secretAccessKey) {
        throw new Error('Missing AWS credentials: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required')
      }
      
      this.client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })
      
      console.log('✅ S3: Client initialized successfully')
    }
    return this.client
  }

  /**
   * Generate presigned URL for secure file upload
   */
  static async generatePresignedUploadUrl(config: PresignedUrlConfig): Promise<{
    uploadUrl: string
    key: string
    fields: Record<string, string>
  }> {
    try {
      const client = this.getClient()
      const { bucket, key, contentType, expiresIn = 3600 } = config

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
      })

      const uploadUrl = await getSignedUrl(client, command, { expiresIn })

      return {
        uploadUrl,
        key,
        fields: {
          'Content-Type': contentType,
        }
      }
    } catch (error) {
      console.error('Error generating presigned upload URL:', error)
      throw new Error('Failed to generate upload URL')
    }
  }

  /**
   * Generate presigned URL for secure file download
   */
  static async generatePresignedDownloadUrl(
    bucket: string,
    key: string,
    expiresIn: number = 3600,
    inline: boolean = false
  ): Promise<string> {
    try {
      const client = this.getClient()

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ...(inline && { ResponseContentDisposition: 'inline' })
      })

      return await getSignedUrl(client, command, { expiresIn })
    } catch (error) {
      console.error('Error generating presigned download URL:', error)
      throw new Error('Failed to generate download URL')
    }
  }

  /**
   * Generate multiple presigned URLs in batch for better performance
   */
  static async generateBatchPresignedDownloadUrls(
    bucket: string,
    keys: string[],
    expiresIn: number = 3600
  ): Promise<Record<string, string>> {
    try {
      const client = this.getClient()
      const results: Record<string, string> = {}

      // Process in parallel but limit concurrency to avoid overwhelming S3
      const batchSize = 10
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize)
        const batchPromises = batch.map(async (key) => {
          try {
            const command = new GetObjectCommand({
              Bucket: bucket,
              Key: key,
            })
            const url = await getSignedUrl(client, command, { expiresIn })
            return { key, url }
          } catch (error) {
            console.error(`Error generating presigned URL for key ${key}:`, error)
            return { key, url: null }
          }
        })

        const batchResults = await Promise.all(batchPromises)
        batchResults.forEach(({ key, url }) => {
          if (url) {
            results[key] = url
          }
        })
      }

      return results
    } catch (error) {
      console.error('Error generating batch presigned download URLs:', error)
      throw new Error('Failed to generate batch download URLs')
    }
  }

  /**
   * Upload file directly to S3 (server-side)
   */
  static async uploadFile(
    bucket: string,
    key: string,
    file: Buffer | Uint8Array | string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<{ key: string; url: string }> {
    try {
      const client = this.getClient()

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: metadata,
      })

      await client.send(command)

      const url = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`

      return { key, url }
    } catch (error) {
      console.error('Error uploading file to S3:', error)
      throw new Error('Failed to upload file')
    }
  }

  /**
   * Delete file from S3
   */
  static async deleteFile(bucket: string, key: string): Promise<void> {
    try {
      const client = this.getClient()

      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })

      await client.send(command)
    } catch (error) {
      console.error('Error deleting file from S3:', error)
      throw new Error('Failed to delete file')
    }
  }

  /**
   * Get file metadata
   */
  static async getFileMetadata(bucket: string, key: string): Promise<FileMetadata> {
    try {
      console.log(`📊 S3: Getting metadata for: ${bucket}/${key}`)
      const client = this.getClient()

      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      })

      const response = await client.send(command)
      
      const metadata = {
        key,
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified || new Date(),
        etag: response.ETag || '',
        url: `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
      }
      
      console.log(`✅ S3: Metadata retrieved:`, {
        size: metadata.size,
        contentType: metadata.contentType,
        lastModified: metadata.lastModified
      })

      return metadata
    } catch (error) {
      console.error(`❌ S3: Error getting file metadata for ${bucket}/${key}:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        code: error instanceof Error && 'code' in error ? error.code : undefined,
        statusCode: error instanceof Error && 'statusCode' in error ? error.statusCode : undefined
      })
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
      const client = this.getClient()

      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
      })

      const response = await client.send(command)

      return (response.Contents || []).map((object) => ({
        key: object.Key || '',
        size: object.Size || 0,
        contentType: 'application/octet-stream', // S3 doesn't return content type in list
        lastModified: object.LastModified || new Date(),
        etag: object.ETag || '',
        url: `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${object.Key}`
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
      console.log(`🔍 S3: Checking if file exists: ${bucket}/${key}`)
      await this.getFileMetadata(bucket, key)
      console.log(`✅ S3: File exists: ${bucket}/${key}`)
      return true
    } catch (error) {
      console.log(`❌ S3: File does not exist or error checking: ${bucket}/${key}`, {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  /**
   * Copy file within S3
   */
  static async copyFile(
    sourceBucket: string,
    sourceKey: string,
    destinationBucket: string,
    destinationKey: string
  ): Promise<{ key: string; url: string }> {
    try {
      const client = this.getClient()

      const command = new CopyObjectCommand({
        Bucket: destinationBucket,
        Key: destinationKey,
        CopySource: `${sourceBucket}/${sourceKey}`,
      })

      await client.send(command)

      const url = `https://${destinationBucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${destinationKey}`

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
   * Get file URL (public or presigned based on bucket configuration)
   */
  static getFileUrl(bucket: string, key: string, isPublic: boolean = false): string {
    if (isPublic) {
      return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
    }
    // For private files, you would generate a presigned URL
    // This is a placeholder - in practice, you'd call generatePresignedDownloadUrl
    return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
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

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${this.formatFileSize(maxSize)}`)
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`)
    }

    // Check file name
    if (file.name.length > 255) {
      errors.push('File name is too long (max 255 characters)')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Get file extension from filename
   */
  static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  /**
   * Get MIME type from file extension
   */
  static getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
      'rtf': 'application/rtf',
      
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      
      // Other
      'zip': 'application/zip',
      'csv': 'text/csv',
      'json': 'application/json',
    }

    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream'
  }

  /**
   * Clean up old files (for maintenance)
   */
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

  /**
   * Get storage usage statistics
   */
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
        return {
          totalFiles: 0,
          totalSize: 0,
          averageSize: 0,
          oldestFile: null,
          newestFile: null
        }
      }

      const totalSize = files.reduce((sum, file) => sum + file.size, 0)
      const dates = files.map(file => file.lastModified)
      
      return {
        totalFiles: files.length,
        totalSize,
        averageSize: totalSize / files.length,
        oldestFile: new Date(Math.min(...dates.map(d => d.getTime()))),
        newestFile: new Date(Math.max(...dates.map(d => d.getTime())))
      }
    } catch (error) {
      console.error('Error getting storage stats:', error)
      throw new Error('Failed to get storage statistics')
    }
  }
}

// File type configurations
export const FILE_CONFIGS = {
  resume: {
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    maxSize: 5 * 1024 * 1024, // 5MB
    bucket: process.env.AWS_S3_BUCKET || 'amper-talent-files'
  },
  logo: {
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ],
    maxSize: 2 * 1024 * 1024, // 2MB
    bucket: process.env.AWS_S3_BUCKET || 'amper-talent-files'
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
    bucket: process.env.AWS_S3_BUCKET || 'amper-talent-files'
  },
  image: {
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ],
    maxSize: 5 * 1024 * 1024, // 5MB
    bucket: process.env.AWS_S3_BUCKET || 'amper-talent-files'
  },
  avatar: {
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ],
    maxSize: 5 * 1024 * 1024, // 5MB
    bucket: process.env.AWS_S3_BUCKET || 'amper-talent-files'
  }
}