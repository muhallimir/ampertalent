import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user profile
        const userProfile = await db.userProfile.findUnique({
            where: { clerkUserId: userId },
        });

        if (!userProfile) {
            return NextResponse.json({ error: "User profile not found" }, { status: 404 });
        }

        // Get pending user invitations
        const userInvitations = await db.userInvitation.findMany({
            where: {
                email: userProfile.email,
                acceptedAt: null,
            },
            include: {
                inviter: true,
            },
        });

        // Get pending team invitations
        const teamInvitations = await db.teamInvitation.findMany({
            where: {
                email: userProfile.email,
                acceptedAt: null,
            },
            include: {
                inviter: true,
                employer: true,
            },
        });

        return NextResponse.json({
            userInvitations: userInvitations.map((inv) => ({
                id: inv.id,
                email: inv.email,
                role: inv.role,
                fullName: inv.fullName,
                message: inv.message,
                inviter: inv.inviter ? { id: inv.inviter.id, name: inv.inviter.name } : null,
                expiresAt: inv.expiresAt,
                createdAt: inv.createdAt,
            })),
            teamInvitations: teamInvitations.map((inv) => ({
                id: inv.id,
                email: inv.email,
                role: inv.role,
                message: inv.message,
                inviter: inv.inviter ? { id: inv.inviter.id, name: inv.inviter.name } : null,
                employer: inv.employer ? { userId: inv.employer.userId, companyName: inv.employer.companyName } : null,
                expiresAt: inv.expiresAt,
                createdAt: inv.createdAt,
            })),
        });
    } catch (error) {
        console.error("Error fetching invitations:", error);
        return NextResponse.json(
            { error: "Failed to fetch invitations" },
            { status: 500 }
        );
    }
}
