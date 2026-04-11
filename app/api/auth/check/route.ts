import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ isAuthenticated: false });
        }

        // Get user profile
        const userProfile = await db.userProfile.findUnique({
            where: { clerkUserId: userId },
        });

        if (!userProfile) {
            return NextResponse.json({
                isAuthenticated: true,
                userId,
                hasProfile: false,
                role: null,
            });
        }

        return NextResponse.json({
            isAuthenticated: true,
            userId,
            hasProfile: true,
            profileId: userProfile.id,
            role: userProfile.role,
            name: userProfile.name,
            email: userProfile.email,
            profilePictureUrl: userProfile.profilePictureUrl,
        });
    } catch (error) {
        console.error("Error checking auth:", error);
        return NextResponse.json(
            { error: "Failed to check authentication" },
            { status: 500 }
        );
    }
}
