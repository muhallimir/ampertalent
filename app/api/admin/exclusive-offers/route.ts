import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { InAppNotificationService } from "@/lib/in-app-notification-service"
import { INVITATION_PACKAGE_CONFIG } from "@/lib/employer-package-provisioning"

/**
 * GET /api/admin/exclusive-offers
 * 
 * Fetch all employers with exclusive plan offers (pending, activated, dismissed)
 * Accessible by all admins (admin and super_admin)
 */
export async function GET(request: NextRequest) {
    try {
        // Check authentication and get current user
        const authData = await getCurrentUser()
        if (!authData?.profile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Verify admin role (admin or super_admin)
        if (authData.profile.role !== "admin" && authData.profile.role !== "super_admin") {
            return NextResponse.json(
                { error: "Forbidden: Only admins can access this resource" },
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

        // Build WHERE conditions using Prisma.sql for dynamic query building
        const conditions: Prisma.Sql[] = [Prisma.sql`1=1`]

        // Status filter - now includes "cancelled" status
        if (status === "pending") {
            conditions.push(Prisma.sql`e.exclusive_plan_type IS NOT NULL AND e.exclusive_plan_activated_at IS NULL AND e.exclusive_plan_dismissed_at IS NULL`)
        } else if (status === "activated") {
            // Activated but not cancelled
            conditions.push(Prisma.sql`e.exclusive_plan_activated_at IS NOT NULL`)
        } else if (status === "dismissed") {
            conditions.push(Prisma.sql`e.exclusive_plan_dismissed_at IS NOT NULL AND e.exclusive_plan_activated_at IS NULL`)
        } else if (status === "cancelled") {
            // Only show employers with cancelled recurring packages
            conditions.push(Prisma.sql`EXISTS (
                SELECT 1 FROM employer_packages ep2 
                WHERE ep2.employer_id = e.user_id 
                AND ep2.package_type = 'gold_plus_recurring_6mo' 
                AND ep2.recurring_status = 'cancelled'
            )`)
        } else {
            conditions.push(Prisma.sql`e.exclusive_plan_type IS NOT NULL`)
        }

        // Search filter (sanitized via parameterization)
        if (search) {
            const searchPattern = `%${search}%`
            conditions.push(Prisma.sql`(
                e.company_name ILIKE ${searchPattern} 
                OR up.email ILIKE ${searchPattern} 
                OR up.first_name ILIKE ${searchPattern} 
                OR up.last_name ILIKE ${searchPattern}
            )`)
        }

        // Combine conditions with AND
        const whereClause = Prisma.sql`${Prisma.join(conditions, ' AND ')}`

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
            // Package billing info
            package_id: string | null;
            billing_cycles_completed: number | null;
            billing_cycles_total: number | null;
            next_billing_date: Date | null;
            recurring_status: string | null;
            // Extension request info
            extension_request_status: string | null;
            extension_requested_months: number | null;
            extension_requested_at: Date | null;
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
                e.exclusive_plan_activated_at,
                ep.id as package_id,
                ep.billing_cycles_completed,
                ep.billing_cycles_total,
                ep.next_billing_date,
                ep.recurring_status,
                ep.extension_request_status,
                ep.extension_requested_months,
                ep.extension_requested_at
            FROM employers e
            JOIN user_profiles up ON e.user_id = up.id
            LEFT JOIN employer_packages ep ON ep.employer_id = e.user_id 
                AND ep.package_type = 'gold_plus_recurring_6mo'
                AND ep.recurring_status IN ('active', 'completed', 'cancelled')
            WHERE ${whereClause}
            ORDER BY 
                CASE 
                    WHEN ep.extension_request_status = 'pending' THEN 0
                    WHEN ep.recurring_status = 'cancelled' THEN 1
                    WHEN e.exclusive_plan_activated_at IS NULL AND e.exclusive_plan_dismissed_at IS NULL THEN 2
                    WHEN e.exclusive_plan_dismissed_at IS NOT NULL THEN 3
                    ELSE 4
                END,
                e.exclusive_plan_offered_at DESC
            LIMIT ${pageSize}
            OFFSET ${skip}
        `

        // Get total count using the same where clause
        const countResult = await db.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) as count
            FROM employers e
            JOIN user_profiles up ON e.user_id = up.id
            WHERE ${whereClause}
        `
        const total = Number(countResult[0]?.count || 0)

        // Get stats (including cancelled count)
        const stats = await db.$queryRaw<Array<{
            pending_count: bigint;
            activated_count: bigint;
            dismissed_count: bigint;
            cancelled_count: bigint;
            total_revenue_cents: bigint;
        }>>`
            SELECT 
                COUNT(*) FILTER (WHERE exclusive_plan_type IS NOT NULL AND exclusive_plan_activated_at IS NULL AND exclusive_plan_dismissed_at IS NULL) as pending_count,
                COUNT(*) FILTER (WHERE exclusive_plan_activated_at IS NOT NULL) as activated_count,
                COUNT(*) FILTER (WHERE exclusive_plan_dismissed_at IS NOT NULL AND exclusive_plan_activated_at IS NULL) as dismissed_count,
                (SELECT COUNT(DISTINCT employer_id) FROM employer_packages WHERE package_type = 'gold_plus_recurring_6mo' AND recurring_status = 'cancelled') as cancelled_count,
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
                    : 'pending',
            // Package billing info
            packageId: emp.package_id,
            billingCyclesCompleted: emp.billing_cycles_completed,
            billingCyclesTotal: emp.billing_cycles_total,
            nextBillingDate: emp.next_billing_date,
            recurringStatus: emp.recurring_status,
            // Extension request info
            extensionRequestStatus: emp.extension_request_status,
            extensionRequestedMonths: emp.extension_requested_months,
            extensionRequestedAt: emp.extension_requested_at
        }))

        return NextResponse.json({
            data: formattedEmployers,
            stats: {
                pending: Number(stats[0]?.pending_count || 0),
                activated: Number(stats[0]?.activated_count || 0),
                dismissed: Number(stats[0]?.dismissed_count || 0),
                cancelled: Number(stats[0]?.cancelled_count || 0),
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
        console.error("Error fetching exclusive offers:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

/**
 * POST /api/admin/exclusive-offers
 * 
 * Offer exclusive plan to an existing employer
 * Accessible by all admins (admin and super_admin)
 */
export async function POST(request: NextRequest) {
    try {
        // Check authentication and get current user
        const authData = await getCurrentUser()
        if (!authData?.profile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Verify admin role (admin or super_admin)
        if (authData.profile.role !== "admin" && authData.profile.role !== "super_admin") {
            return NextResponse.json(
                { error: "Forbidden: Only admins can offer exclusive plans" },
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

        // Check if employer already has an ACTIVE exclusive plan
        // Allow re-offering if their previous plan is completed or cancelled
        const existingPlanStatus = await db.$queryRaw<Array<{
            exclusive_plan_activated_at: Date | null;
            recurring_status: string | null;
        }>>`
            SELECT 
                e.exclusive_plan_activated_at,
                ep.recurring_status
            FROM employers e
            LEFT JOIN employer_packages ep ON ep.employer_id = e.user_id 
                AND ep.package_type = 'gold_plus_recurring_6mo'
                AND ep.is_recurring = true
            WHERE e.user_id = ${employerId}
            ORDER BY ep.created_at DESC
            LIMIT 1
        `

        const planData = existingPlanStatus[0]

        // Block only if they have an activated plan that is still ACTIVE (ongoing)
        if (planData?.exclusive_plan_activated_at && planData?.recurring_status === 'active') {
            return NextResponse.json(
                { error: "Employer already has an active exclusive plan. Use the Extend feature instead." },
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
 * DELETE /api/admin/exclusive-offers
 * 
 * Remove/revoke exclusive plan offer from an employer
 * Accessible by all admins (admin and super_admin)
 */
export async function DELETE(request: NextRequest) {
    try {
        // Check authentication and get current user
        const authData = await getCurrentUser()
        if (!authData?.profile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Verify admin role (admin or super_admin)
        if (authData.profile.role !== "admin" && authData.profile.role !== "super_admin") {
            return NextResponse.json(
                { error: "Forbidden: Only admins can revoke exclusive plans" },
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
                exclusive_plan_source = NULL,
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
