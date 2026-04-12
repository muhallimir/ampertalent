import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/employer/billing
 * Get employer billing dashboard with packages and payment history
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile
    const userProfile = await db.userProfile.findUnique({
      where: { clerkUserId: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Get employer
    const employer = await db.employer.findUnique({
      where: { userId: userProfile.id },
      select: {
        userId: true,
        companyName: true,
      },
    })

    if (!employer) {
      return NextResponse.json({ error: 'Employer profile not found' }, { status: 404 })
    }

    // Get active package
    const activePackage = await db.employerPackage.findFirst({
      where: {
        employerId: employer.userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        expiresAt: 'desc',
      },
    })

    // Get package history (last 2 years)
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

    const packageHistory = await db.employerPackage.findMany({
      where: {
        employerId: employer.userId,
        purchasedAt: {
          gte: twoYearsAgo,
        },
      },
      select: {
        id: true,
        packageType: true,
        purchasedAt: true,
        expiresAt: true,
        listingsRemaining: true,
        recurringStatus: true,
      },
      orderBy: {
        purchasedAt: 'desc',
      },
      take: 50,
    })

    // Get invoices
    const invoices = await db.invoice.findMany({
      where: {
        employerPackage: {
          employerId: employer.userId,
        },
        createdAt: {
          gte: twoYearsAgo,
        },
      },
      select: {
        id: true,
        amountDue: true,
        status: true,
        description: true,
        packageName: true,
        createdAt: true,
        paidAt: true,
        dueDate: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    })

    // Calculate stats
    const totalSpent = invoices.reduce((sum, inv) => sum + inv.amountDue, 0)
    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length
    const pendingInvoices = invoices.filter(inv => inv.status === 'draft').length

    return NextResponse.json(
      {
        success: true,
        billing: {
          employer: {
            companyName: employer.companyName,
          },
          activePackage: activePackage ? {
            id: activePackage.id,
            type: activePackage.packageType,
            purchasedAt: activePackage.purchasedAt,
            expiresAt: activePackage.expiresAt,
            listingsRemaining: activePackage.listingsRemaining,
            recurringStatus: activePackage.recurringStatus,
          } : null,
          stats: {
            totalSpent: totalSpent / 100, // Convert from cents to dollars
            paidInvoices,
            pendingInvoices,
            totalInvoices: invoices.length,
            totalPackagesUsed: packageHistory.length,
          },
          packageHistory: packageHistory.map(pkg => ({
            id: pkg.id,
            type: pkg.packageType,
            purchasedAt: pkg.purchasedAt,
            expiresAt: pkg.expiresAt,
            listingsRemaining: pkg.listingsRemaining,
            recurringStatus: pkg.recurringStatus,
          })),
          invoices: invoices.map(inv => ({
            id: inv.id,
            amount: inv.amountDue / 100,
            status: inv.status,
            description: inv.description,
            packageName: inv.packageName,
            createdAt: inv.createdAt,
            paidAt: inv.paidAt,
            dueDate: inv.dueDate,
          })),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[Employer Billing Dashboard] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch billing dashboard'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
