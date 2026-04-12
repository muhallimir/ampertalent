import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { InAppNotificationService } from "@/lib/in-app-notification-service"
import { INVITATION_PACKAGE_CONFIG } from "@/lib/employer-package-provisioning"

/**
 * GET /api/admin/super-admin/exclusive-plans
 * 
 * Fetch all employers with exclusive plan offers (pending, activated, dismissed)
 * Super-admin only
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
        const status = searchParams.get("status") || "all" // "pending", "activated", "dismissed", "all"
        const search = searchParams.get("search") || undefined
        const page = parseInt(searchParams.get("page") || "1")
        const pageSize = parseInt(searchParams.get("pageSize") || "20")
        const skip = (page - 1) * pageSize

        // Build WHERE clause based on status filter using raw SQL
        let statusFilter = ""
        if (status === "pending") {
            statusFilter = "AND exclusive_plan_type IS NOT NULL AND exclusive_plan_activated_at IS NULL AND exclusive_plan_dismissed_at IS NULL"
        } else if (status === "activated") {
            statusFilter = "AND exclusive_plan_activated_at IS NOT NULL"
        } else if (status === "dismissed") {
            statusFilter = "AND exclusive_plan_dismissed_at IS NOT NULL AND exclusive_plan_activated_at IS NULL"
        } else {
            statusFilter = "AND exclusive_plan_type IS NOT NULL"
        }

        // Build search filter
        let searchFilter = ""
        if (search) {
            searchFilter = `AND (
                e.company_name ILIKE '%${search}%' 
                OR up.email ILIKE '%${search}%' 
                OR up.first_name ILIKE '%${search}%' 
                OR up.last_name ILIKE '%${search}%'
            )`
        }

        // Fetch employers with exclusive plans
        const employers = await db.$queryRaw<Array<{
            user_id: string;
            company_name: string;
            email: string | null;
            first_name: string | null;
            last_name: string | null;
            exclusive_plan_type: string | null;
            exclusive_plan_name: string | null;
            exclusive_plan_amount_cents: number | null;
            exclusive_plan_cycles: number | null;
            exclusive_plan_offered_at: Date | null;
            exclusive_plan_dismissed_at: Date | null;
            exclusive_plan_activated_at: Date | null;
        }>>`
            SELECT 
                e.user_id,
                e.company_name,
                up.email,
                up.first_name,
                up.last_name,
                e.exclusive_plan_type,
                e.exclusive_plan_name,
                e.exclusive_plan_amount_cents,
                e.exclusive_plan_cycles,
                e.exclusive_plan_offered_at,
                e.exclusive_plan_dismissed_at,
                e.exclusive_plan_activated_at
            FROM employers e
            JOIN user_profiles up ON e.user_id = up.id
            WHERE 1=1 ${statusFilter ? statusFilter : ''} ${searchFilter ? searchFilter : ''}
            ORDER BY 
                CASE 
                    WHEN e.exclusive_plan_activated_at IS NULL AND e.exclusive_plan_dismissed_at IS NULL THEN 0
                    WHEN e.exclusive_plan_dismissed_at IS NOT NULL THEN 1
                    ELSE 2
                END,
                e.exclusive_plan_offered_at DESC
            LIMIT ${pageSize}
            OFFSET ${skip}
        `

        // Get total count
        const countResult = await db.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) as count
            FROM employers e
            JOIN user_profiles up ON e.user_id = up.id
            WHERE 1=1 ${statusFilter ? statusFilter : ''} ${searchFilter ? searchFilter : ''}
        `
        const total = Number(countResult[0]?.count || 0)

        // Get stats
        const stats = await db.$queryRaw<Array<{
            pending_count: bigint;
            activated_count: bigint;
            dismissed_count: bigint;
            total_revenue_cents: bigint;
        }>>`
            SELECT 
                COUNT(*) FILTER (WHERE exclusive_plan_type IS NOT NULL AND exclusive_plan_activated_at IS NULL AND exclusive_plan_dismissed_at IS NULL) as pending_count,
                COUNT(*) FILTER (WHERE exclusive_plan_activated_at IS NOT NULL) as activated_count,
                COUNT(*) FILTER (WHERE exclusive_plan_dismissed_at IS NOT NULL AND exclusive_plan_activated_at IS NULL) as dismissed_count,
                COALESCE(SUM(exclusive_plan_amount_cents) FILTER (WHERE exclusive_plan_activated_at IS NOT NULL), 0) as total_revenue_cents
            FROM employers
            WHERE exclusive_plan_type IS NOT NULL
        `

        const formattedEmployers = employers.map(emp => ({
            userId: emp.user_id,
            companyName: emp.company_name,
            email: emp.email,
            name: [emp.first_name, emp.last_name].filter(Boolean).join(' ') || emp.email,
            planType: emp.exclusive_plan_type,
            planName: emp.exclusive_plan_name,
            amountCents: emp.exclusive_plan_amount_cents,
            cycles: emp.exclusive_plan_cycles,
            offeredAt: emp.exclusive_plan_offered_at,
            dismissedAt: emp.exclusive_plan_dismissed_at,
            activatedAt: emp.exclusive_plan_activated_at,
            status: emp.exclusive_plan_activated_at
                ? 'activated'
                : emp.exclusive_plan_dismissed_at
                    ? 'dismissed'
                    : 'pending'
        }))

        return NextResponse.json({
            data: formattedEmployers,
            stats: {
                pending: Number(stats[0]?.pending_count || 0),
                activated: Number(stats[0]?.activated_count || 0),
                dismissed: Number(stats[0]?.dismissed_count || 0),
                totalRevenueCents: Number(stats[0]?.total_revenue_cents || 0)
            },
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        })
    } catch (error) {
        console.error("Error fetching exclusive plans:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

/**
 * POST /api/admin/super-admin/exclusive-plans
 * 
 * Offer exclusive plan to an existing employer
 * Super-admin only
 */
export async function POST(request: NextRequest) {
    try {
        // Check authentication and get current user
        const authData = await getCurrentUser()
        if (!authData?.profile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Verify super-admin role
        if (authData.profile.role !== "super_admin") {
            return NextResponse.json(
                { error: "Forbidden: Only super-admin can offer exclusive plans" },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { employerId, planType, customAmountCents, customCycles } = body

        if (!employerId) {
            return NextResponse.json({ error: "Employer ID is required" }, { status: 400 })
        }

        // Default to gold_plus_recurring_6mo if not specified
        const selectedPlanType = planType || 'gold_plus_recurring_6mo'
        const packageConfig = INVITATION_PACKAGE_CONFIG[selectedPlanType]

        if (!packageConfig) {
            return NextResponse.json({ error: `Invalid plan type: ${selectedPlanType}` }, { status: 400 })
        }

        // Allow custom amounts and cycles (for special deals)
        const amountCents = customAmountCents || packageConfig.amountCents
        const cycles = customCycles || packageConfig.billingCyclesTotal

        // Check if employer exists
        const employer = await db.employer.findUnique({
            where: { userId: employerId },
            include: {
                user: {
                    select: { email: true, firstName: true, lastName: true, name: true }
                }
            }
        })

        if (!employer) {
            return NextResponse.json({ error: "Employer not found" }, { status: 404 })
        }

        // Check if employer already has an active exclusive plan
        const existingPlan = await db.$queryRaw<Array<{
            exclusive_plan_activated_at: Date | null;
        }>>`
            SELECT exclusive_plan_activated_at
            FROM employers
            WHERE user_id = ${employerId}
        `

        if (existingPlan[0]?.exclusive_plan_activated_at) {
            return NextResponse.json(
                { error: "Employer already has an active exclusive plan" },
                { status: 409 }
            )
        }

        // Store the exclusive plan offer
        // source = 'admin' means they get a notification but NO persistent card on billing page
        await db.$executeRaw`
            UPDATE employers 
            SET 
                exclusive_plan_type = ${selectedPlanType},
                exclusive_plan_name = ${packageConfig.packageName},
                exclusive_plan_amount_cents = ${amountCents},
                exclusive_plan_cycles = ${cycles},
                exclusive_plan_offered_at = NOW(),
                exclusive_plan_dismissed_at = NULL,
                exclusive_plan_activated_at = NULL,
                exclusive_plan_source = 'admin',
                updated_at = NOW()
            WHERE user_id = ${employerId}
        `

        const employerName = employer.user.name ||
            [employer.user.firstName, employer.user.lastName].filter(Boolean).join(' ') ||
            employer.companyName
        const employerEmail = employer.user.email || ''

        // Send notification to employer
        await InAppNotificationService.notifyExclusivePlanOffered(
            employerId,
            packageConfig.packageName,
            amountCents,
            cycles
        )

        // Notify all admins
        await InAppNotificationService.notifyAdminExclusivePlanOffered(
            employerName,
            employerEmail,
            employerId,
            packageConfig.packageName,
            amountCents,
            cycles,
            authData.profile.id
        )

        // Log admin action
        await db.adminActionLog.create({
            data: {
                adminId: authData.profile.id,
                actionType: 'exclusive_plan_offered',
                targetEntity: 'employer',
                targetId: employerId,
                details: {
                    employerName,
                    employerEmail,
                    planType: selectedPlanType,
                    planName: packageConfig.packageName,
                    amountCents,
                    cycles,
                    totalValue: amountCents * cycles
                }
            }
        })

        console.log(`✅ Exclusive plan offered to ${employerEmail} by admin ${authData.profile.email}`)

        return NextResponse.json({
            success: true,
            message: `Exclusive plan offered to ${employerName}`,
            offer: {
                employerId,
                employerName,
                planType: selectedPlanType,
                planName: packageConfig.packageName,
                amountCents,
                cycles,
                totalValue: amountCents * cycles
            }
        })
    } catch (error) {
        console.error("Error offering exclusive plan:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

/**
 * DELETE /api/admin/super-admin/exclusive-plans
 * 
 * Remove/revoke exclusive plan offer from an employer
 * Super-admin only
 */
export async function DELETE(request: NextRequest) {
    try {
        // Check authentication and get current user
        const authData = await getCurrentUser()
        if (!authData?.profile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Verify super-admin role
        if (authData.profile.role !== "super_admin") {
            return NextResponse.json(
                { error: "Forbidden: Only super-admin can revoke exclusive plans" },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(request.url)
        const employerId = searchParams.get("employerId")

        if (!employerId) {
            return NextResponse.json({ error: "Employer ID is required" }, { status: 400 })
        }

        // Check if employer has an activated plan (can't revoke activated plans)
        const existingPlan = await db.$queryRaw<Array<{
            exclusive_plan_activated_at: Date | null;
            exclusive_plan_type: string | null;
        }>>`
            SELECT exclusive_plan_activated_at, exclusive_plan_type
            FROM employers
            WHERE user_id = ${employerId}
        `

        if (existingPlan[0]?.exclusive_plan_activated_at) {
            return NextResponse.json(
                { error: "Cannot revoke an already activated exclusive plan" },
                { status: 409 }
            )
        }

        if (!existingPlan[0]?.exclusive_plan_type) {
            return NextResponse.json(
                { error: "No exclusive plan offer found for this employer" },
                { status: 404 }
            )
        }

        // Remove the exclusive plan offer
        await db.$executeRaw`
            UPDATE employers 
            SET 
                exclusive_plan_type = NULL,
                exclusive_plan_name = NULL,
                exclusive_plan_amount_cents = NULL,
                exclusive_plan_cycles = NULL,
                exclusive_plan_offered_at = NULL,
                exclusive_plan_dismissed_at = NULL,
                exclusive_plan_activated_at = NULL,
                updated_at = NOW()
            WHERE user_id = ${employerId}
        `

        // Log admin action
        await db.adminActionLog.create({
            data: {
                adminId: authData.profile.id,
                actionType: 'exclusive_plan_revoked',
                targetEntity: 'employer',
                targetId: employerId,
                details: {
                    previousPlanType: existingPlan[0].exclusive_plan_type
                }
            }
        })

        console.log(`✅ Exclusive plan revoked for employer ${employerId} by admin ${authData.profile.email}`)

        return NextResponse.json({
            success: true,
            message: "Exclusive plan offer revoked successfully"
        })
    } catch (error) {
        console.error("Error revoking exclusive plan:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
