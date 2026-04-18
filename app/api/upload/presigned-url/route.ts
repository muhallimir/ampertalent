import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'hire-my-mom-files'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp'
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { fileName, fileType, fileSize, uploadType = 'resume' } = body

    // Validate required fields
    if (!fileName || !fileType || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, fileType, fileSize' },
        { status: 400 }
      )
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES[fileType as keyof typeof ALLOWED_FILE_TYPES]) {
      return NextResponse.json(
        { error: `File type ${fileType} is not allowed. Allowed types: ${Object.keys(ALLOWED_FILE_TYPES).join(', ')}` },
        { status: 400 }
      )
    }

    // Generate unique file key
    const uniqueId = randomUUID()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileKey = `${uploadType}s/${currentUser.profile.id}/${uniqueId}-${sanitizedFileName}`

    // Create Supabase signed upload URL
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(fileKey)

    if (error) throw error

    const uploadUrl = data.signedUrl
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const fileUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${fileKey}`
    const uploadId = randomUUID()

    return NextResponse.json({
      uploadUrl,
      fileUrl,
      uploadId,
      fileKey,
      expiresIn: 3600,
      maxSize: MAX_FILE_SIZE,
      allowedTypes: Object.keys(ALLOWED_FILE_TYPES)
    })

  } catch (error) {
    console.error('Error generating presigned URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    )
  }
}