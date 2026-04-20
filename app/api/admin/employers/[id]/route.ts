import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { S3Service } from '@/lib/s3'

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'ampertalent-files'

async function generatePresignedLogoUrl(companyLogoUrl: string | null): Promise<string | null> {
  if (!companyLogoUrl || companyLogoUrl.trim() === '') return null
  try {
    const url = new URL(companyLogoUrl)
    const s3Key = url.pathname.substring(1)
    return await S3Service.generatePresignedDownloadUrl(BUCKET_NAME, s3Key, 3600)
  } catch {
    return companyLogoUrl
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { id } = await params

    const employer = await db.employer.findUnique({
      where: { userId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        packages: {
          where: {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { jobs: true },
        },
        jobs: {
          select: {
            status: true,
            expiresAt: true,
            _count: { select: { applications: true } },
            applications: {
              where: { status: 'hired' },
              select: { id: true },
            },
          },
        },
      },
    })

    if (!employer) {
      return NextResponse.json({ error: 'Employer not found' }, { status: 404 })
    }

    const presignedLogoUrl = await generatePresignedLogoUrl(employer.companyLogoUrl)
    const totalApplications = employer.jobs.reduce((sum: number, job) => sum + job._count.applications, 0)
    const totalHires = employer.jobs.reduce((sum: number, job) => sum + job.applications.length, 0)

    return NextResponse.json({
      success: true,
      employer: {
        ...employer,
        companyLogoUrl: presignedLogoUrl ?? employer.companyLogoUrl,
        _count: {
          ...employer._count,
          applications: totalApplications,
          hires: totalHires,
        },
        jobs: employer.jobs.map((j) => ({ status: j.status, expiresAt: j.expiresAt })),
      },
    })
  } catch (error) {
    console.error('Error fetching employer detail:', error)
    return NextResponse.json({ error: 'Failed to fetch employer detail' }, { status: 500 })
  }
}
