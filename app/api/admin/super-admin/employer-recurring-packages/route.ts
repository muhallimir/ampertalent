import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
    try {
        // 1. AUTHENTICATION: Verify super_admin access
        const currentUser = await getCurrentUser(request)

        if (!currentUser?.clerkUser || !currentUser.profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (currentUser.profile.role !== 'super_admin') {
            return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
        }

        // Parse pagination parameters
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1', 10)
        const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
        const skip = (page - 1) * pageSize

        // 2. GET TOTAL COUNT for pagination
        const totalCount = await db.employerPackage.count({
            where: {
                isRecurring: true,
            },
        })

        // 3. FETCH EMPLOYER RECURRING PACKAGES with related data (paginated)
        const employerPackages = await db.employerPackage.findMany({
            where: {
                isRecurring: true,
            },
            include: {
                employer: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                name: true,
                            }
                        }
                    }
                },
                invoices: {
                    where: { status: 'paid' },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                }
            },
            orderBy: [
                { recurringStatus: 'asc' }, // 'active' comes first alphabetically
                { createdAt: 'desc' }
            ],
            skip,
            take: pageSize,
        })

        // 3. TRANSFORM DATA - Type assertions for TypeScript
        const transformedData = employerPackages.map((pkg: any) => ({
            id: pkg.id,
            employerId: pkg.employerId,
            employerName: pkg.employer?.user?.name || 'Unknown',
            employerEmail: pkg.employer?.user?.email || 'Unknown',
            companyName: pkg.employer?.companyName || 'Unknown Company',
            packageType: pkg.packageType,
            packageName: getPackageName(pkg.packageType),
            recurringAmountCents: pkg.recurringAmountCents,
            billingCyclesTotal: pkg.billingCyclesTotal,
            billingCyclesCompleted: pkg.billingCyclesCompleted,
            nextBillingDate: pkg.nextBillingDate?.toISOString() || null,
            recurringStatus: pkg.recurringStatus,
            createdAt: pkg.createdAt.toISOString(),
            expiresAt: pkg.expiresAt?.toISOString() || null,
            lastPaymentDate: pkg.invoices?.[0]?.paidAt?.toISOString() || null,
            lastPaymentAmount: pkg.invoices?.[0]?.amountDue || null,
        }))

        const totalPages = Math.ceil(totalCount / pageSize)

        return NextResponse.json({
            success: true,
            data: transformedData,
            count: transformedData.length,
            pagination: {
                page,
                pageSize,
                totalCount,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        })

    } catch (error) {
        console.error('[Employer Recurring Packages API] Error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch employer recurring packages' },
            { status: 500 }
        )
    }
}

// Helper function to get human-readable package name
function getPackageName(packageType: string): string {
    const packageNames: Record<string, string> = {
        'gold_plus_recurring_6mo': 'Gold Plus Small Business (6-Month)',
        'gold_plus_recurring_12mo': 'Gold Plus Small Business (12-Month)',
        // Add more package types as needed
    }
    return packageNames[packageType] || packageType.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
}
