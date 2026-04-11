import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userProfile = await db.userProfile.findUnique({
            where: { clerkUserId: userId },
        });

        // User doesn't exist yet - they're in the onboarding flow
        if (!userProfile) {
            return NextResponse.json({
                onboardingCompleted: false,
                status: "not_started",
                role: null,
            });
        }

        return NextResponse.json({
            onboardingCompleted: true,
            status: "completed",
            role: userProfile.role,
            userId: userProfile.id,
        });
    } catch (error) {
        console.error("Error checking onboarding status:", error);
        return NextResponse.json(
            { error: "Failed to check status" },
            { status: 500 }
        );
    }
}
