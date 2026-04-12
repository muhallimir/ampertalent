import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/jobs
 * List jobs with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.userProfile.findUnique({
      where: { clerkUserId: userId },
    })

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 20

    const jobs = await db.job.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        employer: { select: { companyName: true, user: { select: { email: true } } } },
        applications: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await db.job.count({
      where: status ? { status: status as any } : undefined,
    })

    return NextResponse.json(
      {
        success: true,
        data: jobs.map((j) => ({
          id: j.id,
          title: j.title,
          company: j.employer?.companyName,
          email: j.employer?.user.email,
          status: j.status,
          applications: j.applications.length,
          createdAt: j.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Admin Jobs] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/jobs/[id]/approve
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.userProfile.findUnique({
      where: { clerkUserId: userId },
    })

    if (user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { jobId, action } = await request.json()
    if (!jobId || !action) {
      return NextResponse.json({ error: 'Missing jobId or action' }, { status: 400 })
    }

    const job = await db.job.findUnique({ where: { id: jobId } })
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Map action to status
    let newStatus = job.status
    if (action === 'approve') {
      newStatus = 'approved'
    } else if (action === 'reject') {
      newStatus = 'rejected'
    } else if (action === 'pause') {
      newStatus = 'paused'
    }

    const updated = await db.job.update({
      where: { id: jobId },
      data: { status: newStatus as any },
    })

    console.log(`[Admin] Job ${jobId} ${action}d by admin ${userId}`)

    return NextResponse.json(
      {
        success: true,
        data: updated,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Admin Jobs Update] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
