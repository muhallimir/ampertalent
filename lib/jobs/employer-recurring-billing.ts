import { db } from '../db';
import { CacheService } from '../redis';
import { inAppNotificationService } from '../in-app-notification-service';
import { isPayPalPaymentMethod, extractBillingAgreementId, getPayPalClient } from '../paypal';
import { NotificationService } from '../notification-service';
import { tryFallbackPaymentMethods, promoteToDefault } from './payment-fallback';
import { CronLogger, LogFormatter } from '../cron-logger';
import { sendBatchIndividualEmails, BatchEmailPayload } from '../resend';
import { emailTemplates } from '../email-templates';

/**
 * Employer Recurring Billing Service
 * 
 * Handles automatic recurring billing for employer exclusive plans.
 * This processes payments for exclusive offers (e.g., Gold Plus 6-Month Recurring)
 * when the next_billing_date has passed.
 * 
 * Payment Routing:
 * - PAYPAL|B-xxx format → PayPal Reference Transaction
 * - custId|payId format → Authorize.net CIM
 * 
 * This is completely isolated from the seeker recurring billing to prevent
 * any cross-contamination of billing logic.
 */
export class EmployerRecurringBillingService {
    /**
     * Process all employer packages due for recurring billing
     */

    /**
     * Safe wrapper for CronLogger.logAction - never throws.
     * Prevents action_log DB errors from breaking the cron flow.
     */
    private static async safeLogAction(cronLogId: string | undefined, action: import('../cron-logger').ActionLogInput): Promise<void> {
        if (!cronLogId) return;
        try {
            await CronLogger.logAction(cronLogId, action);
        } catch (logError) {
            console.warn('⚠️ [action_log] Failed to write employer action log (non-blocking):', logError);
        }
    }

    /**
     * Send renewal reminder emails to employers whose packages renew within the next 24 hours.
     * Matches seeker reminder behavior: one email per package, fired once by the daily cron,
     * the day before the actual charge.
     */
    static async sendRenewalReminders(): Promise<{
        sent: number;
        errors: string[];
    }> {
        const results = { sent: 0, errors: [] as string[] };

        try {
            const now = new Date();

            // Window: (now, now + 24h] — fires once when the daily cron runs the day before billing.
            // Mirrors seeker membership-reminders.ts exactly.
            const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            const upcomingPackages = await db.employerPackage.findMany({
                where: {
                    isRecurring: true,
                    recurringStatus: 'active',
                    nextBillingDate: {
                        gt: now,        // not already due
                        lte: windowEnd  // billing within next 24 hours
                    }
                },
                include: {
                    employer: {
                        select: {
                            companyName: true,
                            user: {
                                select: {
                                    email: true,
                                    firstName: true,
                                    name: true
                                }
                            },
                            paymentMethods: {
                                where: { isDefault: true },
                                select: { authnetPaymentProfileId: true, brand: true, last4: true },
                                take: 1
                            }
                        }
                    }
                }
            });

            console.log(`[Employer Recurring Billing] Found ${upcomingPackages.length} packages renewing within 24-hour window (1-day-before reminder).`);

            // Feature flag check
            if (process.env.ENABLE_CUSTOMER_PAYMENT_EMAILS !== 'true') {
                console.log('ℹ️ Customer subscription reminder emails disabled via ENABLE_CUSTOMER_PAYMENT_EMAILS flag');
                return results;
            }

            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hiremymom.com';

            // Build one payload per package, then fire a single batch API call
            const batchPayloads: BatchEmailPayload[] = [];

            for (const pkg of upcomingPackages) {
                const email = pkg.employer?.user?.email;
                if (!email) {
                    console.warn(`[Employer Reminder] No email for package ${pkg.id} — skipping`);
                    continue;
                }

                const firstName = pkg.employer?.user?.firstName || pkg.employer?.user?.name || pkg.employer?.companyName || 'Valued Client';
                const renewalDate = pkg.nextBillingDate!.toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric'
                });
                const amount = pkg.recurringAmountCents ? pkg.recurringAmountCents / 100 : 0;
                const planName = pkg.packageType || 'Exclusive Plan';
                const manageUrl = `${baseUrl}/employer/billing`;
                const daysUntilRenewal = Math.ceil(
                    (pkg.nextBillingDate!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
                );

                // Resolve payment method — "Card ending in XXXX" or "PayPal"
                const pm = pkg.employer?.paymentMethods?.[0];
                const paymentMethod = pm
                    ? (isPayPalPaymentMethod(pm.authnetPaymentProfileId)
                        ? 'PayPal'
                        : pm.last4 ? `Card ending in ${pm.last4}` : undefined)
                    : undefined;

                const template = emailTemplates.subscriptionReminder({
                    firstName,
                    plan: planName,
                    renewalDate,
                    amount,
                    manageUrl,
                    daysUntilRenewal,
                    paymentMethod
                });

                batchPayloads.push({
                    to: email,
                    subject: template.subject,
                    html: template.html,
                    text: template.text,
                    tags: [{ name: 'type', value: 'customer_subscription_reminder' }]
                });
            }

            if (batchPayloads.length > 0) {
                // One API call for all employer reminder emails
                const batchResult = await sendBatchIndividualEmails(batchPayloads);
                results.sent = batchResult.sent;
                results.errors.push(...batchResult.errors);

                batchPayloads.forEach(p => {
                    console.log(`✅ Employer renewal reminder queued for ${p.to}`);
                });
            }
        } catch (error) {
            console.error('[Employer Recurring Billing] sendRenewalReminders error:', error);
            results.errors.push(`Employer renewal reminder process failed: ${error}`);
        }

        return results;
    }

    static async processEmployerRecurringBilling(cronLogId?: string): Promise<{
        processed: number;
        successful: number;
        failed: number;
        completed: number;
        errors: string[];
    }> {
        const results = {
            processed: 0,
            successful: 0,
            failed: 0,
            completed: 0,
            errors: [] as string[]
        };

        try {
            console.log('🔄 [Employer Recurring Billing] Starting...');

            const now = new Date();

            // Find all employer packages due for billing
            // Criteria: is_recurring=true, recurring_status=active, next_billing_date <= NOW
            const allActiveRecurring = await db.employerPackage.findMany({
                where: {
                    isRecurring: true,
                    recurringStatus: 'active',
                    nextBillingDate: {
                        lte: now
                    }
                },
                include: {
                    employer: {
                        select: {
                            userId: true,
                            companyName: true,
                            billingAddress: true,
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    name: true
                                }
                            },
                            paymentMethods: {
                                orderBy: {
                                    createdAt: 'desc'
                                }
                            }
                        }
                    }
                }
            });

            // Filter to only packages that haven't completed all cycles
            const duePackages = allActiveRecurring.filter(pkg =>
                (pkg.billingCyclesCompleted || 0) < (pkg.billingCyclesTotal || 6)
            );

            console.log(`📦 [Employer Recurring Billing] Found ${duePackages.length} packages due for billing`);

            if (duePackages.length === 0) {
                return results;
            }

            for (const pkg of duePackages) {
                results.processed++;

                const employerId = pkg.employer?.user?.id || pkg.employerId;
                const employerName = pkg.employer?.user?.name || 'Unknown';
                const employerEmail = pkg.employer?.user?.email || '';
                const companyName = pkg.employer?.companyName || 'Unknown Company';
                const employerBillingAddressRaw = pkg.employer?.billingAddress || '';
                const cycleNumber = (pkg.billingCyclesCompleted || 0) + 1;
                const totalCycles = pkg.billingCyclesTotal || 6;
                const amount = Number(pkg.recurringAmountCents) || 9700; // $97.00 default

                // Parse billing address if available
                let parsedBillingAddress: { name?: string; address?: string; city?: string; state?: string; zip?: string; country?: string } | undefined;
                if (employerBillingAddressRaw) {
                    try {
                        // Try JSON parsing first
                        parsedBillingAddress = JSON.parse(employerBillingAddressRaw);
                    } catch {
                        // If not JSON, parse as formatted string: "Name | Address | City, State Zip | Country"
                        const parts = employerBillingAddressRaw.split('|').map(p => p.trim());
                        if (parts.length >= 3) {
                            const cityStateZip = parts[2] || '';
                            const cityStateMatch = cityStateZip.match(/^(.+),\s*([A-Z]{2})\s*(\d{5})?/);
                            parsedBillingAddress = {
                                name: parts[0],
                                address: parts[1],
                                city: cityStateMatch?.[1] || '',
                                state: cityStateMatch?.[2] || '',
                                zip: cityStateMatch?.[3] || '',
                                country: parts[3] || 'United States'
                            };
                        }
                    }
                }

                console.log(`💳 Processing ${companyName}: Cycle ${cycleNumber} of ${totalCycles} - $${(amount / 100).toFixed(2)}`);

                // Get all payment methods, prefer default
                const allPaymentMethods = pkg.employer?.paymentMethods || [];
                const defaultPaymentMethod = allPaymentMethods.find(pm => pm.isDefault) || allPaymentMethods[0];

                try {
                    if (!defaultPaymentMethod) {
                        console.error(`❌ No payment method for ${companyName}`);
                        results.failed++;
                        results.errors.push(`No payment method for ${companyName}`);

                        // Log to action_log
                        await this.safeLogAction(cronLogId, {
                            actionType: 'employer_renewal_skipped',
                            entityType: 'employer',
                            entityId: employerId,
                            status: 'failed',
                            message: `No payment method for ${companyName}`,
                            details: LogFormatter.skipped('No payment method found', {
                                plan: pkg.packageType || 'Exclusive Plan',
                                email: employerEmail,
                                entityId: employerId,
                            }),
                        });

                        // Mark as past_due
                        await db.employerPackage.update({
                            where: { id: pkg.id },
                            data: { recurringStatus: 'past_due' }
                        });
                        continue;
                    }

                    const paymentProfileId = defaultPaymentMethod.authnetPaymentProfileId;

                    if (!paymentProfileId) {
                        console.error(`❌ No payment profile ID for ${companyName}`);
                        results.failed++;
                        results.errors.push(`No payment profile ID for ${companyName}`);

                        // Log to action_log
                        await this.safeLogAction(cronLogId, {
                            actionType: 'employer_renewal_skipped',
                            entityType: 'employer',
                            entityId: employerId,
                            status: 'failed',
                            message: `No payment profile ID for ${companyName}`,
                            details: LogFormatter.skipped('No payment profile ID', {
                                plan: pkg.packageType || 'Exclusive Plan',
                                email: employerEmail,
                                entityId: employerId,
                            }),
                        });

                        await db.employerPackage.update({
                            where: { id: pkg.id },
                            data: { recurringStatus: 'past_due' }
                        });
                        continue;
                    }

                    // Process payment based on payment method type
                    let transactionId = '';
                    const isPayPal = isPayPalPaymentMethod(paymentProfileId);
                    const invoiceNumber = `EMP-R-${cycleNumber}-${pkg.id.slice(-6)}`;
                    const description = `${pkg.packageType || 'Exclusive Plan'} - Month ${cycleNumber} of ${totalCycles}`;

                    if (isPayPal) {
                        // ========== PAYPAL REFERENCE TRANSACTION ==========
                        transactionId = await this.processPayPalPayment(
                            paymentProfileId,
                            amount,
                            description,
                            invoiceNumber,
                            companyName
                        );
                    } else {
                        // ========== AUTHORIZE.NET CIM TRANSACTION ==========
                        transactionId = await this.processAuthNetPayment(
                            paymentProfileId,
                            amount,
                            description,
                            invoiceNumber,
                            companyName,
                            pkg.employer?.user?.email || ''
                        );
                    }

                    // Payment successful - create invoice and update package
                    const isFinal = cycleNumber >= totalCycles;

                    await db.invoice.create({
                        data: {
                            employerPackageId: pkg.id,
                            amountDue: amount,
                            status: 'paid',
                            description: isFinal ? `${description} (Final)` : description,
                            authnetTransactionId: transactionId,
                            paidAt: new Date()
                        }
                    });

                    // Also create an external_payment record so this recurring charge
                    // appears in the Sales transaction tab and is classified as R (Recurring).
                    // cycleNumber is always >= 2 here (activation sets billingCyclesCompleted=1).
                    await db.externalPayment.create({
                        data: {
                            userId: employerId,
                            authnetTransactionId: isPayPal ? null : transactionId,
                            ghlTransactionId: isPayPal ? `PAYPAL_${transactionId}` : null,
                            amount: amount / 100, // stored in dollars
                            planId: pkg.packageType || 'gold_plus_recurring_6mo',
                            status: 'completed',
                            webhookProcessedAt: new Date()
                        }
                    });

                    // Update package billing state
                    const nextBillingDate = isFinal ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    const newStatus = isFinal ? 'completed' : 'active';

                    await db.employerPackage.update({
                        where: { id: pkg.id },
                        data: {
                            billingCyclesCompleted: cycleNumber,
                            nextBillingDate,
                            recurringStatus: newStatus
                        }
                    });

                    // Send notifications
                    await this.sendPaymentNotifications(
                        employerId,
                        employerName,
                        employerEmail,
                        companyName,
                        pkg.packageType || 'Exclusive Plan',
                        amount,
                        cycleNumber,
                        totalCycles,
                        isFinal,
                        transactionId,
                        isPayPal ? 'PayPal' : 'Credit Card',
                        parsedBillingAddress,
                        defaultPaymentMethod
                    );

                    if (isFinal) {
                        results.completed++;
                        console.log(`✅ ${companyName}: Plan COMPLETED (${totalCycles}/${totalCycles})`);
                    } else {
                        results.successful++;
                        console.log(`✅ ${companyName}: Payment successful (${cycleNumber}/${totalCycles})`);
                    }

                    // Log success to action_log
                    await this.safeLogAction(cronLogId, {
                        actionType: isFinal ? 'employer_plan_completed' : 'employer_renewal_success',
                        entityType: 'employer',
                        entityId: employerId,
                        status: 'success',
                        message: isFinal
                            ? `Plan completed (${totalCycles}/${totalCycles}) - $${(amount / 100).toFixed(2)}`
                            : `Payment successful (${cycleNumber}/${totalCycles}) - $${(amount / 100).toFixed(2)}`,
                        details: LogFormatter.success({
                            plan: pkg.packageType || 'Exclusive Plan',
                            amount: amount / 100,
                            transactionId: transactionId,
                            method: isPayPal ? 'PayPal' : 'AuthNet',
                            cycle: `${cycleNumber}/${totalCycles}`,
                            email: employerEmail,
                        }),
                    });

                } catch (error) {
                    console.error(`❌ Default payment failed for ${companyName}:`, error);

                    // ========== PAYMENT FALLBACK ==========
                    // Try other payment methods before marking as past_due
                    const invoiceNumber = `EMP-R-${cycleNumber}-${pkg.id.slice(-6)}`;
                    const description = `${pkg.packageType || 'Exclusive Plan'} - Month ${cycleNumber} of ${totalCycles}`;

                    const fallbackResult = await tryFallbackPaymentMethods({
                        allPaymentMethods,
                        failedPaymentMethodId: defaultPaymentMethod.id,
                        amount,
                        amountInCents: true,
                        description,
                        invoiceNumber,
                        email: employerEmail,
                        entityLabel: companyName,
                    });

                    if (fallbackResult) {
                        // Fallback succeeded! Continue with the successful payment
                        console.log(`✅ [Fallback] ${companyName}: Payment succeeded with fallback method ${fallbackResult.paymentMethodId}`);

                        // Promote the successful method to default
                        await promoteToDefault(fallbackResult.paymentMethodId, 'employer', pkg.employer?.userId || pkg.employerId);

                        const isFinal = cycleNumber >= totalCycles;

                        await db.invoice.create({
                            data: {
                                employerPackageId: pkg.id,
                                amountDue: amount,
                                status: 'paid',
                                description: isFinal ? `${description} (Final)` : description,
                                authnetTransactionId: fallbackResult.transactionId,
                                paidAt: new Date()
                            }
                        });

                        // Also create an external_payment record so this recurring charge
                        // appears in the Sales transaction tab and is classified as R (Recurring).
                        const isFallbackPayPal = fallbackResult.paymentType === 'PayPal';
                        await db.externalPayment.create({
                            data: {
                                userId: employerId,
                                authnetTransactionId: isFallbackPayPal ? null : fallbackResult.transactionId,
                                ghlTransactionId: isFallbackPayPal ? `PAYPAL_${fallbackResult.transactionId}` : null,
                                amount: amount / 100, // stored in dollars
                                planId: pkg.packageType || 'gold_plus_recurring_6mo',
                                status: 'completed',
                                webhookProcessedAt: new Date()
                            }
                        });

                        const nextBillingDate = isFinal ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                        const newStatus = isFinal ? 'completed' : 'active';

                        await db.employerPackage.update({
                            where: { id: pkg.id },
                            data: {
                                billingCyclesCompleted: cycleNumber,
                                nextBillingDate,
                                recurringStatus: newStatus
                            }
                        });

                        await this.sendPaymentNotifications(
                            employerId,
                            employerName,
                            employerEmail,
                            companyName,
                            pkg.packageType || 'Exclusive Plan',
                            amount,
                            cycleNumber,
                            totalCycles,
                            isFinal,
                            fallbackResult.transactionId,
                            fallbackResult.paymentType === 'PayPal' ? 'PayPal' : 'Credit Card',
                            parsedBillingAddress,
                            defaultPaymentMethod
                        );

                        if (isFinal) {
                            results.completed++;
                            console.log(`✅ ${companyName}: Plan COMPLETED via fallback (${totalCycles}/${totalCycles})`);
                        } else {
                            results.successful++;
                            console.log(`✅ ${companyName}: Payment successful via fallback (${cycleNumber}/${totalCycles})`);
                        }

                        // Log fallback success to action_log
                        await this.safeLogAction(cronLogId, {
                            actionType: isFinal ? 'employer_plan_completed' : 'employer_renewal_success',
                            entityType: 'employer',
                            entityId: employerId,
                            status: 'success',
                            message: isFinal
                                ? `Plan completed via fallback (${totalCycles}/${totalCycles}) - $${(amount / 100).toFixed(2)}`
                                : `Payment successful via fallback (${cycleNumber}/${totalCycles}) - $${(amount / 100).toFixed(2)}`,
                            details: LogFormatter.success({
                                plan: pkg.packageType || 'Exclusive Plan',
                                amount: amount / 100,
                                transactionId: fallbackResult.transactionId,
                                method: fallbackResult.paymentType === 'PayPal' ? 'PayPal' : 'AuthNet',
                                cycle: `${cycleNumber}/${totalCycles}`,
                                email: employerEmail,
                            }),
                        });
                    } else {
                        // All payment methods failed - mark as past_due
                        results.failed++;
                        results.errors.push(`${companyName}: ${error instanceof Error ? error.message : 'Unknown error'} (all payment methods exhausted)`);

                        // Log failure to action_log
                        await this.safeLogAction(cronLogId, {
                            actionType: 'employer_renewal_failed',
                            entityType: 'employer',
                            entityId: employerId,
                            status: 'failed',
                            message: `Payment failed - all methods exhausted (${cycleNumber}/${totalCycles})`,
                            details: LogFormatter.fallbackExhausted({
                                plan: pkg.packageType || 'Exclusive Plan',
                                amount: amount / 100,
                                method: isPayPalPaymentMethod(defaultPaymentMethod.authnetPaymentProfileId) ? 'PayPal' : 'AuthNet',
                                error: { error: error instanceof Error ? error.message : 'Unknown error' } as any,
                                email: employerEmail,
                            }),
                        });

                        await db.employerPackage.update({
                            where: { id: pkg.id },
                            data: { recurringStatus: 'past_due' }
                        });

                        try {
                            await inAppNotificationService.notifyEmployerRecurringPaymentFailed(
                                employerId,
                                pkg.packageType || 'Exclusive Plan',
                                amount,
                                error instanceof Error ? error.message : 'Payment processing failed'
                            );
                            await inAppNotificationService.notifyAdminsRecurringPaymentFailed(
                                employerName,
                                companyName,
                                pkg.packageType || 'Exclusive Plan',
                                amount,
                                cycleNumber,
                                totalCycles,
                                error instanceof Error ? error.message : 'Payment processing failed'
                            );
                        } catch (notifError) {
                            console.warn('Failed to send failure notification:', notifError);
                        }
                    }
                }
            }

            // Track metrics (increment once per category for this run)
            for (let i = 0; i < results.processed; i++) {
                await CacheService.incrementMetric('employer_recurring_processed');
            }
            for (let i = 0; i < results.successful; i++) {
                await CacheService.incrementMetric('employer_recurring_successful');
            }
            for (let i = 0; i < results.failed; i++) {
                await CacheService.incrementMetric('employer_recurring_failed');
            }
            for (let i = 0; i < results.completed; i++) {
                await CacheService.incrementMetric('employer_recurring_completed');
            }

            console.log(`✅ [Employer Recurring Billing] Complete: ${results.successful} successful, ${results.failed} failed, ${results.completed} plans completed`);

            return results;

        } catch (error) {
            console.error('❌ [Employer Recurring Billing] Fatal error:', error);
            results.errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return results;
        }
    }

    /**
     * Process PayPal Reference Transaction
     */
    private static async processPayPalPayment(
        paymentProfileId: string,
        amountCents: number,
        description: string,
        invoiceNumber: string,
        companyName: string
    ): Promise<string> {
        const billingAgreementId = extractBillingAgreementId(paymentProfileId);

        if (!billingAgreementId) {
            throw new Error('Invalid PayPal billing agreement ID');
        }

        console.log(`🅿️ PayPal: Charging ${companyName} - $${(amountCents / 100).toFixed(2)}`);

        const paypalClient = getPayPalClient();
        const paypalResult = await paypalClient.chargeReferenceTransaction({
            billingAgreementId,
            amount: amountCents / 100,
            currency: 'USD',
            description,
            invoiceNumber
        });

        if (!paypalResult.success) {
            throw new Error(`PayPal payment failed: ${paypalResult.error || 'Unknown error'}`);
        }

        const transactionId = paypalResult.saleId || paypalResult.transactionId || `PP-${Date.now()}`;
        console.log(`✅ PayPal charge successful: ${transactionId}`);

        return transactionId;
    }

    /**
     * Process Authorize.net CIM Transaction
     */
    private static async processAuthNetPayment(
        paymentProfileId: string,
        amountCents: number,
        description: string,
        invoiceNumber: string,
        companyName: string,
        email: string
    ): Promise<string> {
        const profileIds = paymentProfileId.split('|');

        if (profileIds.length !== 2) {
            throw new Error('Invalid Authorize.net payment profile format');
        }

        const [customerProfileId, authnetPaymentProfileId] = profileIds;

        console.log(`💳 AuthNet: Charging ${companyName} - $${(amountCents / 100).toFixed(2)}`);

        const { getAuthorizeNetClient } = await import('../authorize-net');
        const authorizeNetClient = getAuthorizeNetClient();

        const chargeResult = await authorizeNetClient.createTransaction({
            transactionType: 'authCaptureTransaction',
            amount: (amountCents / 100).toFixed(2),
            profile: {
                customerProfileId,
                paymentProfile: {
                    paymentProfileId: authnetPaymentProfileId
                }
            },
            order: {
                invoiceNumber,
                description
            },
            customer: {
                email
            }
        });

        if (!chargeResult.success) {
            const errorMsg = chargeResult.errors?.map(e => `[${e.errorCode}] ${e.errorText}`).join(', ') || 'Unknown error';
            throw new Error(`AuthNet payment failed: ${errorMsg}`);
        }

        const transactionId = chargeResult.transactionId || `AN-${Date.now()}`;
        console.log(`✅ AuthNet charge successful: ${transactionId}`);

        return transactionId;
    }

    /**
     * Send payment notifications to employer AND admins, and sync to GHL
     */
    private static async sendPaymentNotifications(
        employerId: string,
        employerName: string,
        employerEmail: string,
        companyName: string,
        packageType: string,
        amountCents: number,
        cycle: number,
        totalCycles: number,
        isFinal: boolean,
        transactionId?: string,
        paymentMethod?: string,
        billingAddress?: { name?: string; address?: string; city?: string; state?: string; zip?: string; country?: string },
        defaultPaymentMethod?: any
    ): Promise<void> {
        try {
            // Notify employer
            if (isFinal) {
                await inAppNotificationService.notifyEmployerPackageCompleted(
                    employerId,
                    packageType,
                    totalCycles
                );
                // Notify admins about completion
                await inAppNotificationService.notifyAdminsPackageCompleted(
                    employerName,
                    companyName,
                    packageType,
                    totalCycles,
                    amountCents * totalCycles // Total revenue
                );
            } else {
                await inAppNotificationService.notifyEmployerRecurringPaymentSuccess(
                    employerId,
                    packageType,
                    amountCents,
                    cycle,
                    totalCycles
                );
                // Notify admins about successful payment
                await inAppNotificationService.notifyAdminsRecurringPaymentSuccess(
                    employerName,
                    companyName,
                    packageType,
                    amountCents,
                    cycle,
                    totalCycles,
                    transactionId
                );
            }

            // ====== ADMIN EMAIL: Send admin order notification via Resend ======
            try {
                // Generate order number
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
                const orderSuffix = (transactionId || employerId).slice(-4);
                const orderNumber = `ORD-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${orderSuffix}`;

                // Calculate next payment date (30 days from now if not final)
                const nextPaymentDate = !isFinal ?
                    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }) : undefined;

                // Format product description
                const productDescription = isFinal ?
                    `${packageType} - Final Payment (Month ${cycle} of ${totalCycles})` :
                    `${packageType} - Recurring Payment (Month ${cycle} of ${totalCycles})`;

                await NotificationService.sendAdminPaymentNotification({
                    orderNumber,
                    orderDate: `${orderDateFormatted} at ${orderTimeFormatted}`,
                    customerName: employerName,
                    customerType: 'Employer',
                    customerId: `EMP-${employerId.slice(-4).toUpperCase()}`,
                    customerEmail: employerEmail,
                    productDescription,
                    quantity: 1,
                    price: amountCents / 100,
                    subscriptionStartDate: orderDateFormatted,
                    nextPaymentDate,
                    recurringTotal: `$${(amountCents / 100).toFixed(2)} / month`,
                    isRenewal: true,
                    paymentMethod: paymentMethod || 'Credit Card',
                    transactionId,
                    billingAddress,
                    billingFirstName: defaultPaymentMethod?.billingFirstName || undefined,
                    billingLastName: defaultPaymentMethod?.billingLastName || undefined,
                    billingCardAddress: defaultPaymentMethod?.billingAddress || undefined,
                    billingCardCity: defaultPaymentMethod?.billingCity || undefined,
                    billingCardState: defaultPaymentMethod?.billingState || undefined,
                    billingCardZipCode: defaultPaymentMethod?.billingZipCode || undefined,
                    paymentType: paymentMethod === 'PayPal' ? 'paypal' : 'card',
                });

                console.log(`✅ EMPLOYER RECURRING: Admin order notification email sent for cycle ${cycle}/${totalCycles}`);
            } catch (adminEmailError) {
                console.warn('⚠️ EMPLOYER RECURRING: Admin order notification email failed:', adminEmailError);
                // Don't throw - email failure shouldn't break renewal flow
            }

            // Send customer payment confirmation email for recurring payment - queued with feature flag
            try {
                const customerDescription = isFinal ?
                    `${packageType} - Final Payment (Month ${cycle} of ${totalCycles})` :
                    `${packageType} - Recurring Payment (Month ${cycle} of ${totalCycles})`;

                const isPayPal = isPayPalPaymentMethod(defaultPaymentMethod.authnetPaymentProfileId);

                await NotificationService.sendCustomerPaymentConfirmationEmail({
                    email: employerEmail,
                    firstName: employerName.split(' ')[0] || 'Valued Customer',
                    amount: amountCents / 100,
                    description: customerDescription,
                    transactionId: transactionId || '',
                    lineItems: [{ name: customerDescription, amount: amountCents / 100 }],
                    isRecurring: false,
                    billingFirstName: defaultPaymentMethod?.billingFirstName || undefined,
                    billingLastName: defaultPaymentMethod?.billingLastName || undefined,
                    address: defaultPaymentMethod?.billingAddress || undefined,
                    city: defaultPaymentMethod?.billingCity || undefined,
                    state: defaultPaymentMethod?.billingState || undefined,
                    zipCode: defaultPaymentMethod?.billingZipCode || undefined,
                    paymentType: isPayPal ? 'paypal' : 'card',
                    paymentMethod: !isPayPal && defaultPaymentMethod?.last4
                        ? `Card ending in ${defaultPaymentMethod.last4}`
                        : undefined,
                });
                console.log(`✅ EMPLOYER RECURRING: Customer payment confirmation email queued for cycle ${cycle}/${totalCycles}`);
            } catch (customerEmailError) {
                console.warn('⚠️ EMPLOYER RECURRING: Customer payment confirmation email failed:', customerEmailError);
                // Don't throw - email failure shouldn't break renewal flow
            }

            // ====== GHL CONTACT NOTE: Sync renewal activity ======
            try {
                const { createGHLService } = await import('../ghl-sync-service');
                const ghlService = await createGHLService();

                if (ghlService) {
                    const ghlContactId = await ghlService.syncUserToGHL(employerId, 'update');

                    if (ghlContactId) {
                        // Use subscription_purchase for all renewals (including final)
                        // Plan completion is NOT a cancellation - it's a successful completion
                        const noteType = 'subscription_purchase';
                        const planLabel = isFinal
                            ? `${packageType} (Exclusive - Final Payment ${cycle}/${totalCycles})`
                            : `${packageType} (Exclusive - Renewal ${cycle}/${totalCycles})`;

                        await ghlService.addPurchaseActivityNote(
                            employerId,
                            noteType,
                            {
                                amount: amountCents / 100,
                                planName: planLabel,
                                packageNames: [`${packageType} (Exclusive - ${totalCycles} months)`],
                                paymentMethod: paymentMethod || 'Unknown',
                                duration: `${totalCycles} months`,
                                action: isFinal ? `✅ Plan completed - All ${totalCycles} payments processed` : undefined
                            },
                            ghlContactId
                        );
                        console.log(`✅ GHL: Employer renewal activity note added for ${paymentMethod} payment`);
                    }
                }
            } catch (ghlError) {
                console.error('❌ GHL sync error (non-blocking):', ghlError);
                // Don't throw - GHL sync failure shouldn't break renewal flow
            }
        } catch (error) {
            console.warn('Failed to send payment notification:', error);
        }
    }
}

/**
 * Default export function for use in daily-tasks cron
 */
export default async function processEmployerRecurringBilling(triggeredBy: string = 'cron') {
    const startTime = Date.now();
    let executionId: string | null = null;

    try {
        // Start execution log
        executionId = await CronLogger.start('employer-recurring-billing', triggeredBy);
        console.log(`Starting employer recurring billing process... (executionId: ${executionId})`);

        // Run billing + renewal reminders in parallel
        const [results, reminderResults] = await Promise.all([
            EmployerRecurringBillingService.processEmployerRecurringBilling(executionId),
            EmployerRecurringBillingService.sendRenewalReminders()
        ]);

        const combinedResults = {
            ...results,
            renewalReminders: reminderResults.sent,
            reminderErrors: reminderResults.errors
        };

        // Finish execution log
        await CronLogger.finish(executionId, {
            processed: results.processed,
            successful: results.successful + results.completed,
            failed: results.failed,
            errors: [...results.errors, ...reminderResults.errors],
            results: {
                processed: results.processed,
                successful: results.successful,
                completed: results.completed,
                failed: results.failed,
                errors: results.errors,
                renewalReminders: reminderResults.sent,
            },
        }, startTime);

        console.log('Employer recurring billing process completed:', combinedResults);

        return combinedResults;
    } catch (error) {
        console.error('Employer recurring billing process failed:', error);

        // Log failure
        if (executionId) {
            await CronLogger.fail(executionId, error, startTime);
        }

        throw error;
    }
}
