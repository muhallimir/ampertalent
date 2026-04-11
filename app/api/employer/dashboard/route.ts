import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request);

        if (!currentUser || !currentUser.clerkUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify user is an employer
        if (!currentUser.profile || currentUser.profile.role !== "employer") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Ensure employer profile exists
        if (!currentUser.profile.employer) {
            return NextResponse.json(
                { error: "Employer profile not found" },
                { status: 403 }
            );
        }

        const employerId = currentUser.profile.employer.userId;

        // Get approved jobs count
        const approvedJobsCount = await db.job.count({
            where: {
                employerId,
                status: "approved",
            },
        });

        // Get draft jobs count
        const draftJobsCount = await db.job.count({
            where: {
                employerId,
                status: "draft",
            },
        });

        // Get recent jobs
        const recentJobs = await db.job.findMany({
            where: {
                employerId,
            },
            take: 5,
            orderBy: {
                createdAt: "desc",
            },
        });

        // Get total applications
        const totalApplications = await db.application.count({
            where: {
                job: {
                    employerId,
                },
            },
        });

        return NextResponse.json({
            success: true,
            employer: {
                id: currentUser.profile.employer.userId,
                companyName: currentUser.profile.employer.companyName,
                companyWebsite: currentUser.profile.employer.companyWebsite,
                companyLogoUrl: currentUser.profile.employer.companyLogoUrl,
                companyDescription: currentUser.profile.employer.companyDescription,
                isVetted: currentUser.profile.employer.isVetted,
            },
            stats: {
                approvedJobsCount,
                draftJobsCount,
                totalApplications,
            },
            recentJobs: recentJobs.map((job) => ({
                id: job.id,
                title: job.title,
                type: job.type,
                status: job.status,
                createdAt: job.createdAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error("Error fetching employer dashboard:", error);
        return NextResponse.json(
            { error: "Failed to fetch employer dashboard" },
            { status: 500 }
        );
    }
}
