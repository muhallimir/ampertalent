/**
 * Generate Presigned Upload URL - POST /api/upload/presigned-url
 * Allows seekers to get presigned URLs for uploading resumes to Supabase Storage
 */

import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { generatePresignedUploadUrl, generateStorageKey } = await import('@/lib/storage')

    const currentUser = await getCurrentUser(request)

    if (!currentUser || !currentUser.profile?.jobSeeker) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = currentUser.profile.userId
    const { fileName, fileType } = await request.json()

    // Validate required fields
    if (!fileName || !fileType) {
      return Response.json(
        { error: 'fileName and fileType are required' },
        { status: 400 }
      )
    }

    // Validate file type (allow PDF, DOC, DOCX)
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]

    if (!allowedMimeTypes.includes(fileType)) {
      return Response.json(
        {
          error: 'Invalid file type. Allowed types: PDF, DOC, DOCX',
          allowedTypes: allowedMimeTypes,
        },
        { status: 400 }
      )
    }

    // Generate unique storage key
    const storageKey = generateStorageKey(userId, fileName)

    // Generate presigned URL (1 hour expiration)
    const uploadUrl = await generatePresignedUploadUrl(
      'resumes',
      storageKey,
      3600
    )

    return Response.json({
      uploadUrl,
      storageKey,
      bucket: 'resumes',
      expiresIn: 3600,
      fileType,
      fileName,
    })
  } catch (error) {
    console.error('[POST /api/upload/presigned-url]:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
