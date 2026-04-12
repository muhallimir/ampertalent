import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

/**
 * GET /api/admin/super-admin/recurring-billing
 * 
 * Fetch all seeker recurring subscriptions with:
 * - Super-admin role verification
 * - Seeker name/email (via seeker -> user relation)
 * - Plan mapping to display name and amount
 * - Auto-renew (inverted from cancel_at_period_end)
 * - Last payment date (subquery from external_payments)
 * - Support for filtering by status, searching by name/email, pagination
 */

export async function GET(request: NextRequest) {
    try {
        // Check authentication and get current user
        const authData = await getCurrentUser()
        if (!authData?.profile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Verify super-admin role
        if (authData.profile.role !== "super_admin") {
            return NextResponse.json(
                { error: "Forbidden: Only super-admin can access this resource" },
                { status: 403 }
            )
        }

        // Get query parameters
        const searchParams = request.nextUrl.searchParams
        const status = searchParams.get("status") || undefined // "active", "canceled", "past_due", "unpaid"
        const search = searchParams.get("search") || undefined // Search by name or email
        const page = parseInt(searchParams.get("page") || "1")
        const pageSize = parseInt(searchParams.get("pageSize") || "20")
        const skip = (page - 1) * pageSize

        // Build where clause
        const whereClause: any = {}

        // Filter by status
        if (status && ["active", "canceled", "past_due", "unpaid"].includes(status)) {
            whereClause.status = status
        }

        // Search by seeker name or email
        if (search) {
            whereClause.OR = [
                {
                    seeker: {
                        user: {
                            firstName: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                    },
                },
                {
                    seeker: {
                        user: {
                            lastName: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                    },
                },
                {
                    seeker: {
                        user: {
                            email: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                    },
                },
            ]
        }

        // Fetch subscriptions
        const subscriptions = await db.subscription.findMany({
            where: whereClause,
            include: {
                seeker: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                },
                externalPayment: {
                    select: {
                        id: true,
                        createdAt: true,
                        status: true,
                        amount: true,
                        authnetTransactionId: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            skip,
            take: pageSize,
        })

        // Get total count for pagination
        const total = await db.subscription.count({
            where: whereClause,
        })

        // Map plan to plan name and amount - comprehensive mapping to handle all cases
        const planConfig: Record<string, { name: string; amount: number }> = {
            trial_monthly: {
                name: "3 Day Free Trial Subscription",
                amount: 34.99,
            },
            gold_bimonthly: {
                name: "Gold Mom Professional",
                amount: 49.99,
            },
            vip_quarterly: {
                name: "VIP Platinum Mom Professional",
                amount: 79.99,
            },
            annual_platinum: {
                name: "Annual Platinum Mom Professional",
                amount: 299.0,
            },
            // Fallback for old plan IDs that might be in the database
            trial: {
                name: "3 Day Free Trial Subscription",
                amount: 34.99,
            },
            gold: {
                name: "Gold Mom Professional",
                amount: 49.99,
            },
            vip: {
                name: "VIP Platinum Mom Professional",
                amount: 79.99,
            },
            annual: {
                name: "Annual Platinum Mom Professional",
                amount: 299.0,
            },
            none: {
                name: "Free Plan",
                amount: 0,
            },
        }

        // Format response
        const data = subscriptions.map((sub) => {
            const planInfo = planConfig[sub.plan] || {
                name: sub.plan,
                amount: 0,
            }

            // Derive trial expiry (show only if is_on_trial = true)
            const trialExpiryDate = sub.seeker.isOnTrial ? sub.seeker.trialEndsAt : null

            return {
                id: sub.id,
                seekerId: sub.seekerId,
                seekerName: `${sub.seeker.user.firstName || ""} ${sub.seeker.user.lastName || ""}`.trim(),
                seekerEmail: sub.seeker.user.email,
                plan: sub.plan,
                planName: planInfo.name,
                amount: planInfo.amount,
                status: sub.status,
                billingInterval: sub.billingFrequency,
                subscriptionStartDate: sub.createdAt,
                nextRenewalDate: sub.nextBillingDate,
                currentPeriodStart: sub.currentPeriodStart,
                currentPeriodEnd: sub.currentPeriodEnd,
                autoRenew: !sub.cancelAtPeriodEnd, // Inverted logic
                isOnTrial: sub.seeker.isOnTrial,
                trialExpiryDate: trialExpiryDate,
                paymentProvider: "Authorize.net",
                authnetSubscriptionId: sub.authnetSubscriptionId,
                authnetCustomerId: sub.authnetCustomerId,
                // Last successful payment (from externalPayment)
                lastPaymentDate: sub.externalPayment?.createdAt || null,
                lastPaymentAmount: sub.externalPayment?.amount || null,
                lastPaymentStatus: sub.externalPayment?.status || null,
            }
        })

        return NextResponse.json({
            success: true,
            data,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        })
    } catch (error) {
        console.error("Error fetching recurring billing data:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
