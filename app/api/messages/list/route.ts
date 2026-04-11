import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request);
        if (!currentUser?.clerkUser || !currentUser?.profile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
        const offset = parseInt(searchParams.get("offset") || "0");

        // Get messages (simplified version without thread optimization for now)
        const messages = await db.message.findMany({
            where: {
                OR: [
                    { recipientId: currentUser.profile.id },
                    { senderId: currentUser.profile.id },
                ],
            },
            include: {
                sender: true,
                recipient: true,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: limit,
            skip: offset,
        });

        // Get total count
        const totalCount = await db.message.count({
            where: {
                OR: [
                    { recipientId: currentUser.profile.id },
                    { senderId: currentUser.profile.id },
                ],
            },
        });

        // Get unread count
        const unreadCount = await db.message.count({
            where: {
                recipientId: currentUser.profile.id,
                isRead: false,
            },
        });

        return NextResponse.json({
            success: true,
            messages: messages.map((msg) => ({
                id: msg.id,
                content: msg.content,
                isRead: msg.isRead,
                deliveryStatus: msg.deliveryStatus,
                sender: {
                    id: msg.sender.id,
                    name: msg.sender.name,
                    profilePictureUrl: msg.sender.profilePictureUrl,
                },
                recipient: {
                    id: msg.recipient.id,
                    name: msg.recipient.name,
                    profilePictureUrl: msg.recipient.profilePictureUrl,
                },
                createdAt: msg.createdAt.toISOString(),
                updatedAt: msg.updatedAt.toISOString(),
            })),
            pagination: {
                total: totalCount,
                limit,
                offset,
                hasMore: offset + limit < totalCount,
            },
            unreadCount,
        });
    } catch (error) {
        console.error("Error fetching messages:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
