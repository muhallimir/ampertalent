import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { messageId, fileName, fileUrl, fileType, fileSize, mimeType } = await request.json()

        if (!messageId || !fileName || !fileUrl || !fileType || !fileSize) {
            return NextResponse.json({ error: 'Missing required fields: messageId, fileName, fileUrl, fileType, fileSize' }, { status: 400 })
        }

        const message = await db.message.findUnique({
            where: { id: messageId },
            select: { id: true, senderId: true, recipientId: true },
        })

        if (!message) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 })
        }

        if (message.senderId !== currentUser.profile.id) {
            return NextResponse.json({ error: 'You can only add attachments to your own messages' }, { status: 403 })
        }

        const attachment = await db.messageAttachment.create({
            data: { messageId, fileName, fileUrl, fileType, fileSize, mimeType },
        })

        return NextResponse.json({
            success: true,
            attachment: {
                id: attachment.id, fileName: attachment.fileName, fileUrl: attachment.fileUrl,
                fileType: attachment.fileType, fileSize: attachment.fileSize, mimeType: attachment.mimeType,
                createdAt: attachment.createdAt,
            },
        })
    } catch (error) {
        console.error('Error creating message attachment:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
