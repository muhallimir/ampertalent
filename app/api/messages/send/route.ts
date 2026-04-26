import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { socketIOService } from "@/lib/socket-io-service";
import { connectionsStore } from "@/lib/connections-store";

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request);

        if (!currentUser?.clerkUser || !currentUser?.profile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { recipientId, content } = await request.json();

        if (!recipientId || !content) {
            return NextResponse.json(
                { error: "Missing required fields: recipientId, content" },
                { status: 400 }
            );
        }

        // Get recipient profile
        const recipient = await db.userProfile.findUnique({
            where: { id: recipientId },
        });

        if (!recipient) {
            return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
        }

        // Create message
        const message = await db.message.create({
            data: {
                senderId: currentUser.profile.id,
                recipientId: recipient.id,
                content,
                isRead: false,
                deliveryStatus: "sent",
            },
            include: {
                sender: true,
                recipient: true,
            },
        });

        const messagePayload = {
            id: message.id,
            content: message.content,
            isRead: message.isRead,
            deliveryStatus: message.deliveryStatus,
            sender: {
                id: message.sender.id,
                name: message.sender.name,
                profilePictureUrl: message.sender.profilePictureUrl,
            },
            recipient: {
                id: message.recipient.id,
                name: message.recipient.name,
                profilePictureUrl: message.recipient.profilePictureUrl,
            },
            createdAt: message.createdAt.toISOString(),
            updatedAt: message.updatedAt.toISOString(),
        };

        // Broadcast SSE to recipient
        Promise.allSettled([
            connectionsStore.broadcastToUser(recipient.id, {
                type: 'new_message',
                title: 'New Message',
                message: `You have a new message from ${currentUser.profile.firstName || message.sender.name || 'someone'}`,
                priority: 'medium',
                actionUrl: `/messages`,
                data: {
                    messageId: message.id,
                    senderId: currentUser.profile.id,
                    senderName: message.sender.name || '',
                },
                showToast: true,
                toastVariant: 'default',
                toastDuration: 5000,
            }),
        ]).catch(err => console.error('[send] SSE broadcast error:', err));

        return NextResponse.json({ success: true, message: messagePayload });
    } catch (error) {
        console.error("Error sending message:", error);
        return NextResponse.json(
            { error: "Failed to send message" },
            { status: 500 }
        );
    }
}
