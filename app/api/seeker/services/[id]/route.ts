import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

/**
 * GET /api/seeker/services/[id]
 * Get detailed information about a specific service purchase.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params

        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized - Authentication required' }, { status: 401 })
        }

        const userProfile = await db.userProfile.findUnique({
            where: { clerkUserId: userId },
            select: { id: true, role: true },
        })

        if (!userProfile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
        }

        if (userProfile.role !== 'seeker') {
            return NextResponse.json({ error: 'Unauthorized - This endpoint is for job seekers only' }, { status: 403 })
        }

        const purchase = await db.additionalServicePurchase.findUnique({
            where: { id },
            include: {
                service: {
                    select: {
                        serviceId: true,
                        name: true,
                        description: true,
                        price: true,
                        category: true,
                        features: true,
                    },
                },
                externalPayment: {
                    select: {
                        id: true,
                        authnetTransactionId: true,
                        amount: true,
                        status: true,
                        createdAt: true,
                    },
                },
                user_profiles_additional_service_purchases_assigned_admin_idTouser_profiles: {
                    select: { id: true, name: true, email: true },
                },
            },
        })

        if (!purchase) {
            return NextResponse.json({ error: 'Purchase not found' }, { status: 404 })
        }

        if (purchase.userId !== userProfile.id) {
            return NextResponse.json({ error: 'Forbidden - You do not have access to this purchase' }, { status: 403 })
        }

        const assignedAdmin =
            purchase.user_profiles_additional_service_purchases_assigned_admin_idTouser_profiles
                ? {
                    id: purchase.user_profiles_additional_service_purchases_assigned_admin_idTouser_profiles.id,
                    name: purchase.user_profiles_additional_service_purchases_assigned_admin_idTouser_profiles.name,
                    email: purchase.user_profiles_additional_service_purchases_assigned_admin_idTouser_profiles.email,
                }
                : null

        const formattedPurchase = {
            id: purchase.id,
            serviceId: purchase.serviceId,
            service: {
                serviceId: purchase.service.serviceId,
                name: purchase.service.name,
                description: purchase.service.description,
                price: Number(purchase.service.price),
                category: purchase.service.category,
                features: purchase.service.features,
            },
            amountPaid: Number(purchase.amountPaid),
            status: purchase.status,
            fulfillmentNotes: purchase.fulfillmentNotes,
            assignedAdmin,
            completedAt: purchase.completedAt?.toISOString() || null,
            createdAt: purchase.createdAt.toISOString(),
            updatedAt: purchase.updatedAt.toISOString(),
            payment: purchase.externalPayment
                ? {
                    id: purchase.externalPayment.id,
                    transactionId: purchase.externalPayment.authnetTransactionId,
                    amount: Number(purchase.externalPayment.amount),
                    status: purchase.externalPayment.status,
                    createdAt: purchase.externalPayment.createdAt.toISOString(),
                }
                : null,
        }

        return NextResponse.json({ success: true, purchase: formattedPurchase })
    } catch (error) {
        console.error('Error fetching service purchase:', error)
        return NextResponse.json({ error: 'Failed to fetch service purchase' }, { status: 500 })
    }
}
