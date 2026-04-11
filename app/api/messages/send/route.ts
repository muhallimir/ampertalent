import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

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

        return NextResponse.json({
            success: true,
            message: {
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
            },
        });
    } catch (error) {
        console.error("Error sending message:", error);
        return NextResponse.json(
            { error: "Failed to send message" },
            { status: 500 }
        );
    }
}
