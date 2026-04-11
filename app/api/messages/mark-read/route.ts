import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request);

        if (!currentUser?.clerkUser || !currentUser?.profile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { messageId } = await request.json();

        if (!messageId) {
            return NextResponse.json(
                { error: "Missing required field: messageId" },
                { status: 400 }
            );
        }

        // Get message
        const message = await db.message.findUnique({
            where: { id: messageId },
        });

        if (!message) {
            return NextResponse.json({ error: "Message not found" }, { status: 404 });
        }

        // Verify user is the recipient
        if (message.recipientId !== currentUser.profile.id) {
            return NextResponse.json(
                { error: "Not authorized to mark this message as read" },
                { status: 403 }
            );
        }

        // Update message
        const updatedMessage = await db.message.update({
            where: { id: messageId },
            data: { isRead: true },
            include: {
                sender: true,
                recipient: true,
            },
        });

        return NextResponse.json({
            success: true,
            message: {
                id: updatedMessage.id,
                content: updatedMessage.content,
                isRead: updatedMessage.isRead,
                deliveryStatus: updatedMessage.deliveryStatus,
                sender: {
                    id: updatedMessage.sender.id,
                    name: updatedMessage.sender.name,
                },
                recipient: {
                    id: updatedMessage.recipient.id,
                    name: updatedMessage.recipient.name,
                },
                updatedAt: updatedMessage.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        console.error("Error marking message as read:", error);
        return NextResponse.json(
            { error: "Failed to mark message as read" },
            { status: 500 }
        );
    }
}
