/**
 * PayPal Charge Billing Agreement API
 *
 * PURPOSE: Charge an existing saved PayPal billing agreement without requiring redirect
 * This enables "Use Saved PayPal" functionality for repeat purchases
 *
 * Flow:
 * 1. User selects saved PayPal payment method
 * 2. Frontend calls this endpoint with billing agreement ID and amount
 * 3. This endpoint charges the billing agreement via Reference Transaction
 * 4. Returns success/failure immediately (no redirect needed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { getPayPalClient, isPayPalPaymentMethod, extractBillingAgreementId } from '@/lib/paypal';
import { getEmployerPackageById } from '@/lib/employer-packages';
import { getServiceById } from '@/lib/additional-services';
import { getAddOnById } from '@/lib/addons-config';
import { inAppNotificationService } from '@/lib/in-app-notification-service';
import { NotificationService } from '@/lib/notification-service';
import { PackageType, MembershipPlan } from '@prisma/client';
import { SEEKER_SUBSCRIPTION_PLANS } from '@/lib/subscription-plans';

// Seeker membership plans mapping (matches execute-billing-agreement)
const MEMBERSHIP_PLANS: Record<string, { name: string; price: number; billing: string; duration: number; trialDays?: number; plan: MembershipPlan }> = {
    'trial': {
        name: '3 Day Free Trial Subscription',
        price: 34.99,
        billing: 'month',
        duration: 33,
        trialDays: 3,
        plan: 'trial_monthly'
    },
    'gold': {
        name: 'Gold Mom Professional',
        price: 49.99,
        billing: '2 months',
        duration: 60,
        plan: 'gold_bimonthly'
    },
    'vip-platinum': {
        name: 'VIP Platinum Mom Professional',
        price: 79.99,
        billing: '3 months',
        duration: 90,
        plan: 'vip_quarterly'
    },
    'annual-platinum': {
        name: 'Annual Platinum Mom Professional',
        price: 299.00,
        billing: 'year',
        duration: 365,
        plan: 'annual_platinum'
    }
};

// Generate unique request ID for logging
function generateRequestId(): string {
    return `PPCHARGE_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
}

export async function POST(request: NextRequest) {
    const requestId = generateRequestId();
    console.log(`🅿️ [${requestId}] PayPal charge billing agreement request received`);

    try {
        // ====== AUTHENTICATION ======
        const { userId: clerkUserId } = await auth();

        if (!clerkUserId) {
            console.log(`❌ [${requestId}] Unauthorized - no clerk user`);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user profile
        const userProfile = await db.userProfile.findUnique({
            where: { clerkUserId },
            include: {
                employer: true,
                jobSeeker: true,
            }
        });

        if (!userProfile) {
            console.log(`❌ [${requestId}] User profile not found for clerk ID: ${clerkUserId}`);
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
        }

        // ====== PARSE REQUEST BODY ======
        const body = await request.json();
        const {
            paymentMethodId,
            amount,
            description,
            // For employer packages
            packageId,
            addOnIds,
            // For seeker services
            serviceId,
            // For seeker subscriptions
            planId,
        } = body;

        console.log(`📋 [${requestId}] Request params:`, {
            userId: userProfile.id,
            paymentMethodId,
            amount,
            packageId,
            serviceId,
            planId,
            hasAddOns: addOnIds?.length > 0
        });

        // ====== VALIDATE REQUIRED FIELDS ======
        if (!paymentMethodId) {
            return NextResponse.json({ error: 'Payment method ID is required' }, { status: 400 });
        }

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
        }

        // ====== GET PAYMENT METHOD ======
        const isSeeker = !!userProfile.jobSeeker;
        const isEmployer = !!userProfile.employer;

        const paymentMethod = await db.paymentMethod.findFirst({
            where: {
                id: paymentMethodId,
                ...(isSeeker ? { seekerId: userProfile.id } : {}),
                ...(isEmployer ? { employerId: userProfile.id } : {}),
            }
        });

        if (!paymentMethod) {
            console.log(`❌ [${requestId}] Payment method not found: ${paymentMethodId}`);
            return NextResponse.json({ error: 'Payment method not found' }, { status: 404 });
        }

        // ====== VERIFY IT'S A PAYPAL METHOD ======
        if (!paymentMethod.authnetPaymentProfileId || !isPayPalPaymentMethod(paymentMethod.authnetPaymentProfileId)) {
            console.log(`❌ [${requestId}] Not a PayPal payment method:`, paymentMethod.authnetPaymentProfileId);
            return NextResponse.json({
                error: 'Invalid payment method',
                details: 'This endpoint only supports PayPal billing agreements. Use the standard checkout for credit cards.'
            }, { status: 400 });
        }

        // ====== EXTRACT BILLING AGREEMENT ID ======
        const billingAgreementId = extractBillingAgreementId(paymentMethod.authnetPaymentProfileId);

        if (!billingAgreementId) {
            console.log(`❌ [${requestId}] Could not extract billing agreement ID from:`, paymentMethod.authnetPaymentProfileId);
            return NextResponse.json({ error: 'Invalid PayPal billing agreement' }, { status: 400 });
        }

        console.log(`💳 [${requestId}] Using billing agreement: ${billingAgreementId}`);

        // ====== BUILD CHARGE DESCRIPTION ======
        let chargeDescription = description || 'Purchase';
        let invoiceNumber = `PP-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        let employerPackageConfig: ReturnType<typeof getEmployerPackageById> | undefined;
        let addOnConfigs: { id: string; name: string; price: number }[] = [];

        if (packageId) {
            // Employer package purchase - use config
            employerPackageConfig = getEmployerPackageById(packageId);
            if (employerPackageConfig) {
                // Build detailed description with add-on breakdown
                let descriptionParts = [`${employerPackageConfig.name} ($${employerPackageConfig.price.toFixed(2)})`];

                if (addOnIds?.length > 0) {
                    for (const addOnId of addOnIds) {
                        const addOnConfig = getAddOnById(addOnId);
                        if (addOnConfig) {
                            addOnConfigs.push({ id: addOnId, name: addOnConfig.name, price: addOnConfig.price });
                            descriptionParts.push(`${addOnConfig.name} ($${addOnConfig.price.toFixed(2)})`);
                        }
                    }
                }

                chargeDescription = `${userProfile.employer?.companyName || 'Employer'}: ${descriptionParts.join(' + ')}`;
            }
        } else if (serviceId) {
            // Seeker service purchase
            const service = getServiceById(serviceId);
            if (service) {
                chargeDescription = `${service.name} - Premium Service`;
            }
        } else if (planId) {
            // Seeker subscription
            chargeDescription = `Subscription - ${planId}`;
        }

        // ====== EXECUTE PAYPAL CHARGE ======
        console.log(`💰 [${requestId}] Charging PayPal:`, {
            billingAgreementId,
            amount,
            description: chargeDescription
        });

        // ====== BUILD PAYPAL LINE ITEMS FOR MERCHANT DASHBOARD ======
        const paypalLineItems: { name: string; quantity: string; price: string; description?: string }[] = [];

        if (packageId && employerPackageConfig) {
            // Add main package as first item
            paypalLineItems.push({
                name: employerPackageConfig.name,
                quantity: '1',
                price: employerPackageConfig.price.toFixed(2),
                description: `Ampertalent ${employerPackageConfig.name}`
            });

            // Add each add-on as separate line item
            for (const addOn of addOnConfigs) {
                paypalLineItems.push({
                    name: addOn.name,
                    quantity: '1',
                    price: addOn.price.toFixed(2),
                    description: `Add-on: ${addOn.name}`
                });
            }
        } else if (serviceId) {
            const service = getServiceById(serviceId);
            if (service) {
                paypalLineItems.push({
                    name: service.name,
                    quantity: '1',
                    price: amount.toFixed(2),
                    description: `Ampertalent ${service.name}`
                });
            }
        } else if (planId) {
            paypalLineItems.push({
                name: `Subscription: ${planId}`,
                quantity: '1',
                price: amount.toFixed(2),
                description: `Ampertalent Subscription`
            });
        }

        const paypalClient = getPayPalClient();
        const chargeResult = await paypalClient.chargeReferenceTransaction({
            billingAgreementId,
            amount,
            currency: 'USD',
            description: chargeDescription,
            invoiceNumber,
            items: paypalLineItems.length > 0 ? paypalLineItems : undefined
        });

        if (!chargeResult.success) {
            console.error(`❌ [${requestId}] PayPal charge failed:`, chargeResult.error, chargeResult.errorDetails);
            return NextResponse.json({
                success: false,
                error: chargeResult.error || 'Payment failed',
                errorDetails: chargeResult.errorDetails,
                message: 'PayPal payment could not be processed. Please try again or use a different payment method.'
            }, { status: 400 });
        }

        console.log(`✅ [${requestId}] PayPal charge successful:`, {
            transactionId: chargeResult.transactionId,
            saleId: chargeResult.saleId
        });

        // ====== CREATE DATABASE RECORDS ======
        let externalPaymentId: string | undefined;
        let employerPackageRecordId: string | undefined;
        let servicePurchaseId: string | undefined;
        let subscriptionId: string | undefined;

        // PRODUCTION FORMAT: PAYPAL_B-xxx (underscore + billing agreement ID)
        // This format is used by: Sales page PayPal badge, Admin analytics, Reports
        // We use billingAgreementId NOT transactionId to match production data format
        const paypalTransactionRef = `PAYPAL_${billingAgreementId}`;

        try {
            // Create external payment record
            const externalPayment = await db.externalPayment.create({
                data: {
                    userId: userProfile.id,
                    ghlTransactionId: paypalTransactionRef,
                    authnetTransactionId: chargeResult.saleId || chargeResult.transactionId || null,
                    amount: amount,
                    planId: packageId || serviceId || planId || 'paypal_charge',
                    status: 'completed',
                    webhookProcessedAt: new Date()
                }
            });
            externalPaymentId = externalPayment.id;
            console.log(`✅ [${requestId}] External payment created: ${externalPaymentId}`);

            // Handle specific purchase types
            if (packageId && isEmployer && employerPackageConfig) {
                // Create employer package record using config from lib/employer-packages
                const packageRecordId = `pkg_pp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const expiresAt = new Date(Date.now() + employerPackageConfig.duration * 24 * 60 * 60 * 1000);

                // Map package ID to PackageType enum
                const packageTypeMap: Record<string, PackageType> = {
                    'standard': 'standard_job_post',
                    'featured': 'featured_job_post',
                    'email_blast': 'solo_email_blast',
                    'gold_plus': 'gold_plus_6_month',
                    'concierge_lite': 'concierge_lite',
                    'concierge_level_1': 'concierge_level_1',
                    'concierge_level_2': 'concierge_level_2',
                    'concierge_level_3': 'concierge_level_3',
                };
                const packageType = packageTypeMap[packageId] || 'standard_job_post';

                const createdPackage = await db.employerPackage.create({
                    data: {
                        id: packageRecordId,
                        employerId: userProfile.id,
                        packageType: packageType,
                        listingsRemaining: employerPackageConfig.listings,
                        featuredListingsRemaining: employerPackageConfig.featuredListings,
                        expiresAt: expiresAt,
                        purchasedAt: new Date(),
                    }
                });

                // Update employer's current package
                await db.employer.update({
                    where: { userId: userProfile.id },
                    data: { currentPackageId: packageRecordId }
                });

                employerPackageRecordId = packageRecordId;
                console.log(`✅ [${requestId}] Employer package created: ${packageRecordId} (${employerPackageConfig.name})`);

                // Process add-ons if any
                if (addOnIds?.length > 0) {
                    for (const addOnId of addOnIds) {
                        try {
                            const addOnConfig = getAddOnById(addOnId);
                            if (addOnConfig) {
                                // Create PurchasedAddOn record
                                const purchasedAddOn = await db.purchasedAddOn.create({
                                    data: {
                                        addOnId: addOnId,
                                        employerPackageId: packageRecordId,
                                        quantity: 1,
                                        price: addOnConfig.price,
                                        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                                    },
                                });
                                console.log(`✅ [${requestId}] Add-on created: ${purchasedAddOn.id} for ${addOnConfig.name}`);
                            }
                        } catch (addOnError) {
                            console.error(`⚠️ [${requestId}] Error processing add-on ${addOnId}:`, addOnError);
                        }
                    }
                }

                // ====== CREATE INVOICE RECORD (mirrors AuthNet billing/purchase route) ======
                // authnetTransactionId is intentionally null — PayPal ref is in external_payments.ghl_transaction_id
                try {
                    const invoiceDescription = addOnConfigs.length > 0
                        ? `${employerPackageConfig.name} + ${addOnConfigs.map(a => a.name).join(', ')} - ${userProfile.employer?.companyName || userProfile.name}`
                        : `${employerPackageConfig.name} - ${userProfile.employer?.companyName || userProfile.name}`;

                    await db.invoice.create({
                        data: {
                            employerPackageId: packageRecordId,
                            authnetTransactionId: null,
                            amountDue: Math.round(amount * 100),
                            status: 'paid',
                            description: invoiceDescription,
                            packageName: employerPackageConfig.name,
                            paidAt: new Date(),
                        }
                    });
                    console.log(`✅ [${requestId}] Invoice record created for saved PayPal employer package: ${packageRecordId} ($${amount})`);
                } catch (invoiceError) {
                    console.error(`⚠️ [${requestId}] Failed to create invoice record (non-blocking):`, invoiceError);
                }
            } else if (serviceId && isSeeker) {
                // Create service purchase record
                const purchaseId = `asp_pp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                await db.$executeRaw`
                    INSERT INTO additional_service_purchases (id, service_id, user_id, seeker_id, amount_paid, status, payment_id, created_at, updated_at)
                    VALUES (${purchaseId}, ${serviceId}, ${userProfile.id}, ${userProfile.id}, ${amount}, 'pending', ${externalPaymentId}, NOW(), NOW())
                `;
                servicePurchaseId = purchaseId;
                console.log(`✅ [${requestId}] Service purchase created: ${purchaseId}`);
            } else if (planId && isSeeker) {
                // ====== SEEKER SUBSCRIPTION ACTIVATION ======
                // This was MISSING - causing saved PayPal subscriptions to not activate!
                console.log(`🎯 [${requestId}] Activating seeker subscription: ${planId}`);

                const planDetails = MEMBERSHIP_PLANS[planId];
                if (!planDetails) {
                    console.error(`❌ [${requestId}] Plan not found in MEMBERSHIP_PLANS: ${planId}`);
                } else {
                    const now = new Date();
                    const isTrial = planId === 'trial';

                    // Calculate subscription end date based on plan duration (in days)
                    const endDate = new Date(now.getTime() + planDetails.duration * 24 * 60 * 60 * 1000);

                    // Check for existing active subscription (most recent first)
                    const existingSubscription = await db.subscription.findFirst({
                        where: { seekerId: userProfile.id, status: 'active' },
                        orderBy: { createdAt: 'desc' },
                    });

                    if (!existingSubscription) {
                        // Create new subscription
                        const subscription = await db.subscription.create({
                            data: {
                                seekerId: userProfile.id,
                                plan: planDetails.plan,
                                status: 'active',
                                currentPeriodStart: now,
                                currentPeriodEnd: endDate,
                            }
                        });
                        subscriptionId = subscription.id;
                        console.log(`✅ [${requestId}] Created subscription: ${subscription.id} for plan: ${planId}`);
                    } else {
                        // Update existing subscription to new plan
                        const oldPlan = existingSubscription.plan;
                        await db.subscription.update({
                            where: { id: existingSubscription.id },
                            data: {
                                plan: planDetails.plan,
                                status: 'active',
                                currentPeriodStart: now,
                                currentPeriodEnd: endDate,
                                updatedAt: now,
                            }
                        });
                        subscriptionId = existingSubscription.id;
                        console.log(`✅ [${requestId}] Updated subscription ${existingSubscription.id}: ${oldPlan} → ${planDetails.plan}`);
                    }

                    // Update job seeker with membership plan
                    await db.jobSeeker.update({
                        where: { userId: userProfile.id },
                        data: {
                            membershipPlan: planDetails.plan,
                            membershipExpiresAt: endDate,
                            isOnTrial: isTrial,
                            trialEndsAt: isTrial ? new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) : null,
                        }
                    });

                    console.log(`✅ [${requestId}] Job seeker updated with membership plan: ${planDetails.plan}, expires: ${endDate.toISOString()}`);
                }
            }

        } catch (dbError) {
            console.error(`❌ [${requestId}] Database error (payment was successful):`, dbError);
            // Payment succeeded but DB failed - log for manual reconciliation
            // Don't return error to user since money was collected
        }

        // ====== SEND NOTIFICATIONS (Match AuthNet behavior) ======
        try {
            if (packageId && isEmployer && employerPackageConfig) {
                const hasAddOns = addOnConfigs.length > 0;
                const purchaseDescription = hasAddOns
                    ? `${employerPackageConfig.name} + ${addOnConfigs.map(a => a.name).join(', ')}`
                    : employerPackageConfig.name;

                // 1. ADMIN NOTIFICATION - Notify all admins/super_admins about payment received
                await inAppNotificationService.notifyPaymentReceived(
                    userProfile.id,
                    userProfile.employer?.companyName || userProfile.name || 'Employer',
                    amount,
                    purchaseDescription,
                    'employer'
                );
                console.log(`📢 [${requestId}] Admin notification sent: Payment received $${amount} for ${purchaseDescription}`);

                // 2. EMPLOYER NOTIFICATION - Use proper method with real-time toast (like AuthNet)
                await inAppNotificationService.notifyEmployerPaymentConfirmation(
                    userProfile.id,
                    amount,
                    `Package purchase: ${purchaseDescription}`,
                    chargeResult.transactionId || `PAYPAL_${billingAgreementId}`,
                    employerPackageConfig.name,
                    employerPackageConfig.listings
                );
                console.log(`✅ [${requestId}] Employer payment confirmation notification sent`);

                // 3. EXTERNAL WEBHOOK - Send to external systems (like GHL, etc)
                try {
                    const { ExternalWebhookService } = await import('@/lib/external-webhook-service');
                    await ExternalWebhookService.sendEmployerPaymentConfirmation({
                        userId: userProfile.id,
                        email: userProfile.email || '',
                        firstName: userProfile.firstName || userProfile.name || '',
                        amount: amount,
                        description: `Package purchase: ${purchaseDescription}`,
                        transactionId: chargeResult.transactionId || `PAYPAL_${billingAgreementId}`,
                        packageName: purchaseDescription,
                    });
                    console.log(`✅ [${requestId}] External webhook sent for employer payment`);
                } catch (webhookError) {
                    console.error(`⚠️ [${requestId}] External webhook error (non-blocking):`, webhookError);
                }

                // 4. If has add-ons, send individual add-on notifications
                if (hasAddOns) {
                    for (const addOnConfig of addOnConfigs) {
                        await inAppNotificationService.createNotification({
                            userId: userProfile.id,
                            type: 'system_alert',
                            title: `${addOnConfig.name} Added`,
                            message: `${addOnConfig.name} has been added to your package for $${addOnConfig.price.toFixed(2)}.`,
                            actionUrl: '/employer/dashboard',
                            data: {
                                addOnId: addOnConfig.id,
                                addOnName: addOnConfig.name,
                                addOnPrice: addOnConfig.price,
                                packageId: employerPackageRecordId,
                                packageName: employerPackageConfig.name
                            }
                        });
                        console.log(`✅ [${requestId}] Add-on notification sent for ${addOnConfig.name}`);
                    }
                }

                // 5. ADMIN ORDER EMAIL - Send admin order notification via Resend
                try {
                    const orderDate = new Date();
                    const orderDateFormatted = orderDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    const orderTimeFormatted = orderDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZoneName: 'short'
                    });
                    const orderSuffix = (chargeResult.transactionId || billingAgreementId).slice(-4);
                    const orderNumber = `ORD-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${orderSuffix}`;

                    // Build line items for add-on breakdown
                    let lineItems: Array<{ name: string; quantity: number; price: number }> | undefined;
                    if (hasAddOns && addOnConfigs.length > 0) {
                        lineItems = [
                            { name: employerPackageConfig.name, quantity: 1, price: employerPackageConfig.price }
                        ];
                        for (const addOn of addOnConfigs) {
                            lineItems.push({ name: addOn.name, quantity: 1, price: addOn.price });
                        }
                    }

                    // Parse billing address from employer profile
                    let billingAddressObj: { name?: string; address?: string; city?: string; state?: string; zip?: string; country?: string } | undefined;
                    if (userProfile.employer?.billingAddress) {
                        const addressParts = userProfile.employer.billingAddress.split(',').map(s => s.trim());
                        if (addressParts.length >= 3) {
                            billingAddressObj = {
                                name: userProfile.name || userProfile.employer.companyName || undefined,
                                address: addressParts[0],
                                city: addressParts.length >= 3 ? addressParts[addressParts.length - 3] : undefined,
                                state: addressParts.length >= 2 ? addressParts[addressParts.length - 2]?.split(' ')[0] : undefined,
                                zip: addressParts.length >= 2 ? addressParts[addressParts.length - 2]?.split(' ')[1] : undefined,
                                country: addressParts[addressParts.length - 1]
                            };
                        } else {
                            billingAddressObj = {
                                name: userProfile.name || userProfile.employer.companyName || undefined,
                                address: userProfile.employer.billingAddress
                            };
                        }
                    }

                    await NotificationService.sendAdminPaymentNotification({
                        orderNumber,
                        orderDate: `${orderDateFormatted} at ${orderTimeFormatted}`,
                        customerName: userProfile.name || userProfile.employer?.companyName || 'Unknown',
                        customerType: 'Employer',
                        customerId: `USR-${userProfile.id.slice(-4).toUpperCase()}`,
                        customerEmail: userProfile.email || '',
                        productDescription: purchaseDescription,
                        quantity: 1,
                        price: Number(amount),
                        lineItems,
                        billingAddress: billingAddressObj,
                        isRenewal: false,
                        paymentMethod: 'PayPal',
                        transactionId: chargeResult.transactionId || `PAYPAL_${billingAgreementId}`,
                        paymentType: 'paypal',
                    });

                    console.log(`✅ [${requestId}] Admin order notification email sent for employer package`);

                    // gold_plus = 6-month recurring → show "When cancelled"; all other packages = single purchase → no "When cancelled"
                    await NotificationService.sendCustomerPaymentConfirmationEmail({
                        email: userProfile.email || '',
                        firstName: userProfile.firstName || userProfile.name || userProfile.employer?.companyName || 'Valued Customer',
                        lastName: userProfile.lastName || undefined,
                        amount: Number(amount),
                        description: purchaseDescription,
                        transactionId: chargeResult.transactionId || `PAYPAL_${billingAgreementId}`,
                        lineItems: lineItems?.map(item => ({ name: item.name, amount: Number(item.price) })) || [{ name: purchaseDescription, amount: Number(amount) }],
                        isRecurring: packageId !== 'gold_plus',
                        paymentType: 'paypal',
                    });
                    console.log(`✅ [${requestId}] Customer payment confirmation email queued for employer package`);
                } catch (emailError) {
                    console.error(`⚠️ [${requestId}] Email notification failed (non-blocking):`, emailError);
                }

            } else if (serviceId && isSeeker) {
                const service = getServiceById(serviceId);

                // 1. ADMIN NOTIFICATION - Notify admins about service purchase
                if (service) {
                    await inAppNotificationService.notifyAdminServicePurchase(
                        service.name,
                        userProfile.name || 'User',
                        service.price,
                        chargeResult.transactionId || `PAYPAL_${billingAgreementId}`
                    );
                    console.log(`📢 [${requestId}] Admin notification sent: Service purchase ${service.name}`);

                    // 2. SEEKER NOTIFICATION - Use notifyServicePurchaseConfirmation for real-time 'service_purchase' event
                    // This is critical for the NotificationCenterProvider to refresh the notification panel
                    await inAppNotificationService.notifyServicePurchaseConfirmation(
                        userProfile.id,
                        service.name,
                        Number(service.price),
                        servicePurchaseId || `PAYPAL_${billingAgreementId}`
                    );
                    console.log(`✅ [${requestId}] Service purchase confirmation notification sent (real-time)`);

                    // 3. ADMIN ORDER EMAIL - Send admin order notification via Resend
                    try {
                        const orderDate = new Date();
                        const orderDateFormatted = orderDate.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                        const orderTimeFormatted = orderDate.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            timeZoneName: 'short'
                        });
                        const orderSuffix = (chargeResult.transactionId || billingAgreementId).slice(-4);
                        const orderNumber = `ORD-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${orderSuffix}`;

                        await NotificationService.sendAdminPaymentNotification({
                            orderNumber,
                            orderDate: `${orderDateFormatted} at ${orderTimeFormatted}`,
                            customerName: userProfile.name || userProfile.firstName || 'Unknown',
                            customerType: 'Seeker',
                            customerId: `USR-${userProfile.id.slice(-4).toUpperCase()}`,
                            customerEmail: userProfile.email || '',
                            productDescription: `${service.name} (One-time Service)`,
                            quantity: 1,
                            price: Number(service.price),
                            isRenewal: false,
                            paymentMethod: 'PayPal',
                            transactionId: chargeResult.transactionId || `PAYPAL_${billingAgreementId}`,
                            paymentType: 'paypal',
                        });

                        console.log(`✅ [${requestId}] Admin order notification email sent for seeker service`);

                        // Send customer payment confirmation email - queued with feature flag
                        await NotificationService.sendCustomerPaymentConfirmationEmail({
                            email: userProfile.email || '',
                            firstName: userProfile.firstName || userProfile.name || 'Valued Customer',
                            lastName: userProfile.lastName || undefined,
                            amount: Number(service.price),
                            description: `${service.name} (One-time Service)`,
                            transactionId: chargeResult.transactionId || `PAYPAL_${billingAgreementId}`,
                            lineItems: [{ name: service.name, amount: Number(service.price) }],
                            isRecurring: true,
                            paymentType: 'paypal',
                        });
                        console.log(`✅ [${requestId}] Customer payment confirmation email queued for seeker service`);
                    } catch (emailError) {
                        console.error(`⚠️ [${requestId}] Email notification failed (non-blocking):`, emailError);
                    }
                }

            } else if (planId && isSeeker) {
                // Seeker subscription via saved PayPal
                const planInfo = SEEKER_SUBSCRIPTION_PLANS.find(p => p.id === planId);

                // 1. ADMIN NOTIFICATION
                await inAppNotificationService.notifyPaymentReceived(
                    userProfile.id,
                    userProfile.name || 'User',
                    amount,
                    planId,
                    'seeker'
                );
                console.log(`📢 [${requestId}] Admin notification sent: Subscription payment ${planId}`);

                // 2. SEEKER NOTIFICATION
                await inAppNotificationService.notifySeekerPaymentConfirmation(
                    userProfile.id,
                    amount,
                    `Subscription: ${planId}`,
                    chargeResult.transactionId || `PAYPAL_${billingAgreementId}`,
                    planId
                );
                console.log(`✅ [${requestId}] Seeker subscription confirmation notification sent`);

                // 3. ADMIN ORDER EMAIL - Send admin order notification via Resend
                try {
                    const orderDate = new Date();
                    const orderDateFormatted = orderDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    const orderTimeFormatted = orderDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZoneName: 'short'
                    });
                    const orderSuffix = (chargeResult.transactionId || billingAgreementId).slice(-4);
                    const orderNumber = `ORD-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${orderSuffix}`;

                    // Calculate next payment date based on plan billing cycle
                    // For trials: next payment is when trial ends (3 days from signup), NOT the recurring billing period
                    let nextPaymentDateStr: string | undefined;
                    if (planInfo) {
                        const isTrial = planId === 'trial';
                        const nextDate = new Date();
                        if (isTrial) {
                            // Trial ends in 3 days - that's when the first charge happens
                            nextDate.setDate(nextDate.getDate() + 3);
                        } else if (planInfo.billing === 'month') {
                            nextDate.setMonth(nextDate.getMonth() + 1);
                        } else if (planInfo.billing === '2 months') {
                            nextDate.setMonth(nextDate.getMonth() + 2);
                        } else if (planInfo.billing === '3 months') {
                            nextDate.setMonth(nextDate.getMonth() + 3);
                        } else if (planInfo.billing === 'year') {
                            nextDate.setFullYear(nextDate.getFullYear() + 1);
                        }
                        nextPaymentDateStr = nextDate.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                    }

                    // For trials: show $0 charged, indicate it's a trial
                    const isTrial = planId === 'trial';
                    const displayPrice = isTrial ? 0 : Number(amount);
                    const productDescription = isTrial
                        ? `${planInfo?.name || 'Trial'} (Free Trial - No Charge Today)`
                        : (planInfo?.name || `Subscription: ${planId}`);

                    await NotificationService.sendAdminPaymentNotification({
                        orderNumber,
                        orderDate: `${orderDateFormatted} at ${orderTimeFormatted}`,
                        customerName: userProfile.name || userProfile.firstName || 'Unknown',
                        customerType: 'Seeker',
                        customerId: `USR-${userProfile.id.slice(-4).toUpperCase()}`,
                        customerEmail: userProfile.email || '',
                        customerPhone: userProfile.phone || undefined,
                        productDescription,
                        quantity: 1,
                        price: displayPrice,
                        subscriptionStartDate: orderDateFormatted,
                        nextPaymentDate: nextPaymentDateStr,
                        recurringTotal: planInfo ? `$${planInfo.price.toFixed(2)} / ${planInfo.billing}` : undefined,
                        isRenewal: false,
                        paymentMethod: 'PayPal',
                        transactionId: chargeResult.transactionId || `PAYPAL_${billingAgreementId}`,
                        paymentType: 'paypal',
                    });

                    console.log(`✅ [${requestId}] Admin order notification email sent for seeker subscription`);

                    // Send customer payment confirmation email - queued with feature flag
                    await NotificationService.sendCustomerPaymentConfirmationEmail({
                        email: userProfile.email || '',
                        firstName: userProfile.firstName || userProfile.name || 'Valued Customer',
                        lastName: userProfile.lastName || undefined,
                        amount: displayPrice,
                        description: productDescription,
                        transactionId: chargeResult.transactionId || `PAYPAL_${billingAgreementId}`,
                        lineItems: [{ name: productDescription, amount: displayPrice }],
                        isTrial: isTrial,
                        isRecurring: false,
                        paymentType: 'paypal',
                    });
                    console.log(`✅ [${requestId}] Customer payment confirmation email queued for seeker subscription`);
                } catch (emailError) {
                    console.error(`⚠️ [${requestId}] Email notification failed (non-blocking):`, emailError);
                }
            }
        } catch (notifyError) {
            console.error(`⚠️ [${requestId}] Notification error (non-blocking):`, notifyError);
        }

        // ====== GHL SYNC ======
        // Note: GHL sync not implemented in ampertalent (uses mock service)
        console.log(`ℹ️ [${requestId}] GHL sync skipped - not implemented in ampertalent`);

        // ====== RETURN SUCCESS ======
        return NextResponse.json({
            success: true,
            transactionId: chargeResult.transactionId,
            saleId: chargeResult.saleId,
            externalPaymentId,
            employerPackageId: employerPackageRecordId,
            servicePurchaseId,
            subscriptionId,
            amount,
            message: 'Payment processed successfully'
        });

    } catch (error) {
        console.error(`❌ [${requestId}] Unexpected error:`, error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: 'An unexpected error occurred. Please try again.'
            },
            { status: 500 }
        );
    }
}