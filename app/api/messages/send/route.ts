/**
 * POST /api/messages/send
 *
 * Rules (mirroring HireMyMom):
 * - Employers can initiate new conversations with seekers
 * - Seekers can ONLY reply in existing threads (cannot start new ones)
 * - Find-or-create thread by sorted participant IDs
 * - Broadcasts SSE new_message + new_thread to recipient
 * - Returns thread + message so UI can navigate immediately
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { connectionsStore } from '@/lib/connections-store'
import { socketIOService } from '@/lib/socket-io-service'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

function getPublicProfilePictureUrl(url: string | null | undefined): string | undefined {
    if (!url) return undefined
    if (url.startsWith('http')) return url
    return `${SUPABASE_URL}/storage/v1/object/public/profile-pictures/${url}`
}

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)

        if (!currentUser?.clerkUser || !currentUser?.profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { recipientId, content, applicationId, jobId } = body

        if (!recipientId || !content) {
            return NextResponse.json(
                { error: 'Missing required fields: recipientId, content' },
                { status: 400 }
            )
        }

        if (content.length > 5000) {
            return NextResponse.json(
                { error: 'Content must be 5000 characters or less' },
                { status: 400 }
            )
        }

        // Validate recipient
        const recipient = await db.userProfile.findUnique({
            where: { id: recipientId },
            select: {
                id: true, name: true, firstName: true, lastName: true,
                profilePictureUrl: true, role: true,
                employer: { select: { companyName: true } },
            },
        })

        if (!recipient) {
            return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
        }

        // Role rules: employers message seekers; seekers can only reply
        if (currentUser.profile.role === 'employer' && recipient.role !== 'seeker') {
            return NextResponse.json(
                { error: 'Employers can only message job seekers' },
                { status: 403 }
            )
        }

        // Find-or-create thread (sorted participant IDs for stable key)
        const participantsSorted = [currentUser.profile.id, recipientId].sort()

        let thread = await db.messageThread.findFirst({
            where: { participants: { equals: participantsSorted } },
        })

        // Seekers cannot start NEW threads
        if (!thread && currentUser.profile.role === 'seeker') {
            return NextResponse.json(
                { error: 'Seekers cannot initiate new conversations. You may only reply to employers who have reached out first.' },
                { status: 403 }
            )
        }

        const isNewThread = !thread

        if (!thread) {
            thread = await db.messageThread.create({
                data: { participants: participantsSorted },
            })
        }

        // Validate application / job context
        const [appExists, jobExists] = await Promise.all([
            applicationId && typeof applicationId === 'string'
                ? db.application.findUnique({ where: { id: applicationId }, select: { id: true } })
                : Promise.resolve(null),
            jobId && typeof jobId === 'string' && jobId !== 'none'
                ? db.job.findUnique({ where: { id: jobId }, select: { id: true } })
                : Promise.resolve(null),
        ])

        // Create message + update thread atomically
        const [message] = await db.$transaction([
            db.message.create({
                data: {
                    senderId: currentUser.profile.id,
                    recipientId,
                    content: content.trim(),
                    threadId: thread.id,
                    deliveryStatus: 'sent',
                    ...(appExists ? { applicationId } : {}),
                    ...(jobExists ? { jobId } : {}),
                },
                include: {
                    sender: {
                        select: {
                            id: true, name: true, firstName: true, lastName: true,
                            profilePictureUrl: true,
                            employer: { select: { companyName: true } },
                        },
                    },
                },
            }),
            db.messageThread.update({
                where: { id: thread.id },
                data: { lastMessageAt: new Date() },
            }),
        ])

        // Build message payload matching MessageThread.tsx shape
        const senderPfp = getPublicProfilePictureUrl(message.sender.profilePictureUrl)
        const recipientPfp = getPublicProfilePictureUrl(recipient.profilePictureUrl)

        const messageForClient = {
            id: message.id,
            threadId: thread.id,
            senderId: message.senderId,
            recipientId: message.recipientId,
            content: message.content,
            isRead: message.isRead,
            deliveryStatus: message.deliveryStatus,
            createdAt: message.createdAt.toISOString(),
            attachments: [],
            sender: {
                id: message.sender.id,
                name: message.sender.name || `${message.sender.firstName || ''} ${message.sender.lastName || ''}`.trim(),
                firstName: message.sender.firstName || undefined,
                lastName: message.sender.lastName || undefined,
                profilePictureUrl: senderPfp,
                presignedProfilePictureUrl: senderPfp,
                employer: message.sender.employer ? { companyName: message.sender.employer.companyName } : undefined,
            },
        }

        const threadForClient = {
            id: thread.id,
            participants: thread.participants,
            lastMessageAt: new Date().toISOString(),
            participantDetails: [
                {
                    id: currentUser.profile.id,
                    name: currentUser.profile.name || `${currentUser.profile.firstName || ''} ${currentUser.profile.lastName || ''}`.trim(),
                    firstName: currentUser.profile.firstName || undefined,
                    lastName: currentUser.profile.lastName || undefined,
                    profilePictureUrl: getPublicProfilePictureUrl(currentUser.profile.profilePictureUrl),
                    employer: currentUser.profile.employer ? { companyName: currentUser.profile.employer.companyName } : undefined,
                },
                {
                    id: recipient.id,
                    name: recipient.name || `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim(),
                    firstName: recipient.firstName || undefined,
                    lastName: recipient.lastName || undefined,
                    profilePictureUrl: recipientPfp,
                    employer: recipient.employer ? { companyName: recipient.employer.companyName } : undefined,
                },
            ],
        }

        const senderDisplayName = `${currentUser.profile.firstName || ''} ${currentUser.profile.lastName || ''}`.trim() || currentUser.profile.name || 'Someone'

        // Broadcast SSE to recipient
        Promise.allSettled([
            socketIOService.emitNewMessage(thread.id, messageForClient as any),
            connectionsStore.broadcastToUser(recipientId, {
                type: isNewThread ? 'new_thread' : 'new_message',
                title: 'New Message',
                message: `You have a new message from ${senderDisplayName}`,
                priority: 'medium',
                actionUrl: `/messages?threadId=${thread.id}`,
                data: {
                    threadId: thread.id,
                    messageId: message.id,
                    senderId: currentUser.profile.id,
                    senderName: senderDisplayName,
                    thread: isNewThread ? threadForClient : undefined,
                },
                showToast: true,
                toastVariant: 'default',
                toastDuration: 5000,
            }),
        ]).catch(err => console.error('[send] SSE broadcast error:', err))

        return NextResponse.json({
            success: true,
            thread: threadForClient,
            message: messageForClient,
        })
    } catch (error) {
        console.error('Error sending message:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
