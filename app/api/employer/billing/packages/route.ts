import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { EMPLOYER_ADDONS } from '@/lib/addons-config'
import { JOB_PACKAGES } from '@/lib/employer-packages'

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const userProfile = await db.userProfile.findUnique({
            where: { clerkUserId: currentUser.clerkUser.id as string },
            include: { employer: true },
        })

        if (!userProfile || userProfile.role !== 'employer' || !userProfile.employer) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 })
        }

        const employerPackages = await db.employerPackage.findMany({
            where: { employerId: userProfile.employer.userId },
            include: { purchasedAddOns: true },
            orderBy: { purchasedAt: 'desc' },
        })

        const allPackages = await Promise.all(
            employerPackages.map(async pkg => {
                const packageDetails = JOB_PACKAGES.find(p => p.id === pkg.packageType)

                const jobPostingBreakdown = await db.job.findMany({
                    where: {
                        employerId: userProfile.employer!.userId,
                        createdAt: { gte: pkg.purchasedAt },
                        status: { in: ['pending_vetting', 'approved', 'rejected', 'expired'] },
                    },
                    select: { id: true, title: true, status: true, createdAt: true, updatedAt: true },
                    orderBy: { createdAt: 'desc' },
                })

                const originalListings = packageDetails?.listings === -1 ? 999 : packageDetails?.listings || pkg.listingsRemaining
                const jobPostingsUsed = Math.max(0, originalListings - pkg.listingsRemaining)
                const actualRemaining = Math.max(0, pkg.listingsRemaining)

                const addOns = pkg.purchasedAddOns ? pkg.purchasedAddOns.map(addOn => {
                    const addOnConfig = EMPLOYER_ADDONS.find((a: any) => a.id === addOn.addOnId)
                    return {
                        id: addOn.addOnId,
                        name: addOnConfig?.name || 'Unknown Service',
                        serviceId: addOn.addOnId,
                        quantity: addOn.quantity,
                        price: addOn.price,
                        expiresAt: addOn.expiresAt?.toISOString() || null,
                    }
                }) : []

                const serviceRequestIds: Record<string, string> = {}
                const statusMap: Record<string, string> = {}

                if (pkg.purchasedAddOns && pkg.purchasedAddOns.length > 0) {
                    const serviceRequests = await db.additionalServicePurchase.findMany({
                        where: { employerPackageId: pkg.id, service: { serviceId: { in: EMPLOYER_ADDONS.map((a: any) => a.id) } } },
                        select: { id: true, status: true, service: { select: { serviceId: true } } },
                    })
                    serviceRequests.forEach(sr => {
                        serviceRequestIds[sr.service.serviceId] = sr.id
                        statusMap[sr.service.serviceId] = sr.status
                    })
                }

                const addOnsWithServiceId = addOns.map(addOn => ({
                    ...addOn,
                    serviceRequestId: addOn.serviceId ? serviceRequestIds[addOn.serviceId] : null,
                    status: addOn.serviceId ? statusMap[addOn.serviceId] : 'pending',
                }))

                return {
                    id: pkg.id,
                    packageId: pkg.packageType,
                    packageName: packageDetails?.name || pkg.packageType,
                    packagePrice: packageDetails?.price || 0,
                    status: pkg.expiresAt && pkg.expiresAt < new Date() ? 'expired' : 'active',
                    purchaseDate: pkg.purchasedAt.toISOString(),
                    expiryDate: pkg.expiresAt?.toISOString() || null,
                    jobPostingsUsed,
                    jobPostingsRemaining: actualRemaining,
                    featuredListingsUsed: pkg.featuredListingsUsed,
                    featuredListingsRemaining: pkg.featuredListingsRemaining,
                    isRecurring: pkg.isRecurring,
                    billingCyclesTotal: pkg.billingCyclesTotal,
                    billingCyclesCompleted: pkg.billingCyclesCompleted,
                    recurringAmountCents: pkg.recurringAmountCents,
                    recurringStatus: pkg.recurringStatus,
                    nextBillingDate: pkg.nextBillingDate?.toISOString() || null,
                    arbSubscriptionId: pkg.arbSubscriptionId,
                    extensionRequestStatus: pkg.extensionRequestStatus,
                    extensionRequestedMonths: pkg.extensionRequestedMonths,
                    extensionRequestedAt: pkg.extensionRequestedAt?.toISOString() || null,
                    purchasedAddOns: addOnsWithServiceId,
                    jobPostingBreakdown: jobPostingBreakdown.map(job => ({
                        id: job.id, title: job.title, status: job.status,
                        createdAt: job.createdAt.toISOString(), updatedAt: job.updatedAt.toISOString(),
                    })),
                }
            })
        )

        const currentPackage = allPackages.find(pkg => pkg.status === 'active') || allPackages[0] || null

        const packagesWithStatus = JOB_PACKAGES.map(pkg => ({
            ...pkg,
            current: currentPackage?.packageId === pkg.id && currentPackage?.status === 'active',
        }))

        return NextResponse.json({ packages: packagesWithStatus, currentPackage, allPackages })
    } catch (error) {
        console.error('Error fetching packages:', error)
        return NextResponse.json({ error: 'Failed to fetch packages' }, { status: 500 })
    }
}
