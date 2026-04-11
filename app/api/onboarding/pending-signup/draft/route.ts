import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
    try {
        const { onboardingData, selectedPackage } = await request.json();
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Create or update draft pending signup record
        const existingDraft = await db.pendingSignup.findFirst({
            where: {
                clerkUserId: userId,
                sessionToken: "DRAFT",
            },
        });

        let draftRecord;
        if (existingDraft) {
            draftRecord = await db.pendingSignup.update({
                where: { id: existingDraft.id },
                data: {
                    onboardingData: JSON.stringify(onboardingData),
                    selectedPlan: selectedPackage,
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    updatedAt: new Date(),
                },
            });
        } else {
            draftRecord = await db.pendingSignup.create({
                data: {
                    clerkUserId: userId,
                    onboardingData: JSON.stringify(onboardingData),
                    selectedPlan: selectedPackage,
                    email: "",
                    sessionToken: "DRAFT",
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
                },
            });
        }

        return NextResponse.json({
            success: true,
            draftId: draftRecord.id,
        });
    } catch (error) {
        console.error("Error saving draft:", error);
        return NextResponse.json(
            { error: "Failed to save draft" },
            { status: 500 }
        );
    }
}
