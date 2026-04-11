import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const status = searchParams.get("status") || "approved";
        const category = searchParams.get("category");
        const type = searchParams.get("type");
        const search = searchParams.get("search");

        const skip = (page - 1) * limit;

        // Build filter
        const where: any = {
            status,
        };

        if (category) {
            where.category = category;
        }

        if (type) {
            where.type = type;
        }

        if (search) {
            where.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];
        }

        // Get jobs
        const jobs = await db.job.findMany({
            where,
            include: {
                employer: {
                    include: {
                        user: true,
                    },
                },
            },
            skip,
            take: limit,
            orderBy: {
                createdAt: "desc",
            },
        });

        // Get total count
        const totalCount = await db.job.count({ where });

        return NextResponse.json({
            jobs: jobs.map((job) => ({
                id: job.id,
                title: job.title,
                description: job.description,
                type: job.type,
                category: job.category,
                payRangeMin: job.payRangeMin,
                payRangeMax: job.payRangeMax,
                payRangeText: job.payRangeText,
                locationText: job.locationText,
                remoteSchedule: job.remoteSchedule,
                skillsRequired: job.skillsRequired,
                employer: {
                    id: job.employer.userId,
                    companyName: job.employer.companyName,
                    companyLogoUrl: job.employer.companyLogoUrl,
                    companyWebsite: job.employer.companyWebsite,
                },
                createdAt: job.createdAt,
                viewsCount: job.viewsCount,
            })),
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        console.error("Error fetching jobs:", error);
        return NextResponse.json(
            { error: "Failed to fetch jobs" },
            { status: 500 }
        );
    }
}
