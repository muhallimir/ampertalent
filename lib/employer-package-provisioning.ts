/**
 * Employer Package Provisioning Service
 * 
 * Handles provisioning packages for employers from invitations
 * Specifically for invitation-based package assignment like Gold Plus Small Business
 */

import { db } from '@/lib/db'
import { PackageType } from '@prisma/client'
import { InAppNotificationService } from '@/lib/in-app-notification-service'

/**
 * Package configuration for invitation-based packages
 */
export const INVITATION_PACKAGE_CONFIG: Record<string, {
    packageType: PackageType;
    packageName: string;
    listingsRemaining: number;
    featuredListingsRemaining: number;
    durationMonths: number;
    isRecurring: boolean;
    billingFrequency: string;
    billingCyclesTotal: number;
    amountCents: number;
    description: string;
}> = {
    'gold_plus_recurring_6mo': {
        packageType: 'gold_plus_recurring_6mo' as PackageType,
        packageName: 'Gold Plus Small Business (6-Month Recurring)',
        listingsRemaining: 1,            // 1 job posting TOTAL for entire 6-month subscription
        featuredListingsRemaining: 0,    // No featured listings
        durationMonths: 6,
        isRecurring: true,
        billingFrequency: 'monthly',
        billingCyclesTotal: 6,           // 6 monthly payments
        amountCents: 9700,               // $97/month
        description: 'Premium 6-month job posting with monthly billing at $97/month. Automatically ends after 6 payments.',
    },
};

/**
 * Store exclusive plan eligibility for an employer from their invitation
 * This is called after employer onboarding - does NOT create the package yet
 * The employer will see a modal on dashboard to activate/pay
 * 
 * @param employerId - The employer's user profile ID
 * @param userEmail - The employer's email (to find invitation)
 * @returns The updated employer or null if no pending package
 */
export async function storeExclusivePlanEligibility(
    employerId: string,
    userEmail: string
): Promise<any | null> {
    try {
        console.log(`🎁 Checking for exclusive plan eligibility for ${userEmail}`);

        // Find the invitation with pending package info (accepted or not)
        const invitation = await db.userInvitation.findFirst({
            where: {
                email: userEmail.toLowerCase(),
                pendingPackageType: { not: null }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!invitation || !invitation.pendingPackageType) {
            console.log(`🎁 No exclusive plan found for ${userEmail}`);
            return null;
        }

        const packageConfig = INVITATION_PACKAGE_CONFIG[invitation.pendingPackageType];
        if (!packageConfig) {
            console.error(`❌ Unknown package type: ${invitation.pendingPackageType}`);
            return null;
        }

        console.log(`🎁 Found exclusive plan: ${invitation.pendingPackageType}`);

        const amountCents = invitation.pendingAmountCents || packageConfig.amountCents;
        const cycles = invitation.pendingBillingCycles || packageConfig.billingCyclesTotal;

        // Store the exclusive plan eligibility on the employer record using raw SQL
        // (Prisma client may not have the new fields yet)
        // source = 'invitation' means they came through invite flow and will see persistent card
        await db.$executeRaw`
            UPDATE employers 
            SET 
                exclusive_plan_type = ${invitation.pendingPackageType},
                exclusive_plan_name = ${packageConfig.packageName},
                exclusive_plan_amount_cents = ${amountCents},
                exclusive_plan_cycles = ${cycles},
                exclusive_plan_offered_at = NOW(),
                exclusive_plan_dismissed_at = NULL,
                exclusive_plan_activated_at = NULL,
                exclusive_plan_source = 'invitation',
                updated_at = NOW()
            WHERE user_id = ${employerId}
        `;

        console.log(`✅ Exclusive plan eligibility stored for employer ${employerId}: ${packageConfig.packageName} (source: invitation)`);

        // Clear the pending package from invitation (prevent re-processing)
        await db.userInvitation.update({
            where: { id: invitation.id },
            data: {
                pendingPackageType: null,
                pendingBillingCycles: null,
                pendingAmountCents: null
            }
        });

        console.log(`✅ Cleared pending package from invitation ${invitation.id}`);

        return {
            exclusivePlanType: invitation.pendingPackageType,
            exclusivePlanName: packageConfig.packageName,
            exclusivePlanAmountCents: amountCents,
            exclusivePlanCycles: cycles,
        };
    } catch (error) {
        console.error(`❌ Error storing exclusive plan eligibility:`, error);
        return null;
    }
}
/**
 * Legacy function - kept for reference but replaced by storeExclusivePlanEligibility
 * @deprecated Use storeExclusivePlanEligibility instead
 */
export async function provisionPackageFromInvitation(
    employerId: string,
    userEmail: string
): Promise<any | null> {
    // Now just delegates to the new function
    return storeExclusivePlanEligibility(employerId, userEmail);
}

/**
 * Activate an exclusive plan after payment is received
 * Creates the actual EmployerPackage and marks the exclusive plan as activated
 * 
 * @param employerId - The employer's user profile ID
 * @param transactionId - The payment transaction ID
 */
export async function activateExclusivePlan(
    employerId: string,
    transactionId: string
): Promise<any | null> {
    try {
        // Use raw SQL to read exclusive plan fields
        const employerResult = await db.$queryRaw<Array<{
            user_id: string;
            exclusive_plan_type: string | null;
            exclusive_plan_name: string | null;
            exclusive_plan_amount_cents: number | null;
            exclusive_plan_cycles: number | null;
            exclusive_plan_activated_at: Date | null;
        }>>`
            SELECT user_id, exclusive_plan_type, exclusive_plan_name, 
                   exclusive_plan_amount_cents, exclusive_plan_cycles,
                   exclusive_plan_activated_at
            FROM employers
            WHERE user_id = ${employerId}
        `;

        const employer = employerResult[0];
        if (!employer || !employer.exclusive_plan_type) {
            console.error(`❌ No exclusive plan found for employer: ${employerId}`);
            return null;
        }

        // Check if already activated (prevent double activation)
        if (employer.exclusive_plan_activated_at) {
            console.warn(`⚠️ Exclusive plan already activated for employer: ${employerId}`);
            return null;
        }

        const packageConfig = INVITATION_PACKAGE_CONFIG[employer.exclusive_plan_type];
        if (!packageConfig) {
            console.error(`❌ Unknown package type: ${employer.exclusive_plan_type}`);
            return null;
        }

        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + packageConfig.durationMonths);

        // Calculate next billing date (1 month from now for recurring)
        let nextBillingDate: Date | null = null;
        if (packageConfig.isRecurring) {
            nextBillingDate = new Date();
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        }

        const amountCents = employer.exclusive_plan_amount_cents || packageConfig.amountCents;

        // Create the employer package
        const employerPackage = await db.employerPackage.create({
            data: {
                employerId,
                packageType: packageConfig.packageType,
                listingsRemaining: packageConfig.listingsRemaining,
                featuredListingsRemaining: packageConfig.featuredListingsRemaining,
                expiresAt,
                isRecurring: packageConfig.isRecurring,
                billingFrequency: packageConfig.billingFrequency,
                billingCyclesTotal: packageConfig.billingCyclesTotal,
                billingCyclesCompleted: 1, // First payment complete
                nextBillingDate,
                recurringAmountCents: amountCents,
                recurringStatus: 'active',
            }
        });

        console.log(`✅ Package created for employer ${employerId}: ${packageConfig.packageType}`);

        // Update employer's current package and mark exclusive plan as activated using raw SQL
        await db.$executeRaw`
            UPDATE employers
            SET current_package_id = ${employerPackage.id},
                exclusive_plan_activated_at = NOW()
            WHERE user_id = ${employerId}
        `;

        // Create invoice for first payment
        await db.invoice.create({
            data: {
                employerPackageId: employerPackage.id,
                amountDue: amountCents,
                status: 'paid',
                description: `First payment for ${packageConfig.packageName}`,
                packageName: packageConfig.packageName,
                authnetTransactionId: transactionId,
                paidAt: new Date(),
                dueDate: new Date()
            }
        });

        // GHL SYNC: Sync exclusive plan activation to GoHighLevel CRM
        try {
            console.log('🔄 EXCLUSIVE-PLAN: Syncing exclusive plan activation to GHL...', {
                employerId,
                packageName: packageConfig.packageName,
                amountCents,
                transactionId
            });

            const { createGHLService } = await import('@/lib/ghl-sync-service');
            const ghlService = await createGHLService();

            if (ghlService) {
                // Sync user data to GHL
                const ghlContactId = await ghlService.syncUserToGHL(employerId, 'update');
                console.log('✅ EXCLUSIVE-PLAN: Exclusive plan activation synced to GHL successfully');

                // Add purchase activity note to GHL for timeline tracking
                if (ghlContactId) {
                    await ghlService.addPurchaseActivityNote(
                        employerId,
                        'subscription_purchase', // Exclusive plan is a recurring subscription purchase
                        {
                            amount: amountCents / 100, // Convert cents to dollars
                            packageNames: [`${packageConfig.packageName} (Exclusive - ${packageConfig.billingCyclesTotal} months)`],
                            paymentMethod: 'Authorize.net',
                            duration: `${packageConfig.billingCyclesTotal} months`
                        },
                        ghlContactId
                    );
                    console.log('✅ EXCLUSIVE-PLAN: Purchase activity note added to GHL');
                } else {
                    console.warn('⚠️ EXCLUSIVE-PLAN: No GHL contact ID returned, skipping activity note');
                }
            } else {
                console.log('ℹ️ EXCLUSIVE-PLAN: GHL service not configured, skipping sync');
            }
        } catch (ghlError) {
            console.error('❌ EXCLUSIVE-PLAN: Failed to sync to GHL:', ghlError);
            // Don't throw - GHL sync failure shouldn't break the activation flow
        }

        // Get employer info for notifications
        const employerInfo = await db.employer.findUnique({
            where: { userId: employerId },
            include: {
                user: {
                    select: { email: true, firstName: true, lastName: true, name: true }
                }
            }
        });

        if (employerInfo) {
            const employerName = employerInfo.user.name ||
                [employerInfo.user.firstName, employerInfo.user.lastName].filter(Boolean).join(' ') ||
                employerInfo.companyName;
            const employerEmail = employerInfo.user.email || '';

            // Send notification to employer
            await InAppNotificationService.notifyExclusivePlanActivated(
                employerId,
                packageConfig.packageName,
                amountCents
            );

            // Notify admins
            await InAppNotificationService.notifyAdminExclusivePlanActivated(
                employerName,
                employerEmail,
                employerId,
                packageConfig.packageName,
                amountCents,
                transactionId
            );
        }

        console.log(`✅ Exclusive plan activated for employer ${employerId}`);
        return employerPackage;
    } catch (error) {
        console.error(`❌ Error activating exclusive plan:`, error);
        return null;
    }
}

/**
 * Dismiss the exclusive plan offer (user clicked "Maybe Later")
 * They can still access it from the billing page
 * Also sends notification to super admins for abandoned cart tracking
 */
export async function dismissExclusivePlanOffer(employerId: string): Promise<boolean> {
    try {
        // Get employer info for notifications before dismissing
        const employerResult = await db.$queryRaw<Array<{
            exclusive_plan_name: string | null;
            exclusive_plan_amount_cents: number | null;
        }>>`
            SELECT exclusive_plan_name, exclusive_plan_amount_cents
            FROM employers
            WHERE user_id = ${employerId}
        `;

        const employerInfo = await db.employer.findUnique({
            where: { userId: employerId },
            include: {
                user: {
                    select: { email: true, firstName: true, lastName: true, name: true }
                }
            }
        });

        // Use raw SQL to update exclusive plan dismissed timestamp
        await db.$executeRaw`
            UPDATE employers
            SET exclusive_plan_dismissed_at = NOW()
            WHERE user_id = ${employerId}
        `;

        // Send notification to admins for abandoned cart tracking
        if (employerInfo && employerResult[0]?.exclusive_plan_name) {
            const employerName = employerInfo.user.name ||
                [employerInfo.user.firstName, employerInfo.user.lastName].filter(Boolean).join(' ') ||
                employerInfo.companyName;
            const employerEmail = employerInfo.user.email || '';

            await InAppNotificationService.notifyAdminExclusivePlanDismissed(
                employerName,
                employerEmail,
                employerId,
                employerResult[0].exclusive_plan_name,
                employerResult[0].exclusive_plan_amount_cents || 0
            );
        }

        console.log(`✅ Exclusive plan offer dismissed for employer ${employerId}`);
        return true;
    } catch (error) {
        console.error(`❌ Error dismissing exclusive plan:`, error);
        return false;
    }
}

/**
 * Check if employer has an exclusive plan offer (not yet activated or dismissed)
 */
export async function getExclusivePlanOffer(employerId: string): Promise<{
    hasOffer: boolean;
    showModal: boolean;
    showPersistentCard: boolean; // Only true for invitation-based offers
    planType?: string;
    planName?: string;
    amountCents?: number;
    cycles?: number;
    isActivated: boolean;
    isDismissed: boolean;
    source?: string; // 'invitation' or 'admin'
} | null> {
    try {
        // Use raw SQL to read exclusive plan fields
        const employerResult = await db.$queryRaw<Array<{
            exclusive_plan_type: string | null;
            exclusive_plan_name: string | null;
            exclusive_plan_amount_cents: number | null;
            exclusive_plan_cycles: number | null;
            exclusive_plan_offered_at: Date | null;
            exclusive_plan_dismissed_at: Date | null;
            exclusive_plan_activated_at: Date | null;
            exclusive_plan_source: string | null;
        }>>`
            SELECT exclusive_plan_type, exclusive_plan_name, 
                   exclusive_plan_amount_cents, exclusive_plan_cycles,
                   exclusive_plan_offered_at, exclusive_plan_dismissed_at,
                   exclusive_plan_activated_at, exclusive_plan_source
            FROM employers
            WHERE user_id = ${employerId}
        `;

        const employer = employerResult[0];
        if (!employer || !employer.exclusive_plan_type) {
            return null;
        }

        const isActivated = !!employer.exclusive_plan_activated_at;
        const isDismissed = !!employer.exclusive_plan_dismissed_at;
        const source = employer.exclusive_plan_source || 'invitation'; // Default to invitation for backward compat

        // Persistent card only shows for INVITATION-based offers (not admin offers)
        // Admin offers: employer gets notification, can activate from billing page, but no persistent card
        const showPersistentCard = source === 'invitation';

        return {
            hasOffer: true,
            showModal: !isActivated && !isDismissed, // Show modal only if not activated and not dismissed
            showPersistentCard, // Only invitation-based offers show persistent card
            planType: employer.exclusive_plan_type,
            planName: employer.exclusive_plan_name || undefined,
            amountCents: employer.exclusive_plan_amount_cents || undefined,
            cycles: employer.exclusive_plan_cycles || undefined,
            isActivated,
            isDismissed,
            source,
        };
    } catch (error) {
        console.error(`❌ Error checking exclusive plan:`, error);
        return null;
    }
}

/**
 * Activate a package after first payment is received (for non-exclusive packages)
 * 
 * @param packageId - The employer package ID
 * @param transactionId - The payment transaction ID
 */
export async function activatePackageAfterPayment(
    packageId: string,
    transactionId: string
): Promise<boolean> {
    try {
        const pkg = await db.employerPackage.findUnique({
            where: { id: packageId }
        });

        if (!pkg) {
            console.error(`❌ Package not found: ${packageId}`);
            return false;
        }

        // Update package to active
        await db.employerPackage.update({
            where: { id: packageId },
            data: {
                recurringStatus: 'active',
                billingCyclesCompleted: 1, // First payment complete
            }
        });

        // Create invoice for first payment
        await db.invoice.create({
            data: {
                employerPackageId: packageId,
                amountDue: pkg.recurringAmountCents || 0,
                status: 'paid',
                description: `First payment for ${pkg.packageType}`,
                packageName: String(pkg.packageType),
                authnetTransactionId: transactionId,
                paidAt: new Date(),
                dueDate: new Date()
            }
        });

        // Record activation in external_payments so it appears in the Sales Transaction tab as N
        // PayPal transactions start with PAYID-; everything else is AuthNet
        const isPayPalTxn = transactionId.startsWith('PAYID-')
        try {
            await db.externalPayment.create({
                data: {
                    userId: pkg.employerId,
                    planId: String(pkg.packageType),
                    amount: (pkg.recurringAmountCents || 0) / 100,
                    status: 'completed',
                    authnetTransactionId: isPayPalTxn ? null : transactionId,
                    ghlTransactionId: isPayPalTxn ? `PAYPAL_${transactionId}` : null,
                    webhookProcessedAt: new Date(),
                }
            });
            console.log(`✅ Package ${packageId} activation recorded in external_payments`);
        } catch (epError) {
            console.error(`⚠️ Failed to write external_payment for package ${packageId} (non-fatal):`, epError);
        }

        console.log(`✅ Package ${packageId} activated after first payment`);
        return true;
    } catch (error) {
        console.error(`❌ Error activating package:`, error);
        return false;
    }
}

/**
 * Check if an employer has a pending package awaiting first payment
 */
export async function hasPendingPackagePayment(employerId: string): Promise<{
    hasPending: boolean;
    package?: any;
}> {
    const pendingPackage = await db.employerPackage.findFirst({
        where: {
            employerId,
            isRecurring: true,
            recurringStatus: 'pending_first_payment'
        }
    });

    return {
        hasPending: !!pendingPackage,
        package: pendingPackage
    };
}
