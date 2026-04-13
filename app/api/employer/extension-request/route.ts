import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { InAppNotificationService } from "@/lib/in-app-notification-service"

/**
 * POST /api/employer/extension-request
 * 
 * Employer requests an extension to their active exclusive plan.
 * This creates a pending request that admins must approve or reject.
 */
export async function POST(request: NextRequest) {
    try {
        // Check authentication and get current user
        const authData = await getCurrentUser()
        if (!authData?.profile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Verify employer role
        if (authData.profile.role !== "employer") {
            return NextResponse.json(
                { error: "Forbidden: Only employers can request extensions" },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { packageId, requestedMonths } = body

        if (!packageId) {
            return NextResponse.json({ error: "Package ID is required" }, { status: 400 })
        }

        if (!requestedMonths || ![6, 12].includes(requestedMonths)) {
            return NextResponse.json({ error: "Requested months must be 6 or 12" }, { status: 400 })
        }

        // Get employer info
        const employer = await db.employer.findUnique({
            where: { userId: authData.profile.id },
            include: {
                user: {
                    select: { email: true, firstName: true, lastName: true, name: true }
                }
            }
        })

        if (!employer) {
            return NextResponse.json({ error: "Employer not found" }, { status: 404 })
        }

        // Get the employer's package
        const employerPackage = await db.employerPackage.findFirst({
            where: {
                id: packageId,
                employerId: authData.profile.id,
                packageType: 'gold_plus_recurring_6mo',
                recurringStatus: { in: ['active', 'completed'] }
            }
        })

        if (!employerPackage) {
            return NextResponse.json(
                { error: "No active exclusive plan found. You must have an active plan to request an extension." },
                { status: 404 }
            )
        }

        // Check if there's already a pending request
        if (employerPackage.extensionRequestStatus === 'pending') {
            return NextResponse.json(
                { error: "You already have a pending extension request. Please wait for admin review." },
                { status: 400 }
            )
        }

        // Update the package with extension request
        const updatedPackage = await db.employerPackage.update({
            where: { id: packageId },
            data: {
                extensionRequestedAt: new Date(),
                extensionRequestedMonths: requestedMonths,
                extensionRequestStatus: 'pending',
                extensionReviewedAt: null,
                extensionReviewedBy: null,
                updatedAt: new Date()
            }
        })

        const employerName = employer.user.name ||
            [employer.user.firstName, employer.user.lastName].filter(Boolean).join(' ') ||
            employer.companyName
        const employerEmail = employer.user.email || ''
        const amountCents = employerPackage.recurringAmountCents || 9700

        // Notify all admins about the extension request
        await InAppNotificationService.notifyAdminExtensionRequested(
            employerName,
            employerEmail,
            authData.profile.id,
            requestedMonths,
            employerPackage.billingCyclesCompleted,
            employerPackage.billingCyclesTotal || 6,
            amountCents
        )

        console.log(`📩 Extension request from ${employerEmail} for ${requestedMonths} months`)

        return NextResponse.json({
            success: true,
            message: `Extension request submitted for ${requestedMonths} months. An admin will review your request.`,
            request: {
                packageId,
                requestedMonths,
                requestedAt: updatedPackage.extensionRequestedAt,
                status: 'pending'
            }
        })
    } catch (error) {
        console.error("Error requesting extension:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

/**
 * GET /api/employer/extension-request
 * 
 * Get the current extension request status for the employer's active package.
 */
export async function GET(request: NextRequest) {
    try {
        // Check authentication and get current user
        const authData = await getCurrentUser()
        if (!authData?.profile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Verify employer role
        if (authData.profile.role !== "employer") {
            return NextResponse.json(
                { error: "Forbidden: Only employers can view extension requests" },
                { status: 403 }
            )
        }

        // Get the employer's active recurring package
        const employerPackage = await db.employerPackage.findFirst({
            where: {
                employerId: authData.profile.id,
                packageType: 'gold_plus_recurring_6mo',
                recurringStatus: { in: ['active', 'completed'] }
            },
            orderBy: { createdAt: 'desc' }
        })

        if (!employerPackage) {
            return NextResponse.json({ extensionRequest: null })
        }

        return NextResponse.json({
            extensionRequest: employerPackage.extensionRequestStatus ? {
                packageId: employerPackage.id,
                requestedMonths: employerPackage.extensionRequestedMonths,
                requestedAt: employerPackage.extensionRequestedAt,
                status: employerPackage.extensionRequestStatus,
                reviewedAt: employerPackage.extensionReviewedAt
            } : null
        })
    } catch (error) {
        console.error("Error getting extension request:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
