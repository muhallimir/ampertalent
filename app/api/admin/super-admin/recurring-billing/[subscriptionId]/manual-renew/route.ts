import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"

/**
 * POST /api/admin/super-admin/recurring-billing/[subscriptionId]/manual-renew
 * 
 * Manually trigger renewal of an active subscription:
 * - Verify super-admin role
 * - Validate subscription exists
 * - Verify subscription status is "active"
 * - Call Authorize.net API to trigger renewal
 * - Update next_billing_date
 * - Log the action
 * - Return updated subscription data
 */

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ subscriptionId: string }> }
) {
    try {
        // Await params for Next.js 16
        const { subscriptionId } = await params

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

        // Fetch subscription
        const subscription = await db.subscription.findUnique({
            where: { id: subscriptionId },
            include: {
                seeker: {
                    include: {
                        user: true,
                    },
                },
            },
        })

        if (!subscription) {
            return NextResponse.json(
                { error: "Subscription not found" },
                { status: 404 }
            )
        }

        // Verify subscription is active
        if (subscription.status !== "active") {
            return NextResponse.json(
                { error: `Cannot renew ${subscription.status} subscription. Only active subscriptions can be manually renewed.` },
                { status: 400 }
            )
        }

        // Verify authnet IDs exist
        if (!subscription.authnetSubscriptionId || !subscription.authnetCustomerId) {
            return NextResponse.json(
                { error: "Subscription missing Authorize.net details" },
                { status: 400 }
            )
        }

        // TODO: Call Authorize.net API to trigger renewal
        // This would call the Authorize.net ARB API to create an immediate renewal transaction
        // For now, we'll simulate the renewal by updating the next_billing_date

        // Calculate new next_billing_date based on billing frequency
        const now = new Date()
        const nextBillingDate = new Date(now)

        const billingFrequency = subscription.billingFrequency || "1-month"
        if (billingFrequency === "1-month" || billingFrequency.includes("month")) {
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
        } else if (billingFrequency === "2-months") {
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 2)
        } else if (billingFrequency === "3-months") {
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 3)
        } else if (billingFrequency === "12-months" || billingFrequency.includes("annual")) {
            nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1)
        }

        // Update subscription
        const updatedSubscription = await db.subscription.update({
            where: { id: subscriptionId },
            data: {
                nextBillingDate: nextBillingDate,
                currentPeriodStart: now,
                currentPeriodEnd: new Date(nextBillingDate.getTime() - 24 * 60 * 60 * 1000), // One day before next billing
            },
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
            },
        })

        // Log the manual renewal action
        console.log(
            `✅ Manual renewal triggered by ${user.firstName} ${user.lastName} (${user.id}) for subscription ${subscriptionId} (seeker: ${subscription.seeker.user.email})`
        )

        // Map plan to plan name and amount
        const planConfig: Record<string, { name: string; amount: number }> = {
            trial_monthly: {
                name: "3 Day Free Trial Subscription",
                amount: 34.99,
            },
            gold_bimonthly: {
                name: "Flex Gold Professional",
                amount: 49.99,
            },
            vip_quarterly: {
                name: "Flex VIP Platinum Professional",
                amount: 79.99,
            },
            annual_platinum: {
                name: "Flex Annual Platinum Professional",
                amount: 299.0,
            },
        }

        const planInfo = planConfig[updatedSubscription.plan] || {
            name: updatedSubscription.plan,
            amount: 0,
        }

        return NextResponse.json({
            success: true,
            message: "Subscription manually renewed successfully",
            data: {
                id: updatedSubscription.id,
                seekerId: updatedSubscription.seekerId,
                seekerName: `${updatedSubscription.seeker.user.firstName || ""} ${updatedSubscription.seeker.user.lastName || ""}`.trim(),
                seekerEmail: updatedSubscription.seeker.user.email,
                plan: updatedSubscription.plan,
                planName: planInfo.name,
                status: updatedSubscription.status,
                nextRenewalDate: updatedSubscription.nextBillingDate,
                renewedAt: now,
            },
        })
    } catch (error) {
        console.error("Error manually renewing subscription:", error)
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        )
    }
}
