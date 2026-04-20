import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { S3Service } from '@/lib/s3'
import { activeJobWhereClause, validPackageWhereClause } from '@/lib/employerStatus'

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'ampertalent-files'

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

    // Check if user is an admin
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const hasCredits = searchParams.get('hasCredits')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause using AND array to avoid OR conflicts
    const where: any = { AND: [] }

    if (search) {
      where.AND.push({
        OR: [
          { companyName: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
        ],
      })
    }

    if (status === 'suspended') {
      where.AND.push({ isSuspended: true })
    } else if (status === 'approved') {
      where.AND.push({ isSuspended: false })
      where.AND.push({
        OR: [
          { jobs: { some: activeJobWhereClause() } },
          { packages: { some: validPackageWhereClause() } },
        ],
      })
    } else if (status === 'inactive') {
      where.AND.push({ isSuspended: false })
      where.AND.push({ jobs: { none: activeJobWhereClause() } })
      where.AND.push({ packages: { none: validPackageWhereClause() } })
    }

    // Clean up: if no conditions were added, remove the empty AND
    if (where.AND.length === 0) delete where.AND

    // Run count and data fetch in parallel
    const [totalCount, employers] = await Promise.all([
      db.employer.count({ where }),
      db.employer.findMany({
        where,
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
          // Only the latest package for the list badge — full list loaded lazily
          packages: {
            where: {
              OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: { jobs: true },
          },
          // Use DB aggregation: count applications and hired status via grouped jobs
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
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    ])

    // Apply hasCredits filter in DB result (avoids a separate query)
    let filtered = employers
    if (hasCredits === 'true') {
      filtered = employers.filter((emp) =>
        emp.packages.some((pkg) => pkg.listingsRemaining > 0)
      )
    } else if (hasCredits === 'false') {
      filtered = employers.filter(
        (emp) => !emp.packages.some((pkg) => pkg.listingsRemaining > 0)
      )
    }

    // Generate presigned logo URLs in parallel (single batch, not nested inside map)
    const logoUrls = await Promise.all(
      filtered.map((emp) => generatePresignedLogoUrl(emp.companyLogoUrl))
    )

    const result = filtered.map((employer, i) => {
      const totalApplications = employer.jobs.reduce(
        (sum, job) => sum + job._count.applications,
        0
      )
      const totalHires = employer.jobs.reduce(
        (sum, job) => sum + job.applications.length,
        0
      )

      return {
        ...employer,
        companyLogoUrl: logoUrls[i] ?? employer.companyLogoUrl,
        _count: {
          ...employer._count,
          applications: totalApplications,
          hires: totalHires,
        },
        jobs: employer.jobs.map((j) => ({ status: j.status, expiresAt: j.expiresAt })),
      }
    })

    return NextResponse.json({
      success: true,
      employers: result,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    })
  } catch (error) {
    console.error('Error fetching employers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employers' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an admin
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { employerId, action } = body

    if (!employerId || !action) {
      return NextResponse.json(
        { error: 'Employer ID and action are required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'suspend':
        const { isSuspended } = body

        if (typeof isSuspended !== 'boolean') {
          return NextResponse.json(
            { error: 'isSuspended must be a boolean' },
            { status: 400 }
          )
        }

        // Update employer suspension status
        const updatedEmployer = await db.employer.update({
          where: { userId: employerId },
          data: {
            isSuspended,
            updatedAt: new Date()
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true
              }
            }
          }
        })

        // Log the admin action
        await db.adminActionLog.create({
          data: {
            adminId: currentUser.profile.id,
            actionType: isSuspended ? 'employer_suspended' : 'employer_reactivated',
            targetEntity: 'employer',
            targetId: employerId,
            details: {
              companyName: updatedEmployer.companyName,
              userEmail: updatedEmployer.user.email,
              previousStatus: !isSuspended,
              newStatus: isSuspended
            }
          }
        })

        return NextResponse.json({
          success: true,
          employer: updatedEmployer
        })

      case 'addCredits':
        const { packageData, notes } = body

        if (!packageData || !packageData.packageType) {
          return NextResponse.json(
            { error: 'Package data with packageType is required' },
            { status: 400 }
          )
        }

        // Validate packageType against actual employer packages
        const validPackageTypes = [
          'standard_job_post', 'featured_job_post', 'solo_email_blast',
          'gold_plus_6_month', 'concierge_lite', 'concierge_level_1',
          'concierge_level_2', 'concierge_level_3', 'rush_service', 'onboarding_service'
        ]

        if (!validPackageTypes.includes(packageData.packageType)) {
          return NextResponse.json(
            { error: 'Invalid package type' },
            { status: 400 }
          )
        }

        // Create new employer package (each package = 1 credit)
        const newPackage = await db.employerPackage.create({
          data: {
            employerId,
            packageType: packageData.packageType,
            listingsRemaining: 1, // Each package provides exactly 1 credit
            featuredListingsRemaining: 0,
            expiresAt: packageData.expiresAt ? new Date(packageData.expiresAt) : null,
            purchasedAt: new Date()
          }
        })

        // Update employer's current package if they don't have one
        const employer = await db.employer.findUnique({
          where: { userId: employerId },
          select: { currentPackageId: true }
        })

        if (!employer?.currentPackageId) {
          await db.employer.update({
            where: { userId: employerId },
            data: { currentPackageId: newPackage.id }
          })
        }

        // Log the admin action
        await db.adminActionLog.create({
          data: {
            adminId: currentUser.profile.id,
            actionType: 'credits_added',
            targetEntity: 'employer',
            targetId: employerId,
            details: {
              packageType: packageData.packageType,
              creditsAdded: 1, // Each package = 1 credit
              expiresAt: packageData.expiresAt,
              notes: notes || null,
              packageId: newPackage.id
            }
          }
        })

        return NextResponse.json({
          success: true,
          package: newPackage
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error updating employer:', error)
    return NextResponse.json(
      { error: 'Failed to update employer' },
      { status: 500 }
    )
  }
}