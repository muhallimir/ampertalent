// Resume upload utility for S3 integration (client-side safe)

import { S3Service, FILE_CONFIGS } from '@/lib/s3'

export interface ResumeUploadResult {
  key: string
  url: string
  fileName: string
  fileSize: number
  contentType: string
}

/**
 * Upload resume to S3 via API route
 */
export async function uploadResumeWithoutDebitCredits(
  file: File,
  seekerId: string,
  userId: string
): Promise<ResumeUploadResult> {
  try {
    // Validate file first
    const { isValid, errors } = S3Service.validateFile(
      file,
      FILE_CONFIGS.resume.allowedTypes,
      FILE_CONFIGS.resume.maxSize
    )

    if (!isValid) {
      throw new Error(`Invalid file: ${errors.join(', ')}`)
    }

    // Create FormData
    const formData = new FormData()
    formData.append('file', file)
    formData.append('seekerId', seekerId)
    formData.append('userId', userId)

    // Upload via API route
    const response = await fetch('/api/resume/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to upload resume')
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error uploading resume:', error)
    throw new Error(`Failed to upload resume: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Set resume as primary for a job seeker via API route
 */
export async function setPrimaryResume(
  resumeId: string,
  seekerId: string
): Promise<void> {
  try {
    const response = await fetch('/api/resume/primary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resumeId, seekerId }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to set primary resume')
    }
  } catch (error) {
    console.error('Error setting primary resume:', error)
    throw new Error(`Failed to set primary resume: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get primary resume for a job seeker via API route
 */
export async function getPrimaryResume(seekerId: string) {
  try {
    const response = await fetch(`/api/resume/primary-get?seekerId=${seekerId}`)
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to get primary resume')
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting primary resume:', error)
    throw new Error(`Failed to get primary resume: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get all resumes for a job seeker via API route
 */
export async function getResumesForSeeker(seekerId: string) {
  try {
    const response = await fetch(`/api/resume/list?seekerId=${seekerId}`)
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to get resumes')
    }

    return await response.json()
  } catch (error) {
    console.error('Error getting resumes:', error)
    throw new Error(`Failed to get resumes: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
