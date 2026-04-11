import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify user is a seeker
    if (currentUser.profile.role !== "seeker") {
      return NextResponse.json(
        { error: "Only job seekers can access applications" },
        { status: 403 }
      );
    }

    // Get applications for this seeker
    const applications = await db.application.findMany({
      where: {
        seekerId: currentUser.profile.id,
      },
      include: {
        job: {
          include: {
            employer: true,
          },
        },
      },
      orderBy: {
        appliedAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      applications: applications.map((app) => ({
        id: app.id,
        jobId: app.job.id,
        status: app.status,
        appliedAt: app.appliedAt.toISOString(),
        coverLetter: app.coverLetter,
        resumeUrl: app.resumeUrl,
        interviewStage: app.interviewStage,
        interviewScheduledAt: app.interviewScheduledAt?.toISOString(),
        interviewCompletedAt: app.interviewCompletedAt?.toISOString(),
        job: {
          id: app.job.id,
          title: app.job.title,
          locationText: app.job.locationText,
          type: app.job.type,
          payRangeText: app.job.payRangeText,
          description: app.job.description,
          company: app.job.employer?.companyName || "Unknown Company",
          companyLogo: app.job.employer?.companyLogoUrl,
        },
      })),
    });
  } catch (error) {
    console.error("Error fetching seeker applications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
