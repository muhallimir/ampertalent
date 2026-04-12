import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { S3Service } from '@/lib/s3'

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'hire-my-mom-files'

// Helper function to generate presigned URL for company logo
async function generatePresignedLogoUrl(companyLogoUrl: string | null): Promise<string | null> {
  if (!companyLogoUrl || companyLogoUrl.trim() === '') {
    return null
  }

  try {
    // Extract S3 key from the full URL
    const url = new URL(companyLogoUrl)
    const s3Key = url.pathname.substring(1) // Remove leading slash

    // Generate presigned URL for download (valid for 1 hour)
    const presignedUrl = await S3Service.generatePresignedDownloadUrl(
      BUCKET_NAME,
      s3Key,
      3600 // 1 hour
    )

    return presignedUrl
  } catch (error) {
    console.error('Error generating presigned URL for company logo:', error)
    // Fall back to original URL if presigned URL generation fails
    return companyLogoUrl
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get current date for recent calculations (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Fetch user statistics
    const totalUsers = await db.userProfile.count()

    const recentUsers = await db.userProfile.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    })

    const usersByRole = await db.userProfile.groupBy({
      by: ['role'],
      _count: {
        role: true
      }
    })

    const totalJobs = await db.job.count()

    const jobsByStatus = await db.job.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })

    const recentJobs = await db.job.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    })

    const totalApplications = await db.application.count()

    const applicationsByStatus = await db.application.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })

    const recentPendingJobs = await db.job.findMany({
      where: {
        status: 'pending_vetting'
      },
      include: {
        employer: {
          select: {
            userId: true,
            companyName: true,
            companyLogoUrl: true,
            user: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    // Transform data for response
    const usersByRoleMap = usersByRole.reduce((acc: any, item: any) => {
      acc[item.role] = item._count.role
      return acc
    }, {} as Record<string, number>)

    const jobsByStatusMap = jobsByStatus.reduce((acc: any, item: any) => {
      acc[item.status] = item._count.status
      return acc
    }, {} as Record<string, number>)

    const applicationsByStatusMap = applicationsByStatus.reduce((acc: any, item: any) => {
      acc[item.status] = item._count.status
      return acc
    }, {} as Record<string, number>)

    // Calculate conversion rate (approved jobs / total jobs)
    const conversionRate = totalJobs > 0
      ? ((jobsByStatusMap.approved || 0) / totalJobs) * 100
      : 0

    // Calculate average applications per job
    const averagePerJob = totalJobs > 0
      ? totalApplications / totalJobs
      : 0

    // Transform pending jobs for the dashboard with presigned URLs
    const transformedPendingJobs = await Promise.all(
      recentPendingJobs.map(async (job: any) => {
        const presignedLogoUrl = await generatePresignedLogoUrl(job.employer.companyLogoUrl)

        return {
          id: job.id,
          title: job.title,
          companyName: job.employer.companyName,
          companyLogoUrl: presignedLogoUrl || job.employer.companyLogoUrl,
          employerId: job.employer.userId,
          employerName: job.employer.user.name,
          createdAt: job.createdAt.toISOString(),
          category: job.category,
          type: job.type
        }
      })
    )

    const response = {
      users: {
        total: totalUsers,
        recent: recentUsers,
        byRole: usersByRoleMap
      },
      jobs: {
        total: totalJobs,
        pending: jobsByStatusMap.pending_vetting || 0,
        approved: jobsByStatusMap.approved || 0,
        paused: jobsByStatusMap.paused || 0,
        rejected: jobsByStatusMap.rejected || 0,
        recent: recentJobs,
        conversionRate: Math.round(conversionRate * 100) / 100
      },
      applications: {
        total: totalApplications,
        pending: applicationsByStatusMap.pending || 0,
        averagePerJob: Math.round(averagePerJob * 100) / 100,
        byStatus: applicationsByStatusMap
      },
      recentPendingJobs: transformedPendingJobs
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}