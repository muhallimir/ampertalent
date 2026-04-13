import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is an employer
    if (currentUser.profile.role !== 'employer') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const employerId = currentUser.profile.id

    // Fetch all active packages for the employer
    const packages = await db.employerPackage.findMany({
      where: {
        employerId,
        listingsRemaining: { gt: 0 },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: [
        { expiresAt: 'asc' }, // Packages expiring soonest first
        { createdAt: 'desc' }  // Then by newest first
      ]
    })

    // Calculate total credits
    const totalCredits = packages.reduce((sum: number, pkg: any) => sum + pkg.listingsRemaining, 0)

    // Get package details
    const packageDetails = packages.map((pkg: any) => ({
      id: pkg.id,
      type: pkg.packageType,
      creditsRemaining: pkg.listingsRemaining,
      purchasedAt: pkg.purchasedAt.toISOString(),
      expiresAt: pkg.expiresAt?.toISOString() || null,
      isExpiringSoon: pkg.expiresAt ?
        (pkg.expiresAt.getTime() - Date.now()) < (30 * 24 * 60 * 60 * 1000) : false // 30 days
    }))

    // Get recent credit usage (jobs posted in last 30 days)
    const recentJobs = await db.job.findMany({
      where: {
        employerId,
        status: { not: 'draft' }, // Only count non-draft jobs
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      credits: {
        total: totalCredits,
        hasCredits: totalCredits > 0,
        packages: packageDetails,
        recentUsage: recentJobs.map((job: any) => ({
          jobId: job.id,
          jobTitle: job.title,
          status: job.status,
          postedAt: job.createdAt.toISOString(),
          creditsUsed: 1 // Each job costs 1 credit
        }))
      }
    })

  } catch (error) {
    console.error('Error fetching employer credits:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}