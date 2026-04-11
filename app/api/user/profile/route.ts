import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request);

        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const profile = {
            id: currentUser.profile.id,
            clerkUserId: currentUser.profile.clerkUserId || currentUser?.clerkUser?.id,
            name: currentUser.profile.name,
            email: currentUser.profile.email,
            phone: currentUser.profile.phone,
            timezone: currentUser.profile.timezone,
            profilePictureUrl: currentUser.profile.profilePictureUrl,
            role: currentUser.profile.role,
            createdAt: currentUser.profile.createdAt.toISOString(),
            updatedAt: currentUser.profile.updatedAt.toISOString(),
        };

        return NextResponse.json({ profile });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return NextResponse.json(
            { error: "Failed to fetch profile" },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request);

        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, phone, timezone, profilePictureUrl } = body;

        // Update user profile
        const updatedProfile = await db.userProfile.update({
            where: { id: currentUser.profile.id },
            data: {
                ...(name !== undefined && { name }),
                ...(phone !== undefined && { phone }),
                ...(timezone !== undefined && { timezone }),
                ...(profilePictureUrl !== undefined && { profilePictureUrl }),
            },
        });

        const profile = {
            id: updatedProfile.id,
            name: updatedProfile.name,
            email: updatedProfile.email,
            phone: updatedProfile.phone,
            timezone: updatedProfile.timezone,
            profilePictureUrl: updatedProfile.profilePictureUrl,
            role: updatedProfile.role,
            updatedAt: updatedProfile.updatedAt.toISOString(),
        };

        return NextResponse.json({
            success: true,
            profile,
        });
    } catch (error) {
        console.error("Error updating user profile:", error);
        return NextResponse.json(
            { error: "Failed to update profile" },
            { status: 500 }
        );
    }
}

