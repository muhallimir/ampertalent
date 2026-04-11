import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request);

        if (!currentUser || !currentUser.clerkUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify user is a seeker
        if (!currentUser.profile || currentUser.profile.role !== "seeker") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Get the jobSeeker profile (use jobSeeker from current user since it should be loaded)
        let jobSeeker = (currentUser.profile as any).jobSeeker;

        // If not loaded, fetch it
        if (!jobSeeker) {
            jobSeeker = await db.jobSeeker.findUnique({
                where: { userId: currentUser.profile.id },
            });

            if (!jobSeeker) {
                return NextResponse.json(
                    { error: "Job seeker profile not found" },
                    { status: 403 }
                );
            }
        }

        // Get saved jobs count
        const savedJobsCount = await db.savedJob.count({
            where: {
                seekerId: jobSeeker.userId,
            },
        });

        // Get applications count
        const applicationsCount = await db.application.count({
            where: {
                seekerId: jobSeeker.userId,
            },
        });

        // Get pending applications count
        const pendingApplicationsCount = await db.application.count({
            where: {
                seekerId: jobSeeker.userId,
                status: "pending",
            },
        });

        // Get recent applications
        const recentApplications = await db.application.findMany({
            where: {
                seekerId: jobSeeker.userId,
            },
            include: {
                job: true,
            },
            take: 5,
            orderBy: {
                appliedAt: "desc",
            },
        });

        return NextResponse.json({
            success: true,
            seeker: {
                id: jobSeeker.userId,
                headline: jobSeeker.headline,
                aboutMe: jobSeeker.aboutMe,
                skills: jobSeeker.skills,
                membershipPlan: jobSeeker.membershipPlan,
                isSuspended: jobSeeker.isSuspended,
            },
            stats: {
                savedJobsCount,
                applicationsCount,
                pendingApplicationsCount,
            },
            recentApplications: recentApplications.map((app) => ({
                id: app.id,
                status: app.status,
                jobTitle: app.job?.title || "Unknown",
                appliedAt: app.appliedAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error("Error fetching seeker dashboard:", error);
        return NextResponse.json(
            { error: "Failed to fetch seeker dashboard" },
            { status: 500 }
        );
    }
}
