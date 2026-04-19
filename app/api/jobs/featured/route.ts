import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    // Fetch featured and email blast jobs that are active
    const featuredJobs = await db.job.findMany({
      where: {
        status: "approved",
        OR: [
          {
            // Featured jobs
            isFeatured: true,
            OR: [
              { featuredCompletedAt: { not: null } },
              { featuredStatus: "completed" },
            ],
          },
          {
            // Email blast jobs
            isEmailBlast: true,
            emailBlastStatus: "completed",
            emailBlastExpiresAt: { gt: new Date() },
          },
        ],
        // Not expired
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        employer: true,
      },
      take: limit,
      skip,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get total count
    const totalCount = await db.job.count({
      where: {
        status: "approved",
        OR: [
          {
            isFeatured: true,
            OR: [
              { featuredCompletedAt: { not: null } },
              { featuredStatus: "completed" },
            ],
          },
          {
            isEmailBlast: true,
            emailBlastStatus: "completed",
            emailBlastExpiresAt: { gt: new Date() },
          },
        ],
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      jobs: featuredJobs.map((job) => ({
        id: job.id,
        title: job.title,
        category: job.category,
        type: job.type,
        payRangeMin: job.payRangeMin,
        payRangeMax: job.payRangeMax,
        payRangeText: job.payRangeText,
        salaryType: job.salaryType,
        location: job.locationText,
        remoteSchedule: job.remoteSchedule,
        description: job.description,
        skills: job.skillsRequired,
        company: job.employer?.companyName || "Unknown",
        companyLogo: job.employer?.companyLogoUrl,
        companyWebsite: job.employer?.companyWebsite,
        isFeatured: job.isFeatured,
        isEmailBlast: job.isEmailBlast,
        createdAt: job.createdAt.toISOString(),
        viewsCount: job.viewsCount,
        applicationCount: 0, // TODO: Add proper count
        expiresAt: job.expiresAt?.toISOString(),
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching featured jobs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
