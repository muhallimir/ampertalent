import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { InAppNotificationService } from "@/lib/in-app-notification-service"
import { NotificationService } from "@/lib/notification-service"

/**
 * POST /api/admin/exclusive-offers/extension-request/review
 * 
 * Admin approves or rejects an employer's extension request.
 */
export async function POST(request: NextRequest) {
    try {
        // Check authentication and get current user
        const authData = await getCurrentUser()
        if (!authData?.profile) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Verify admin role
        if (authData.profile.role !== "admin" && authData.profile.role !== "super_admin") {
            return NextResponse.json(
                { error: "Forbidden: Only admins can review extension requests" },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { packageId, action } = body

        if (!packageId) {
            return NextResponse.json({ error: "Package ID is required" }, { status: 400 })
        }

        if (!action || !['approve', 'reject'].includes(action)) {
            return NextResponse.json({ error: "Action must be 'approve' or 'reject'" }, { status: 400 })
        }

        // Get the package with pending extension request
        const employerPackage = await db.employerPackage.findFirst({
            where: {
                id: packageId,
                extensionRequestStatus: 'pending'
            },
            include: {
                employer: {
                    include: {
                        user: {
                            select: { email: true, firstName: true, lastName: true, name: true }
                        }
                    }
                }
            }
        })

        if (!employerPackage) {
            return NextResponse.json(
                { error: "No pending extension request found for this package" },
                { status: 404 }
            )
        }

        const employer = employerPackage.employer
        const employerName = employer.user.name ||
            [employer.user.firstName, employer.user.lastName].filter(Boolean).join(' ') ||
            employer.companyName
        const employerEmail = employer.user.email || ''
        const requestedMonths = employerPackage.extensionRequestedMonths || 6
        const amountCents = employerPackage.recurringAmountCents || 9700

        if (action === 'approve') {
            // Calculate new values (same logic as extend API)
            const newBillingCyclesTotal = (employerPackage.billingCyclesTotal || 6) + requestedMonths
            const wasCompleted = employerPackage.recurringStatus === 'completed'

            // Calculate next billing date if plan was completed
            let nextBillingDate = employerPackage.nextBillingDate
            if (wasCompleted || !nextBillingDate) {
                nextBillingDate = new Date()
                nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)
            }

            // Calculate new expiration date
            const newExpiresAt = new Date()
            const monthsRemaining = newBillingCyclesTotal - employerPackage.billingCyclesCompleted
            newExpiresAt.setMonth(newExpiresAt.getMonth() + monthsRemaining)

            // Update the package
            await db.employerPackage.update({
                where: { id: packageId },
                data: {
                    billingCyclesTotal: newBillingCyclesTotal,
                    nextBillingDate: nextBillingDate,
                    recurringStatus: 'active',
                    expiresAt: newExpiresAt,
                    extensionRequestStatus: 'approved',
                    extensionReviewedAt: new Date(),
                    extensionReviewedBy: authData.profile.id,
                    updatedAt: new Date()
                }
            })

            // Update all active jobs from this employer to match the new package expiration
            // This ensures jobs posted via the recurring 6-month plan have correct expiration
            await db.job.updateMany({
                where: {
                    employerId: employerPackage.employerId,
                    status: 'approved',
                    // Only update jobs created after the package was created
                    createdAt: { gte: employerPackage.createdAt }
                },
                data: {
                    expiresAt: newExpiresAt,
                    applicationDeadline: newExpiresAt
                }
            })

            // Notify employer about approval
            await InAppNotificationService.notifyEmployerExtensionApproved(
                employerPackage.employerId,
                requestedMonths,
                newBillingCyclesTotal,
                amountCents
            )

            // Log admin action
            await db.adminActionLog.create({
                data: {
                    adminId: authData.profile.id,
                    actionType: 'extension_request_approved',
                    targetEntity: 'employer_package',
                    targetId: packageId,
                    details: {
                        employerId: employerPackage.employerId,
                        employerName,
                        employerEmail,
                        requestedMonths,
                        previousCyclesTotal: employerPackage.billingCyclesTotal,
                        newCyclesTotal: newBillingCyclesTotal,
                        cyclesCompleted: employerPackage.billingCyclesCompleted,
                        wasCompleted,
                        nextBillingDate: nextBillingDate.toISOString(),
                        newExpiresAt: newExpiresAt.toISOString()
                    }
                }
            })

            // GHL SYNC: Add extension activity note to CRM
            try {
                const { createGHLService } = await import('@/lib/ghl-sync-service')
                const ghlService = await createGHLService()

                if (ghlService) {
                    // First sync the user (update contact)
                    const ghlContactId = await ghlService.syncUserToGHL(employerPackage.employerId, 'update')

                    // Then add an extension activity note
                    if (ghlContactId) {
                        await ghlService.addPurchaseActivityNote(
                            employerPackage.employerId,
                            'plan_extension',
                            {
                                planName: `+${requestedMonths} months (${employerPackage.billingCyclesTotal} → ${newBillingCyclesTotal} total)`,
                                packageNames: ['Employer Request (Approved)'],
                                duration: `${newBillingCyclesTotal} months`,
                                action: `Approved by ${authData.profile.email}`
                            },
                            ghlContactId
                        )
                        console.log(`📊 GHL: Extension request approval note added for ${employerEmail}`)
                    }
                }
            } catch (ghlError) {
                // Don't fail the request if GHL sync fails
                console.error('⚠️ GHL sync failed for extension approval (non-blocking):', ghlError)
            }

            console.log(`✅ Extension request APPROVED for ${employerEmail} by admin ${authData.profile.email}`)

            // EMAILS: Admin notification + customer confirmation for approved extension
            try {
                const orderDate = new Date()
                const orderSuffix = packageId.slice(-4).toUpperCase()
                const orderNumber = `EXT-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${orderSuffix}`
                const productDescription = `Exclusive Plan Extension Approved (+${requestedMonths} months → ${newBillingCyclesTotal} total)`

                // Admin notification email
                await NotificationService.sendAdminPaymentNotification({
                    orderNumber,
                    orderDate: orderDate.toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
                    }),
                    customerName: employerName,
                    customerType: 'Employer',
                    customerId: `EMP-${employerPackage.employerId.slice(-4).toUpperCase()}`,
                    customerEmail: employerEmail,
                    productDescription,
                    quantity: requestedMonths,
                    price: 0, // Employer-requested extension, no charge at approval time
                    subscriptionStartDate: orderDate.toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric'
                    }),
                    nextPaymentDate: nextBillingDate?.toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric'
                    }),
                    recurringTotal: `$${(amountCents / 100).toFixed(2)} / month`,
                    isRenewal: false,
                    paymentMethod: 'Employer Request — Approved',
                    paymentType: 'card',
                })
                console.log(`✅ EXTENSION-REVIEW: Admin notification email sent`)

                // Customer confirmation email (respects ENABLE_CUSTOMER_PAYMENT_EMAILS flag)
                await NotificationService.sendCustomerPaymentConfirmationEmail({
                    email: employerEmail,
                    firstName: employerName.split(' ')[0] || 'Valued Customer',
                    amount: 0,
                    description: productDescription,
                    transactionId: orderNumber,
                    lineItems: [{ name: productDescription, amount: 0 }],
                    isRecurring: true,
                    paymentType: 'card',
                })
                console.log(`✅ EXTENSION-REVIEW: Customer confirmation email sent to ${employerEmail}`)
            } catch (emailError) {
                console.warn('⚠️ EXTENSION-REVIEW: Email notification failed (non-blocking):', emailError)
            }

            return NextResponse.json({
                success: true,
                message: `Extension request approved! ${employerName}'s plan extended by ${requestedMonths} months.`,
                result: {
                    employerId: employerPackage.employerId,
                    employerName,
                    previousCyclesTotal: employerPackage.billingCyclesTotal,
                    newCyclesTotal: newBillingCyclesTotal,
                    requestedMonths
                }
            })
        } else {
            // Reject the request
            await db.employerPackage.update({
                where: { id: packageId },
                data: {
                    extensionRequestStatus: 'rejected',
                    extensionReviewedAt: new Date(),
                    extensionReviewedBy: authData.profile.id,
                    updatedAt: new Date()
                }
            })

            // Notify employer about rejection
            await InAppNotificationService.notifyEmployerExtensionRejected(
                employerPackage.employerId,
                requestedMonths
            )

            // Log admin action
            await db.adminActionLog.create({
                data: {
                    adminId: authData.profile.id,
                    actionType: 'extension_request_rejected',
                    targetEntity: 'employer_package',
                    targetId: packageId,
                    details: {
                        employerId: employerPackage.employerId,
                        employerName,
                        employerEmail,
                        requestedMonths,
                        currentCyclesTotal: employerPackage.billingCyclesTotal,
                        cyclesCompleted: employerPackage.billingCyclesCompleted
                    }
                }
            })

            console.log(`❌ Extension request REJECTED for ${employerEmail} by admin ${authData.profile.email}`)

            return NextResponse.json({
                success: true,
                message: `Extension request rejected for ${employerName}.`,
                result: {
                    employerId: employerPackage.employerId,
                    employerName,
                    requestedMonths,
                    status: 'rejected'
                }
            })
        }
    } catch (error) {
        console.error("Error reviewing extension request:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
