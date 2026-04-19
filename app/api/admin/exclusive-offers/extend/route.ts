import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { InAppNotificationService } from "@/lib/in-app-notification-service"
import { INVITATION_PACKAGE_CONFIG } from "@/lib/employer-package-provisioning"
import { NotificationService } from "@/lib/notification-service"

/**
 * POST /api/admin/exclusive-offers/extend
 * 
 * Extend an employer's active exclusive plan by additional billing cycles.
 * This is used when admin wants to renew/extend an employer's 6-month plan
 * for another 6 months (or custom duration).
 * 
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
                { error: "Forbidden: Only admins can extend exclusive plans" },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { employerId, additionalCycles = 6 } = body

        if (!employerId) {
            return NextResponse.json({ error: "Employer ID is required" }, { status: 400 })
        }

        if (additionalCycles < 1 || additionalCycles > 24) {
            return NextResponse.json({ error: "Additional cycles must be between 1 and 24" }, { status: 400 })
        }

        // Get employer info
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

        // Get the employer's active package
        const activePackage = await db.employerPackage.findFirst({
            where: {
                employerId: employerId,
                packageType: 'gold_plus_recurring_6mo',
                recurringStatus: { in: ['active', 'completed'] }
            },
            orderBy: { createdAt: 'desc' }
        })

        if (!activePackage) {
            return NextResponse.json(
                { error: "No active exclusive plan found for this employer. They must have an activated plan first." },
                { status: 404 }
            )
        }

        // Calculate new values
        const newBillingCyclesTotal = activePackage.billingCyclesTotal + additionalCycles
        const wasCompleted = activePackage.recurringStatus === 'completed'

        // Calculate next billing date if plan was completed
        let nextBillingDate = activePackage.nextBillingDate
        if (wasCompleted || !nextBillingDate) {
            nextBillingDate = new Date()
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
        }

        // Calculate new expiration date
        const newExpiresAt = new Date()
        const monthsRemaining = newBillingCyclesTotal - activePackage.billingCyclesCompleted
        newExpiresAt.setMonth(newExpiresAt.getMonth() + monthsRemaining)

        // Update the package
        const updatedPackage = await db.employerPackage.update({
            where: { id: activePackage.id },
            data: {
                billingCyclesTotal: newBillingCyclesTotal,
                nextBillingDate: nextBillingDate,
                recurringStatus: 'active', // Reactivate if was completed
                expiresAt: newExpiresAt,
                updatedAt: new Date()
            }
        })

        // Update all active jobs from this employer to match the new package expiration
        // This ensures jobs posted via the recurring 6-month plan have correct expiration
        await db.job.updateMany({
            where: {
                employerId: employerId,
                status: 'approved',
                // Only update jobs that are associated with this recurring package
                // by checking if the job was created after the package was created
                createdAt: { gte: activePackage.createdAt }
            },
            data: {
                expiresAt: newExpiresAt,
                applicationDeadline: newExpiresAt
            }
        })

        const employerName = employer.user.name ||
            [employer.user.firstName, employer.user.lastName].filter(Boolean).join(' ') ||
            employer.companyName
        const employerEmail = employer.user.email || ''
        const amountCents = activePackage.recurringAmountCents || 9700

        // Send notification to employer about extension
        await InAppNotificationService.notifyExclusivePlanExtended(
            employerId,
            additionalCycles,
            newBillingCyclesTotal,
            amountCents
        )

        // Notify all admins about the extension (including the admin who performed the action)
        await InAppNotificationService.notifyAdminExclusivePlanExtended(
            employerName,
            employerEmail,
            employerId,
            additionalCycles,
            newBillingCyclesTotal,
            amountCents
            // Note: Not passing excludeAdminId so the performing admin also gets notified
        )

        // Log admin action
        await db.adminActionLog.create({
            data: {
                adminId: authData.profile.id,
                actionType: 'exclusive_plan_extended',
                targetEntity: 'employer_package',
                targetId: activePackage.id,
                details: {
                    employerId,
                    employerName,
                    employerEmail,
                    previousCyclesTotal: activePackage.billingCyclesTotal,
                    additionalCycles,
                    newCyclesTotal: newBillingCyclesTotal,
                    cyclesCompleted: activePackage.billingCyclesCompleted,
                    amountPerCycle: amountCents,
                    wasCompleted,
                    nextBillingDate: nextBillingDate.toISOString(),
                    newExpiresAt: newExpiresAt.toISOString()
                }
            }
        })

        // CRM sync skipped - not configured for ampertalent

        console.log(`✅ Exclusive plan extended for ${employerEmail} by admin ${authData.profile.email}`)
        console.log(`   Previous cycles: ${activePackage.billingCyclesTotal}, New cycles: ${newBillingCyclesTotal}`)

        // EMAILS: Admin notification + customer confirmation for extension
        try {
            const orderDate = new Date()
            const orderSuffix = activePackage.id.slice(-4).toUpperCase()
            const orderNumber = `EXT-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${orderSuffix}`
            const productDescription = `Exclusive Plan Extension (+${additionalCycles} months → ${newBillingCyclesTotal} total)`

            // Admin order notification email
            await NotificationService.sendAdminPaymentNotification({
                orderNumber,
                orderDate: orderDate.toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
                }),
                customerName: employerName,
                customerType: 'Employer',
                customerId: `EMP-${employerId.slice(-4).toUpperCase()}`,
                customerEmail: employerEmail,
                productDescription,
                quantity: additionalCycles,
                price: 0, // Extension is admin-granted, no charge
                subscriptionStartDate: orderDate.toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                }),
                nextPaymentDate: nextBillingDate?.toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                }),
                recurringTotal: `$${(amountCents / 100).toFixed(2)} / month`,
                isRenewal: false,
                paymentMethod: 'Admin Extension (No Charge)',
                paymentType: 'card',
            })
            console.log(`✅ EXTEND: Admin notification email sent for extension`)

            // Customer confirmation email (respects ENABLE_CUSTOMER_PAYMENT_EMAILS flag)
            await NotificationService.sendCustomerPaymentConfirmationEmail({
                email: employerEmail,
                firstName: employerName.split(' ')[0] || 'Valued Customer',
                amount: 0, // No charge for admin-granted extension
                description: productDescription,
                transactionId: orderNumber,
                lineItems: [{ name: productDescription, amount: 0 }],
                isRecurring: true,
                paymentType: 'card',
            })
            console.log(`✅ EXTEND: Customer confirmation email sent to ${employerEmail}`)
        } catch (emailError) {
            console.warn('⚠️ EXTEND: Email notification failed (non-blocking):', emailError)
        }

        return NextResponse.json({
            success: true,
            message: `Plan extended by ${additionalCycles} months for ${employerName}`,
            extension: {
                employerId,
                employerName,
                packageId: activePackage.id,
                previousCyclesTotal: activePackage.billingCyclesTotal,
                additionalCycles,
                newCyclesTotal: newBillingCyclesTotal,
                cyclesCompleted: activePackage.billingCyclesCompleted,
                cyclesRemaining: newBillingCyclesTotal - activePackage.billingCyclesCompleted,
                nextBillingDate: nextBillingDate.toISOString(),
                amountPerCycle: amountCents,
                wasReactivated: wasCompleted
            }
        })
    } catch (error) {
        console.error("Error extending exclusive plan:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
