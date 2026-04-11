// File validation utilities for secure file uploads

export interface FileValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface FileValidationConfig {
  allowedTypes: string[]
  maxSize: number
  minSize?: number
  allowedExtensions?: string[]
  requireExtension?: boolean
  scanForMalware?: boolean
}

/**
 * Comprehensive file validation service
 */
export class FileValidationService {
  /**
   * Validate file against configuration
   */
  static validateFile(file: File, config: FileValidationConfig): FileValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Basic file checks
    if (!file) {
      errors.push('No file provided')
      return { isValid: false, errors, warnings }
    }

    // File size validation
    if (file.size > config.maxSize) {
      errors.push(`File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(config.maxSize)})`)
    }

    if (config.minSize && file.size < config.minSize) {
      errors.push(`File size (${this.formatFileSize(file.size)}) is below minimum required size (${this.formatFileSize(config.minSize)})`)
    }

    // Empty file check
    if (file.size === 0) {
      errors.push('File is empty')
    }

    // MIME type validation
    if (!config.allowedTypes.includes(file.type)) {
      errors.push(`File type "${file.type}" is not allowed. Allowed types: ${config.allowedTypes.join(', ')}`)
    }

    // File extension validation
    const extension = this.getFileExtension(file.name)
    if (config.allowedExtensions && !config.allowedExtensions.includes(extension)) {
      errors.push(`File extension ".${extension}" is not allowed. Allowed extensions: ${config.allowedExtensions.map(ext => `.${ext}`).join(', ')}`)
    }

    if (config.requireExtension && !extension) {
      errors.push('File must have a valid extension')
    }

    // Filename validation
    if (file.name.length > 255) {
      errors.push('Filename is too long (maximum 255 characters)')
    }

    if (file.name.length < 1) {
      errors.push('Filename cannot be empty')
    }

    // Check for dangerous characters in filename
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/
    if (dangerousChars.test(file.name)) {
      errors.push('Filename contains invalid characters')
    }

    // Check for reserved filenames (Windows)
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
    const nameWithoutExt = file.name.split('.')[0].toUpperCase()
    if (reservedNames.includes(nameWithoutExt)) {
      errors.push('Filename uses a reserved system name')
    }

    // MIME type and extension mismatch check
    const expectedMimeType = this.getMimeTypeFromExtension(extension)
    if (expectedMimeType && file.type !== expectedMimeType) {
      warnings.push(`File extension suggests "${expectedMimeType}" but file type is "${file.type}"`)
    }

    // Additional security checks
    this.performSecurityChecks(file, errors, warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validate multiple files
   */
  static validateFiles(files: File[], config: FileValidationConfig): {
    results: Array<FileValidationResult & { filename: string }>
    overallValid: boolean
  } {
    const results = files.map(file => ({
      filename: file.name,
      ...this.validateFile(file, config)
    }))

    return {
      results,
      overallValid: results.every(result => result.isValid)
    }
  }

  /**
   * Perform additional security checks
   */
  private static performSecurityChecks(file: File, errors: string[], warnings: string[]): void {
    // Check for double extensions (potential security risk)
    const parts = file.name.split('.')
    if (parts.length > 2) {
      const suspiciousExtensions = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js']
      for (let i = 1; i < parts.length - 1; i++) {
        if (suspiciousExtensions.includes(parts[i].toLowerCase())) {
          warnings.push('File has suspicious double extension')
          break
        }
      }
    }

    // Check for executable file disguised as document
    // Note: In a real implementation, you would read the file header
    // This is a placeholder for demonstration
    if (file.name.toLowerCase().includes('.exe') && file.type !== 'application/x-msdownload') {
      warnings.push('File may be an executable disguised as another file type')
    }
  }

  /**
   * Get file extension from filename
   */
  static getFileExtension(filename: string): string {
    const parts = filename.split('.')
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
  }

  /**
   * Get expected MIME type from file extension
   */
  static getMimeTypeFromExtension(extension: string): string | null {
    const mimeTypes: Record<string, string> = {
      // Documents
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'txt': 'text/plain',
      'rtf': 'application/rtf',
      'odt': 'application/vnd.oasis.opendocument.text',
      
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'bmp': 'image/bmp',
      'tiff': 'image/tiff',
      'ico': 'image/x-icon',
      
      // Archives
      'zip': 'application/zip',
      'rar': 'application/vnd.rar',
      '7z': 'application/x-7z-compressed',
      'tar': 'application/x-tar',
      'gz': 'application/gzip',
      
      // Spreadsheets
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'csv': 'text/csv',
      'ods': 'application/vnd.oasis.opendocument.spreadsheet',
      
      // Presentations
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'odp': 'application/vnd.oasis.opendocument.presentation',
      
      // Audio
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'flac': 'audio/flac',
      
      // Video
      'mp4': 'video/mp4',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'wmv': 'video/x-ms-wmv',
      'webm': 'video/webm',
      
      // Other
      'json': 'application/json',
      'xml': 'application/xml',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
    }

    return mimeTypes[extension.toLowerCase()] || null
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Sanitize filename for safe storage
   */
  static sanitizeFilename(filename: string): string {
    // Remove or replace dangerous characters
    let sanitized = filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Replace dangerous chars with underscore
      .replace(/\s+/g, '_') // Replace spaces with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores

    // Ensure filename is not empty
    if (!sanitized) {
      sanitized = 'file'
    }

    // Limit length
    if (sanitized.length > 200) {
      const extension = this.getFileExtension(sanitized)
      const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'))
      sanitized = nameWithoutExt.substring(0, 200 - extension.length - 1) + '.' + extension
    }

    return sanitized
  }

  /**
   * Generate unique filename with timestamp
   */
  static generateUniqueFilename(originalFilename: string, userId?: string): string {
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const extension = this.getFileExtension(originalFilename)
    const nameWithoutExt = originalFilename.substring(0, originalFilename.lastIndexOf('.'))
    const sanitizedName = this.sanitizeFilename(nameWithoutExt)

    let uniqueName = `${timestamp}_${randomSuffix}_${sanitizedName}`
    
    if (userId) {
      uniqueName = `${userId}_${uniqueName}`
    }

    return extension ? `${uniqueName}.${extension}` : uniqueName
  }

  /**
   * Check if file type is image
   */
  static isImageFile(file: File): boolean {
    return file.type.startsWith('image/')
  }

  /**
   * Check if file type is document
   */
  static isDocumentFile(file: File): boolean {
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf'
    ]
    return documentTypes.includes(file.type)
  }

  /**
   * Get file validation config for specific file types
   */
  static getValidationConfig(fileType: 'resume' | 'logo' | 'document' | 'image'): FileValidationConfig {
    const configs: Record<string, FileValidationConfig> = {
      resume: {
        allowedTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        allowedExtensions: ['pdf', 'doc', 'docx'],
        maxSize: 5 * 1024 * 1024, // 5MB
        minSize: 1024, // 1KB
        requireExtension: true
      },
      logo: {
        allowedTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp'
        ],
        allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        maxSize: 2 * 1024 * 1024, // 2MB
        minSize: 1024, // 1KB
        requireExtension: true
      },
      document: {
        allowedTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'application/rtf'
        ],
        allowedExtensions: ['pdf', 'doc', 'docx', 'txt', 'rtf'],
        maxSize: 10 * 1024 * 1024, // 10MB
        minSize: 1024, // 1KB
        requireExtension: true
      },
      image: {
        allowedTypes: [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml'
        ],
        allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
        maxSize: 5 * 1024 * 1024, // 5MB
        minSize: 1024, // 1KB
        requireExtension: true
      }
    }

    return configs[fileType]
  }

  /**
   * Validate file content (basic header check)
   */
  static async validateFileContent(file: File): Promise<{
    isValid: boolean
    detectedType: string | null
    errors: string[]
  }> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      const errors: string[] = []

      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer
        const bytes = new Uint8Array(arrayBuffer.slice(0, 16)) // Read first 16 bytes

        let detectedType: string | null = null

        // Check file signatures (magic numbers)
        if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
          detectedType = 'application/pdf'
        } else if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
          detectedType = 'image/jpeg'
        } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
          detectedType = 'image/png'
        } else if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
          detectedType = 'image/gif'
        } else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
          detectedType = 'image/webp'
        } else if (bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0) {
          detectedType = 'application/msword' // or other MS Office formats
        }

        // Compare detected type with declared type
        if (detectedType && detectedType !== file.type) {
          errors.push(`File content suggests "${detectedType}" but declared type is "${file.type}"`)
        }

        resolve({
          isValid: errors.length === 0,
          detectedType,
          errors
        })
      }

      reader.onerror = () => {
        resolve({
          isValid: false,
          detectedType: null,
          errors: ['Failed to read file content']
        })
      }

      // Read first 16 bytes for signature check
      reader.readAsArrayBuffer(file.slice(0, 16))
    })
  }
}