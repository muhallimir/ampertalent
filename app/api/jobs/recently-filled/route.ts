import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { S3Service } from '@/lib/s3'

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'ampertalent-files'

async function generatePresignedLogoUrl(companyLogoUrl: string | null): Promise<string | null> {
    if (!companyLogoUrl?.trim()) return null
    try {
        const url = new URL(companyLogoUrl)
        // Extract key from Supabase storage URL
        // Format: /storage/v1/object/public/{bucket}/{key}
        const pathParts = url.pathname.split('/storage/v1/object/public/')
        const s3Key = pathParts.length > 1 ? pathParts[1].split('/').slice(1).join('/') : url.pathname.substring(1)
        return await S3Service.generatePresignedDownloadUrl(BUCKET_NAME, s3Key, 3600)
    } catch (error) {
        console.error('Error generating presigned URL for company logo:', error)
        return companyLogoUrl
    }
}

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)

        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const isValidUser =
            currentUser.profile.role === 'seeker' ||
            (currentUser.isImpersonating && currentUser.profile.role === 'seeker')

        if (!isValidUser) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const filledJobs = await db.job.findMany({
            where: {
                status: 'approved',
                isArchived: false,
                isPaused: false,
                applications: {
                    some: {
                        status: 'hired',
                        updatedAt: { gte: thirtyDaysAgo },
                    },
                },
            },
            select: {
                id: true,
                title: true,
                category: true,
                type: true,
                payRangeMin: true,
                payRangeMax: true,
                payRangeText: true,
                salaryType: true,
                description: true,
                skillsRequired: true,
                isFlexibleHours: true,
                locationText: true,
                createdAt: true,
                expiresAt: true,
                updatedAt: true,
                isCompanyPrivate: true,
                employer: {
                    select: { companyName: true, companyLogoUrl: true, userId: true },
                },
                applications: {
                    where: { status: 'hired' },
                    select: { updatedAt: true },
                    orderBy: { updatedAt: 'desc' },
                    take: 1,
                },
            },
            orderBy: { updatedAt: 'desc' },
            take: 50,
        })

        const transformedJobs = await Promise.all(
            filledJobs.map(async (job) => {
                const salaryType = job.salaryType || 'yearly'
                const salaryTypeText = salaryType === 'yearly' ? '/yr' : salaryType === 'monthly' ? '/mo' : salaryType === 'hourly' ? '/hr' : '/yr'

                const isCompanyPrivate = job.isCompanyPrivate || false
                const presignedLogoUrl = isCompanyPrivate ? null : await generatePresignedLogoUrl(job.employer.companyLogoUrl)

                return {
                    id: job.id,
                    title: job.title,
                    company: isCompanyPrivate ? 'Private Company' : job.employer.companyName,
                    category: job.category,
                    type: job.type,
                    payRange:
                        job.payRangeMin && job.payRangeMax
                            ? {
                                min: Number(job.payRangeMin),
                                max: Number(job.payRangeMax),
                                text:
                                    job.payRangeText ||
                                    `$${Number(job.payRangeMin).toLocaleString()}-${Number(job.payRangeMax).toLocaleString()}${salaryTypeText}`,
                            }
                            : undefined,
                    salaryType: job.salaryType,
                    location: job.locationText || 'Remote',
                    description: job.description,
                    skills: job.skillsRequired,
                    postedDate: job.createdAt.toISOString(),
                    expiresAt: job.expiresAt?.toISOString() || null,
                    applicationCount: 0,
                    isRemote: true,
                    isFlexible: job.isFlexibleHours,
                    isFeatured: false,
                    relevanceScore: 1.0,
                    companyLogoUrl: isCompanyPrivate ? null : presignedLogoUrl || job.employer.companyLogoUrl,
                    employerId: job.employer.userId,
                    isFilled: true,
                    filledAt: job.applications[0]?.updatedAt.toISOString(),
                }
            })
        )

        return NextResponse.json({ jobs: transformedJobs, totalCount: transformedJobs.length })
    } catch (error) {
        console.error('❌ RECENTLY FILLED API: Error fetching recently filled jobs:', error)
        return NextResponse.json({ error: 'Failed to fetch recently filled jobs' }, { status: 500 })
    }
}
