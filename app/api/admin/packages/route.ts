import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const packages = await db.employerPackage.findMany({
      include: {
        employer: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Transform the data to match the expected format
    const transformedPackages = packages.map(pkg => ({
      id: pkg.id,
      userId: pkg.employerId,
      packageId: pkg.packageType,
      status: getPackageStatus(pkg),
      purchaseDate: pkg.purchasedAt.toISOString(),
      expiryDate: pkg.expiresAt?.toISOString() || new Date().toISOString(),
      jobPostingsUsed: getTotalListings(pkg) - pkg.listingsRemaining,
      jobPostingsRemaining: pkg.listingsRemaining,
      createdAt: pkg.createdAt.toISOString(),
      updatedAt: pkg.updatedAt.toISOString(),
      user: {
        id: pkg.employer.user.id,
        name: pkg.employer.user.name,
        email: pkg.employer.user.email || 'No email',
        role: pkg.employer.user.role
      }
    }))

    return NextResponse.json({
      success: true,
      packages: transformedPackages
    })
  } catch (error) {
    console.error('Error fetching packages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch packages' },
      { status: 500 }
    )
  }
}

function getPackageStatus(pkg: any): 'active' | 'expired' | 'pending' {
  if (pkg.expiresAt && new Date() > new Date(pkg.expiresAt)) {
    return 'expired'
  }

  return 'active'
}

function getTotalListings(pkg: any): number {
  // Calculate total listings based on package type
  const packageTotals: Record<string, number> = {
    'standard': 1,
    'featured': 1,
    'email_blast': 1,
    'gold_plus': 1,
    'professional': 5,
    'enterprise': 10,
    'unlimited': 999
  }
  return packageTotals[pkg.packageType] || 1
}