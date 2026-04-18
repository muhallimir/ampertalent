import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { connectionsStore } from '@/lib/connections-store'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const message = await db.message.findUnique({
            where: { id },
            select: { id: true, recipientId: true, senderId: true, threadId: true, isRead: true },
        })

        if (!message) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 })
        }

        if (message.recipientId !== currentUser.profile.id) {
            return NextResponse.json({ error: 'You can only mark your own messages as read' }, { status: 403 })
        }

        if (message.isRead) {
            return NextResponse.json({ success: true, message: { id: message.id, isRead: message.isRead } })
        }

        const updatedMessage = await db.message.update({
            where: { id },
            data: { isRead: true },
            select: { id: true, isRead: true, updatedAt: true },
        })

        if (message.senderId && message.senderId !== currentUser.profile.id) {
            connectionsStore.broadcastToUser(message.senderId, {
                id: `message_read_${updatedMessage.id}`,
                type: 'message_read',
                title: 'Message read',
                message: '',
                priority: 'low',
                data: { messageId: updatedMessage.id, threadId: message.threadId },
                showToast: false,
            })
        }

        return NextResponse.json({ success: true, message: updatedMessage })
    } catch (error) {
        console.error('Error marking message as read:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
