import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'ampertalent-files'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
]

function getFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.includes('pdf')) return 'document'
    if (mimeType.includes('word') || mimeType.includes('text')) return 'document'
    if (mimeType.includes('excel') || mimeType.includes('sheet') || mimeType.includes('csv')) return 'spreadsheet'
    return 'file'
}

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB` }, { status: 400 })
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'File type not allowed. Supported types: images, PDFs, Word documents, Excel files, text files' }, { status: 400 })
        }

        const timestamp = Date.now()
        const randomId = Math.random().toString(36).substring(2, 15)
        const fileExtension = file.name.split('.').pop()
        const key = `messages/${currentUser.profile.id}/${timestamp}-${randomId}.${fileExtension}`

        const buffer = Buffer.from(await file.arrayBuffer())
        const supabase = getSupabaseAdmin()

        const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(key, buffer, {
            contentType: file.type,
            upsert: true,
        })

        if (uploadError) throw uploadError

        const fileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${key}`

        return NextResponse.json({
            success: true,
            attachment: { fileName: file.name, fileUrl, fileType: getFileType(file.type), fileSize: file.size, mimeType: file.type, s3Key: key },
        })
    } catch (error) {
        console.error('Error uploading file:', error)
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const fileName = searchParams.get('fileName')
        const fileType = searchParams.get('fileType')

        if (!fileName || !fileType) {
            return NextResponse.json({ error: 'fileName and fileType are required' }, { status: 400 })
        }

        if (!ALLOWED_TYPES.includes(fileType)) {
            return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
        }

        const timestamp = Date.now()
        const randomId = Math.random().toString(36).substring(2, 15)
        const fileExtension = fileName.split('.').pop()
        const key = `messages/${currentUser.profile.id}/${timestamp}-${randomId}.${fileExtension}`

        const supabase = getSupabaseAdmin()
        const { data, error } = await supabase.storage.from(BUCKET_NAME).createSignedUploadUrl(key)

        if (error || !data) throw error

        const fileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${key}`

        return NextResponse.json({
            success: true, presignedUrl: data.signedUrl, fileUrl, fileName, fileType: getFileType(fileType), s3Key: key,
        })
    } catch (error) {
        console.error('Error generating presigned URL:', error)
        return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
    }
}
