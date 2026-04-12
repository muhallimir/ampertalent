import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

interface Application {
    id: string
    status: string
    appliedAt: Date
    job: {
        id: string
        title: string
    }
}

interface Job {
    id: string
    title: string
    description: string
    category: string
    type: string
    payRangeMin: number | null
    payRangeMax: number | null
    payRangeText: string | null
    skillsRequired: string[]
    isFlexibleHours: boolean
    hoursPerWeek: number | null
    remoteSchedule: string | null
    locationText: string | null
    createdAt: Date
    expiresAt: Date
    employer: {
        companyName: string
        companyLogoUrl: string | null
    }
    applications?: {
        status: string
        appliedAt: Date
    }[]
}

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser(request)

        if (!user?.clerkUser || !user.profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify user is a job seeker
        if (user.profile.role !== 'seeker') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        // Parse query parameters for includes
        const { searchParams } = new URL(request.url)
        const includeSavedJobs = searchParams.get('include')?.includes('saved-jobs')
        const includeApplications = searchParams.get('include')?.includes('applications')
        const includeProfile = searchParams.get('include')?.includes('profile')
        const includeMembership = searchParams.get('include')?.includes('membership')

        // 🚀 PERFORMANCE OPTIMIZATION: Run all queries in parallel with Promise.allSettled
        // Dashboard will show partial data if any query fails - better UX than showing error page
        const results = await Promise.allSettled([
            // 0. Get user's applications
            db.application.findMany({
                where: {
                    seekerId: user.profile.id
                },
                select: {
                    id: true,
                    status: true,
                    appliedAt: true
                },
                orderBy: {
                    appliedAt: 'desc'
                }
            }),

            // 1. Get user's job seeker profile
            db.jobSeeker.findUnique({
                where: {
                    userId: user.profile.id
                }
            }),

            // 2. Get saved jobs count
            db.savedJob.count({
                where: {
                    seekerId: user.profile.id
                }
            }),

            // 3. Get active jobs count (jobs that are approved and not expired)
            db.job.count({
                where: {
                    status: 'approved',
                    expiresAt: {
                        gt: new Date()
                    }
                }
            }),

            // 4. Get recent activities (last 10)
            db.application.findMany({
                where: {
                    seekerId: user.profile.id
                },
                include: {
                    job: {
                        select: {
                            id: true,
                            title: true,
                            employer: {
                                select: {
                                    companyName: true,
                                    companyLogoUrl: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    appliedAt: 'desc'
                },
                take: 10
            }) as Promise<Application[]>,

            // 5. Get recommended jobs (only available jobs - not filled)
            db.job.findMany({
                where: {
                    status: 'approved',
                    expiresAt: {
                        gt: new Date()
                    },
                    // Filter out filled jobs (jobs with hired applications)
                    applications: {
                        none: {
                            status: 'hired'
                        }
                    }
                },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    category: true,
                    type: true,
                    payRangeMin: true,
                    payRangeMax: true,
                    payRangeText: true,
                    skillsRequired: true,
                    isFlexibleHours: true,
                    hoursPerWeek: true,
                    remoteSchedule: true,
                    locationText: true,
                    createdAt: true,
                    expiresAt: true,
                    employer: {
                        select: {
                            companyName: true,
                            companyLogoUrl: true
                        }
                    },
                    applications: {
                        where: {
                            seekerId: user.profile.id
                        },
                        select: {
                            status: true,
                            appliedAt: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 5
            }) as Promise<Job[]>
        ])

        // Extract data with safe fallbacks - dashboard will never crash
        const applications = results[0].status === 'fulfilled' ? results[0].value : []
        const jobSeekerProfile = results[1].status === 'fulfilled' ? results[1].value : null
        const savedJobsCount = results[2].status === 'fulfilled' ? results[2].value : 0
        const activeJobsCount = results[3].status === 'fulfilled' ? results[3].value : 0
        const recentActivities = results[4].status === 'fulfilled' ? results[4].value as Application[] : []
        const recommendedJobs = results[5].status === 'fulfilled' ? results[5].value as Job[] : []

        // Log any query failures for monitoring
        const queryNames = [
            'applications',
            'jobSeekerProfile',
            'savedJobsCount',
            'activeJobsCount',
            'recentActivities',
            'recommendedJobs'
        ]

        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`❌ Dashboard query [${queryNames[index]}] failed:`, result.reason)
            }
        })

        // Process applications data
        const applicationsCount = applications.length
        const applicationsByStatus = {
            pending: applications.filter(app => app.status === 'pending').length,
            reviewed: applications.filter(app => app.status === 'reviewed').length,
            interview: applications.filter(app => app.status === 'interview').length,
            hired: applications.filter(app => app.status === 'hired').length,
            rejected: applications.filter(app => app.status === 'rejected').length
        }

        // Calculate follow-up reminders (applications pending for more than 1 week)
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        const followUpNeeded = applications.filter(app =>
            app.status === 'pending' && new Date(app.appliedAt) < oneWeekAgo
        ).length

        // Get user's current membership status
        const membershipStatus = jobSeekerProfile?.membershipPlan || 'none'
        const membershipExpiresAt = jobSeekerProfile?.membershipExpiresAt
        const isOnTrial = jobSeekerProfile?.isOnTrial || false
        const trialEndsAt = jobSeekerProfile?.trialEndsAt

        // Initialize the consolidated response
        const consolidatedData: any = {
            applications: {
                total: applicationsCount,
                pending: applicationsByStatus.pending,
                reviewed: applicationsByStatus.reviewed,
                interview: applicationsByStatus.interview,
                hired: applicationsByStatus.hired,
                rejected: applicationsByStatus.rejected,
                followUpNeeded: followUpNeeded
            },
            jobs: {
                active: activeJobsCount,
                recommended: recommendedJobs.length,
                saved: savedJobsCount
            }
        }

        // Add profile data if requested
        if (includeProfile) {
            consolidatedData.profile = {
                completionPercentage: 50, // Simplified for now
                isComplete: false,
                missingFields: [],
                suggestions: []
            }

            consolidatedData.resume = {
                hasResume: !!jobSeekerProfile?.resumeUrl,
                uploadDate: null,
                lastUpdated: null
            }
        }

        // Add membership data if requested
        if (includeMembership) {
            consolidatedData.membership = {
                status: membershipStatus === 'none' ? 'Free' : membershipStatus,
                plan: membershipStatus === 'none' ? 'No Plan' : membershipStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                expiresAt: membershipExpiresAt?.toISOString() || null,
                isOnTrial: isOnTrial,
                trialEndsAt: trialEndsAt?.toISOString() || null,
                daysUntilExpiry: membershipExpiresAt ? Math.ceil((membershipExpiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
            }
        }

        // Add recent activities
        consolidatedData.recentActivities = recentActivities.map((activity: Application) => ({
            id: activity.id,
            type: 'application',
            title: `Applied to ${activity.job.title}`,
            description: `at ${activity.job.employer.companyName}`,
            createdAt: activity.appliedAt.toISOString(),
            status: activity.status,
            jobId: activity.job.id,
            companyName: activity.job.employer.companyName,
            companyLogoUrl: activity.job.employer.companyLogoUrl
        }))

        // Add recommended jobs
        consolidatedData.recommendedJobs = recommendedJobs.map((job: Job) => {
            // Get application status for this user
            const userApplication = job.applications?.[0]
            const applicationStatus = userApplication ? {
                hasApplied: true,
                status: userApplication.status,
                appliedAt: userApplication.appliedAt.toISOString()
            } : {
                hasApplied: false
            }

            return {
                id: job.id,
                title: job.title,
                companyName: job.employer.companyName,
                companyLogoUrl: job.employer.companyLogoUrl,
                description: job.description,
                category: job.category,
                type: job.type,
                payRangeMin: job.payRangeMin,
                payRangeMax: job.payRangeMax,
                payRangeText: job.payRangeText,
                skillsRequired: job.skillsRequired,
                isFlexibleHours: job.isFlexibleHours,
                hoursPerWeek: job.hoursPerWeek,
                remoteSchedule: job.remoteSchedule,
                locationText: job.locationText,
                createdAt: job.createdAt.toISOString(),
                expiresAt: job.expiresAt.toISOString(),
                employerId: '', // Not available
                isFilled: false,
                applicationStatus
            }
        })

        // Add saved jobs data if requested
        if (includeSavedJobs) {
            const savedJobs = await db.savedJob.findMany({
                where: {
                    seekerId: user.profile.id
                },
                select: {
                    id: true,
                    savedAt: true,
                    job: {
                        select: {
                            id: true,
                            title: true,
                            category: true,
                            type: true,
                            payRangeMin: true,
                            payRangeMax: true,
                            payRangeText: true,
                            description: true,
                            skillsRequired: true,
                            isFlexibleHours: true,
                            locationText: true,
                            createdAt: true,
                            employerId: true,
                            employer: {
                                select: {
                                    companyName: true,
                                    companyLogoUrl: true
                                }
                            },
                            applications: {
                                where: {
                                    seekerId: user.profile.id
                                },
                                select: {
                                    id: true,
                                    status: true,
                                    appliedAt: true
                                }
                            }
                        }
                    }
                },
                orderBy: { savedAt: 'desc' }
            })

            consolidatedData.savedJobs = savedJobs.map((savedJob: any) => {
                const application = savedJob.job.applications?.[0]

                return {
                    id: savedJob.job.id,
                    title: savedJob.job.title,
                    company: savedJob.job.employer.companyName,
                    companyLogoUrl: savedJob.job.employer.companyLogoUrl,
                    employerId: savedJob.job.employerId,
                    location: savedJob.job.locationText || 'Remote',
                    type: savedJob.job.type.replace('_', '-') as 'full-time' | 'part-time' | 'project',
                    category: savedJob.job.category,
                    description: savedJob.job.description,
                    skills: savedJob.job.skillsRequired,
                    payRange: {
                        min: savedJob.job.payRangeMin ? Number(savedJob.job.payRangeMin) : undefined,
                        max: savedJob.job.payRangeMax ? Number(savedJob.job.payRangeMax) : undefined,
                        text: savedJob.job.payRangeText
                    },
                    isFlexible: savedJob.job.isFlexibleHours,
                    isRemote: savedJob.job.locationText === 'Remote' || savedJob.job.locationText === null,
                    isFeatured: false,
                    applicationCount: 0,
                    postedDate: savedJob.job.createdAt.toISOString(),
                    savedAt: savedJob.savedAt.toISOString(),
                    applicationStatus: application ? {
                        hasApplied: true,
                        status: application.status,
                        appliedAt: application.appliedAt.toISOString()
                    } : {
                        hasApplied: false
                    }
                }
            })
        }

        return NextResponse.json(consolidatedData)

    } catch (error) {
        console.error('❌ Error fetching seeker dashboard stats:', error)
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data' },
            { status: 500 }
        )
    }
}
