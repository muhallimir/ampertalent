import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request);

        if (!currentUser?.clerkUser || !currentUser?.profile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const unreadCount = await db.message.count({
            where: {
                recipientId: currentUser.profile.id,
                isRead: false,
            },
        });

        return NextResponse.json({
            success: true,
            unreadCount,
        });
    } catch (error) {
        console.error("Error fetching unread count:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
