import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userProfile = await db.userProfile.findUnique({
            where: { clerkUserId: userId },
            select: { role: true },
        });

        if (!userProfile) {
            return NextResponse.json(
                { error: "User profile not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ role: userProfile.role });
    } catch (error) {
        console.error("Error fetching user role:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
