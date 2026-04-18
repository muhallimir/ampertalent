import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { connectionsStore } from '@/lib/connections-store'
import { socketIOService } from '@/lib/socket-io-service'
import { S3Service } from '@/lib/s3'
import { presignedUrlCache } from '@/lib/presigned-url-cache'

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'ampertalent-files'

async function generatePresignedUrl(s3Key: string, isProfilePicture: boolean = false): Promise<string | null> {
    if (!s3Key) return null
    const cached = presignedUrlCache.get(s3Key)
    if (cached) return cached

    try {
        let fileKey = s3Key
        if (isProfilePicture) {
            const url = new URL(s3Key)
            const pathParts = url.pathname.split('/').filter(Boolean)
            fileKey = pathParts.slice(-3).join('/')
        }
        const presignedUrl = await S3Service.generatePresignedDownloadUrl(BUCKET_NAME, fileKey, 24 * 60 * 60)
        presignedUrlCache.set(s3Key, presignedUrl, 23 * 60 * 60)
        return presignedUrl
    } catch (error) {
        console.error('Error generating presigned URL:', error)
        return null
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ threadId: string }> }
) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { threadId } = await params
        const body = await request.json()
        const { content, templateId, attachments } = body

        if (!content || typeof content !== 'string' || !content.trim()) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 })
        }

        if (content.length > 5000) {
            return NextResponse.json({ error: 'Content must be 5000 characters or less' }, { status: 400 })
        }

        const thread = await db.messageThread.findUnique({
            where: { id: threadId },
            select: { id: true, participants: true },
        })

        if (!thread) {
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
        }

        if (!thread.participants.includes(currentUser.profile.id)) {
            return NextResponse.json({ error: 'You do not have access to this thread' }, { status: 403 })
        }

        const recipientId = thread.participants.find(id => id !== currentUser.profile.id)
        if (!recipientId) {
            return NextResponse.json({ error: 'Cannot determine recipient for this thread' }, { status: 400 })
        }

        const [createdMessage] = await db.$transaction([
            db.message.create({
                data: {
                    senderId: currentUser.profile.id,
                    recipientId,
                    content: content.trim(),
                    threadId,
                    deliveryStatus: 'sent',
                },
            }),
            db.messageThread.update({
                where: { id: threadId },
                data: { lastMessageAt: new Date() },
            }),
        ])

        const [attachmentsCreated, sender] = await Promise.all([
            attachments && Array.isArray(attachments) && attachments.length > 0
                ? db.messageAttachment.createMany({
                    data: attachments.map((att: any) => ({
                        messageId: createdMessage.id,
                        fileName: att.fileName, fileUrl: att.fileUrl,
                        fileType: att.fileType, fileSize: att.fileSize, mimeType: att.mimeType,
                    })),
                }).then(() => db.messageAttachment.findMany({
                    where: { messageId: createdMessage.id },
                    select: { id: true, fileName: true, fileUrl: true, fileType: true, fileSize: true, mimeType: true, createdAt: true },
                }))
                : Promise.resolve([]),
            db.userProfile.findUnique({
                where: { id: currentUser.profile.id },
                select: {
                    id: true, name: true, firstName: true, lastName: true, profilePictureUrl: true,
                    employer: { select: { companyName: true } },
                },
            }),
        ])

        const attachmentUrls = attachmentsCreated.map(att => att.fileUrl)
        const [presignedAttachmentMap, presignedAvatar] = await Promise.all([
            Promise.all(attachmentUrls.map(async url => {
                const presigned = await generatePresignedUrl(url, false)
                return [url, presigned || url] as const
            })).then(results => new Map(results)),
            generatePresignedUrl(sender?.profilePictureUrl || '', true),
        ])

        const messageForClient = {
            id: createdMessage.id,
            threadId,
            recipientId: createdMessage.recipientId,
            senderId: createdMessage.senderId,
            content: createdMessage.content,
            isRead: createdMessage.isRead,
            deliveryStatus: createdMessage.deliveryStatus,
            createdAt: createdMessage.createdAt.toISOString(),
            attachments: attachmentsCreated.map(att => ({
                ...att,
                fileUrl: presignedAttachmentMap.get(att.fileUrl) || att.fileUrl,
                createdAt: att.createdAt?.toISOString(),
            })),
            sender: {
                id: sender?.id || '',
                name: sender?.name || `${sender?.firstName || ''} ${sender?.lastName || ''}`.trim(),
                firstName: sender?.firstName || undefined,
                lastName: sender?.lastName || undefined,
                profilePictureUrl: sender?.profilePictureUrl || undefined,
                presignedProfilePictureUrl: presignedAvatar || undefined,
                employer: sender?.employer ? { companyName: sender.employer.companyName } : undefined,
            },
            application: undefined,
            job: undefined,
        }

        // Non-blocking broadcasts
        Promise.allSettled([
            socketIOService.emitNewMessage(threadId, messageForClient),
            connectionsStore.broadcastToUser(recipientId, {
                type: 'new_message',
                title: 'New Message',
                message: `You have a new message from ${currentUser.profile.firstName || 'someone'}`,
                priority: 'medium',
                actionUrl: `/messages?threadId=${threadId}`,
                data: {
                    threadId,
                    messageId: createdMessage.id,
                    senderId: currentUser.profile.id,
                    senderName: `${currentUser.profile.firstName || ''} ${currentUser.profile.lastName || ''}`.trim(),
                },
                showToast: true,
                toastVariant: 'default',
                toastDuration: 5000,
            }),
        ]).catch(err => console.error('💥 [/reply] broadcast error:', err))

        return NextResponse.json({ success: true, message: messageForClient })
    } catch (err: any) {
        console.error('💥 [/reply] FATAL ERROR', err)
        return NextResponse.json({ error: 'Internal server error', debug: err?.message || 'Unknown error' }, { status: 500 })
    }
}
