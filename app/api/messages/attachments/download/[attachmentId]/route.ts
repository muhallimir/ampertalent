import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { S3Service } from '@/lib/s3'
import { db } from '@/lib/db'

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'ampertalent-files'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ attachmentId: string }> }
) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const { attachmentId } = await params

        const attachment = await db.messageAttachment.findUnique({
            where: { id: attachmentId },
            select: {
                id: true, fileName: true, fileUrl: true, fileType: true, fileSize: true,
                message: {
                    select: {
                        id: true, senderId: true, recipientId: true,
                        thread: { select: { id: true, participants: true } },
                    },
                },
            },
        })

        if (!attachment) {
            return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
        }

        const thread = attachment.message.thread
        if (!thread.participants.includes(currentUser.profile.id)) {
            return NextResponse.json({ error: 'You do not have access to this attachment' }, { status: 403 })
        }

        // Extract the Supabase storage key from the URL
        const fileUrl = attachment.fileUrl
        let fileKey = fileUrl

        // Handle Supabase public URL format: .../storage/v1/object/public/{bucket}/{key}
        const supabasePublicMatch = fileUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/)
        if (supabasePublicMatch) {
            fileKey = supabasePublicMatch[1]
        } else {
            // Fallback: extract key from last parts of URL
            const urlParts = fileUrl.split('/').filter(Boolean)
            fileKey = urlParts.slice(-3).join('/')
        }

        const fileExtension = attachment.fileName.split('.').pop()?.toLowerCase()
        const isPDF = fileExtension === 'pdf' || attachment.fileType === 'application/pdf'

        const downloadUrl = await S3Service.generatePresignedDownloadUrl(
            BUCKET_NAME,
            fileKey,
            3600,
            isPDF
        )

        return NextResponse.json({
            success: true, downloadUrl, fileName: attachment.fileName,
            fileType: attachment.fileType, fileSize: attachment.fileSize, expiresIn: 3600,
        })
    } catch (error) {
        console.error('Error generating attachment download URL:', error)
        return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
    }
}
