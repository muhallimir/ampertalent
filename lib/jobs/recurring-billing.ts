import { db } from '../db';
import { CacheService } from '../redis';
import { MembershipReminderService } from './membership-reminders';
import { ExternalWebhookService } from '../external-webhook-service';
import { inAppNotificationService } from '../in-app-notification-service';
import { isPayPalPaymentMethod, extractBillingAgreementId, getPayPalClient } from '../paypal';
import { NotificationService } from '../notification-service';
import { tryFallbackPaymentMethods, promoteToDefault } from './payment-fallback';
import { CronLogger, LogFormatter } from '../cron-logger';
import {
  planDisplayName,
  planPrice,
  membershipPlanToPlanId,
  calcPeriodEnd,
  getPlanByMembershipPlan,
} from '../subscription-plans';

/**
 * Recurring Billing Service
 * Handles automatic subscription renewals by processing payments
 * when subscriptions are due for renewal.
 *
 * This cron processes subscription renewals for job seekers by charging
 * stored payment methods via Authorize.net OR PayPal when membershipExpiresAt is within 24 hours.
 * All renewals process real payment transactions.
 *
 * Payment Routing:
 * - authnetPaymentProfileId starts with "PAYPAL|B-" OR brand = "paypal" → PayPal Reference Transaction
 * - authnetPaymentProfileId in "custId|payId" format → Authorize.net CIM
 * - If primary method fails, falls back to the other method automatically.
 *
 * Failure Behavior (grace period):
 * - First failure (active/trial): subscription set to `past_due`, membership kept intact.
 *   No retry until 15 days have elapsed since updatedAt.
 * - Past-due retry (after 15 days): if payment still fails, subscription is canceled
 *   and profile is downgraded. Applies to both PayPal and Authorize.net.
 */
export class RecurringBillingService {
  /**
   * Process all due subscription renewals
   */
  // When set, only process renewals for this specific user email
  static ONLY_PROCESS_EMAIL: string | null = process.env.RECURRING_BILLING_ONLY_EMAIL || null;

  /**
   * Safe wrapper for CronLogger.logAction - never throws.
   * Prevents action_log DB errors from breaking the cron flow.
   */
  private static async safeLogAction(cronLogId: string | undefined, action: import('../cron-logger').ActionLogInput): Promise<void> {
    if (!cronLogId) return;
    try {
      await CronLogger.logAction(cronLogId, action);
    } catch (logError) {
      console.warn('⚠️ [action_log] Failed to write action log (non-blocking):', logError);
    }
  }

  static async processSubscriptionRenewals(cronLogId?: string): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      // Find subscriptions due for renewal (already expired)
      const now = new Date();

      // Optional: filter by specific user email (case-insensitive)
      const emailFilter = RecurringBillingService.ONLY_PROCESS_EMAIL
        ? {
          user: {
            email: {
              equals: RecurringBillingService.ONLY_PROCESS_EMAIL,
              mode: 'insensitive' as const
            }
          }
        }
        : {};

      if (RecurringBillingService.ONLY_PROCESS_EMAIL) {
        console.log(`🔒 Recurring billing restricted to email: ${RecurringBillingService.ONLY_PROCESS_EMAIL} (case-insensitive)`);
      }

      const dueSubscriptions = await db.jobSeeker.findMany({
        where: {
          ...emailFilter,
          OR: [
            // Regular subscriptions expiring OR already expired (catch missed renewals)
            {
              membershipPlan: {
                not: 'none'
              },
              membershipExpiresAt: {
                // Changed: now includes past dates to catch missed renewals
                lte: now // Catches: past dates + now
              },
              isSuspended: false,
              isOnTrial: false
            },
            // Trial subscriptions expiring (need to charge full amount)
            // Only charge trials that have ALREADY expired (trialEndsAt <= now)
            // NOT trials expiring within the next 24 hours, to avoid billing early
            {
              isOnTrial: true,
              trialEndsAt: {
                lte: new Date()
              },
              isSuspended: false
            }
          ]
        },
        include: {
          user: true,
          subscriptions: {
            where: {
              status: {
                in: ['active', 'past_due']
              }
              // Process all subscriptions - ARB IDs are placeholders, renewals triggered by cron
            }
          },
          paymentMethods: {
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      // Also find past_due subscriptions that need to be charged
      // Process all past_due subscriptions - renewals are triggered by cron, not Authorize.net
      // Apply email filter to past_due query as well
      const pastDueEmailFilter = RecurringBillingService.ONLY_PROCESS_EMAIL
        ? { seeker: { user: { email: RecurringBillingService.ONLY_PROCESS_EMAIL } } }
        : {};

      // Only retry past_due subscriptions from the last 15 days
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const pastDueSubscriptions = await db.subscription.findMany({
        where: {
          status: 'past_due',
          updatedAt: {
            lte: fifteenDaysAgo
          },
          // Only retry if the seeker still has an active membership plan
          // (skip already-downgraded users whose subscription wasn't cleaned up)
          seeker: {
            membershipPlan: { not: 'none' },
          },
          ...pastDueEmailFilter
          // ARB IDs are UI placeholders only - actual billing handled by this cron
        },
        include: {
          seeker: {
            include: {
              user: true,
              paymentMethods: {
                orderBy: {
                  createdAt: 'desc'
                }
              }
            }
          }
        }
      });

      // Convert past_due subscriptions to the same format as dueSubscriptions
      const pastDueAsJobSeekers = pastDueSubscriptions.map(sub => ({
        userId: sub.seeker.userId,
        membershipPlan: sub.plan,
        isOnTrial: false,
        trialEndsAt: null,
        membershipExpiresAt: null,
        isSuspended: false,
        user: sub.seeker.user,
        subscriptions: [sub],
        paymentMethods: sub.seeker.paymentMethods,
        isPastDueRetry: true // Flag to identify these as past_due retries
      }));

      // Combine both arrays, deduplicating by userId to prevent double charges
      const dueUserIds = new Set(dueSubscriptions.map(s => s.userId));
      const dedupedPastDue = pastDueAsJobSeekers.filter(s => {
        if (dueUserIds.has(s.userId)) {
          console.log(`⚠️ Skipping past_due retry for ${s.userId} - already in regular renewals (prevents double charge)`);
          return false;
        }
        return true;
      });
      const allDueSubscriptions = [...dueSubscriptions, ...dedupedPastDue];

      console.log(`📋 Found ${dueSubscriptions.length} regular subscription(s) due for renewal`);
      console.log(`📋 Found ${pastDueSubscriptions.length} past_due subscription(s) to retry`);
      console.log(`📋 Total processing: ${allDueSubscriptions.length} subscription(s)`);

      // Log details of each found subscription
      for (const seeker of dueSubscriptions) {
        console.log(`📋 Due subscription: userId=${seeker.userId}, email=${seeker.user?.email}, plan=${seeker.membershipPlan}, expires=${seeker.membershipExpiresAt}, isOnTrial=${seeker.isOnTrial}, trialEnds=${seeker.trialEndsAt}`);
      }
      for (const sub of pastDueSubscriptions) {
        console.log(`📋 Past due subscription: subId=${sub.id}, seekerId=${sub.seekerId}, plan=${sub.plan}, email=${sub.seeker?.user?.email}`)
      }

      for (const seeker of allDueSubscriptions) {
        results.processed++;

        try {
          // Find subscription (active or past_due for retries)
          const activeSubscription = seeker.subscriptions.find(sub => sub.status === 'active');
          const pastDueSubscription = seeker.subscriptions.find(sub => sub.status === 'past_due');
          const workingSubscription = activeSubscription || pastDueSubscription;
          const allPaymentMethods = seeker.paymentMethods || [];
          const defaultPaymentMethod = allPaymentMethods.find(pm => pm.isDefault) || allPaymentMethods[0];

          // Enhanced logging for debugging
          console.log(`🔍 DEBUG: Processing seeker ${seeker.userId}:`, {
            isOnTrial: seeker.isOnTrial,
            trialEndsAt: seeker.trialEndsAt,
            membershipPlan: seeker.membershipPlan,
            membershipExpiresAt: seeker.membershipExpiresAt,
            hasActiveSubscription: !!activeSubscription,
            hasPastDueSubscription: !!pastDueSubscription,
            hasPaymentMethod: !!defaultPaymentMethod,
            subscriptionStatuses: seeker.subscriptions.map(s => s.status),
            isPastDueRetry: (seeker as any).isPastDueRetry
          });

          // If subscription is already past_due and this is NOT a deliberate past_due retry
          // (i.e. came from dueSubscriptions, not pastDueSubscriptions), skip without charging.
          // This seeker is in the grace period and will be retried once after 15 days
          // via the pastDueSubscriptions query.
          if (workingSubscription?.status === 'past_due' && !(seeker as any).isPastDueRetry) {
            const daysPastDue = Math.floor(
              (Date.now() - (workingSubscription as any).updatedAt.getTime()) / (24 * 60 * 60 * 1000)
            );
            console.log(`⏭️ Skipping past_due seeker ${seeker.userId} (grace period day ${daysPastDue + 1}/${this.GRACE_PERIOD_DAYS}) — no charge attempted`);
            await this.safeLogAction(cronLogId, {
              actionType: 'seeker_payment_retry_scheduled',
              entityType: 'seeker',
              entityId: seeker.userId,
              status: 'skipped',
              message: `Grace period day ${daysPastDue + 1}/${this.GRACE_PERIOD_DAYS} — no charge attempted`,
              details: LogFormatter.skipped(`Grace period day ${daysPastDue + 1}/${this.GRACE_PERIOD_DAYS}`, {
                plan: seeker.membershipPlan as string,
                email: seeker.user?.email ?? undefined,
                entityId: seeker.userId,
              }),
            });
            continue;
          }

          if (!workingSubscription || !defaultPaymentMethod) {
            const errorMsg = `No active/past_due subscription or payment method for seeker ${seeker.userId}`;
            console.warn(errorMsg);
            results.errors.push(errorMsg);
            results.failed++;

            // Log to action_log
            await this.safeLogAction(cronLogId, {
              actionType: 'seeker_renewal_skipped',
              entityType: 'seeker',
              entityId: seeker.userId,
              status: 'failed',
              message: 'No active/past_due subscription or payment method',
              details: LogFormatter.skipped('No subscription or payment method found', {
                plan: seeker.membershipPlan as string,
                email: seeker.user?.email ?? undefined,
                entityId: seeker.userId,
              }),
            });

            // Mark as past_due (or cancel if already a past_due retry) - no payment method to retry with
            if (workingSubscription) {
              await this.handleRenewalFailure(seeker.userId, workingSubscription.id, cronLogId, seeker.user?.email ?? undefined, seeker.membershipPlan as string, (seeker as any).isPastDueRetry ?? false);
              console.log(`⚠️ Marked subscription ${workingSubscription.id} past_due (no payment method)`);
            }
            continue;
          }

          // Get plan details - type assertion to ensure membershipPlan is a string
          const planDetails = this.getPlanDetails(seeker.membershipPlan);
          if (!planDetails) {
            const errorMsg = `Invalid membership plan for seeker ${seeker.userId}: ${seeker.membershipPlan}`;
            console.error(errorMsg);
            results.errors.push(errorMsg);
            results.failed++;

            // Log to action_log
            await this.safeLogAction(cronLogId, {
              actionType: 'seeker_renewal_skipped',
              entityType: 'seeker',
              entityId: seeker.userId,
              status: 'failed',
              message: `Invalid membership plan: ${seeker.membershipPlan}`,
              details: LogFormatter.skipped(`Invalid membership plan: ${seeker.membershipPlan}`, {
                plan: seeker.membershipPlan as string,
                email: seeker.user?.email ?? undefined,
                entityId: seeker.userId,
              }),
            });

            continue;
          }

          // Check if this is a trial conversion or past_due retry
          const isTrialConversion = seeker.isOnTrial && seeker.trialEndsAt && seeker.trialEndsAt <= now;
          const isPastDueRetry = (seeker as any).isPastDueRetry;

          if (isTrialConversion || isPastDueRetry) {
            // Handle trial conversion or past_due retry - charge full amount
            const actionType = isPastDueRetry ? 'past_due retry' : 'trial conversion';
            console.log(`Processing ${actionType} for seeker ${seeker.userId} - charging $${planDetails.amount}`);

            // Check if subscription is canceled - if so, don't charge
            if (workingSubscription.cancelAtPeriodEnd) {
              console.log(`Trial canceled for seeker ${seeker.userId} - not charging`);

              // End trial without charge, set membership to none
              await this.endTrialWithoutCharge(seeker.userId, workingSubscription.id);
              results.successful++;

              // Log to action_log
              await this.safeLogAction(cronLogId, {
                actionType: 'seeker_trial_canceled',
                entityType: 'seeker',
                entityId: seeker.userId,
                status: 'success',
                message: 'Trial ended without charge (user canceled)',
                details: LogFormatter.skipped('Trial canceled by user - ended without charge', {
                  plan: seeker.membershipPlan as string,
                  email: seeker.user?.email ?? undefined,
                  entityId: seeker.userId,
                }),
              });

              continue;
            }

            // For trial conversion or past_due retry, we need to charge the stored payment method
            console.log(`Processing ${actionType} charge for seeker ${seeker.userId}`);

            let transactionId = isPastDueRetry
              ? `PD-R-${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}${String(new Date().getHours()).padStart(2, '0')}${String(new Date().getMinutes()).padStart(2, '0')}-${seeker.userId.slice(-4)}`
              : `TR-C-${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}${String(new Date().getHours()).padStart(2, '0')}${String(new Date().getMinutes()).padStart(2, '0')}-${seeker.userId.slice(-4)}`;

            try {
              // Check if this is a PayPal payment method (by profile ID format or brand field)
              const paymentProfileId = defaultPaymentMethod.authnetPaymentProfileId;
              const isPayPal = isPayPalPaymentMethod(paymentProfileId) || defaultPaymentMethod.brand?.toLowerCase() === 'paypal';

              if (isPayPal) {
                // ========== PAYPAL REFERENCE TRANSACTION ==========
                const billingAgreementId = extractBillingAgreementId(paymentProfileId);
                if (!billingAgreementId) {
                  throw new Error('Invalid PayPal billing agreement ID');
                }

                const paypalClient = getPayPalClient();
                const invoiceNumber = isPastDueRetry
                  ? `PD-R-${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}-${seeker.userId.slice(-4)}-${Date.now().toString(36)}`
                  : `TR-C-${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}-${seeker.userId.slice(-4)}-${Date.now().toString(36)}`;

                console.log(`🅿️ PayPal: Charging billing agreement ${billingAgreementId} for $${planDetails.amount}`);

                const paypalResult = await paypalClient.chargeReferenceTransaction({
                  billingAgreementId,
                  amount: planDetails.amount,
                  currency: 'USD',
                  description: `${planDetails.name} - ${isPastDueRetry ? 'Past Due Retry' : 'Trial Conversion'}`,
                  invoiceNumber,
                });

                if (!paypalResult.success) {
                  throw new Error(`PayPal payment failed: ${paypalResult.error || 'Unknown error'}`);
                }

                // Use saleId for refund support, fallback to transactionId
                transactionId = paypalResult.saleId || paypalResult.transactionId || transactionId;
                console.log(`✅ PayPal ${actionType} charge successful: transactionId=${paypalResult.transactionId}, saleId=${paypalResult.saleId}`);

              } else {
                // ========== AUTHORIZE.NET CIM TRANSACTION ==========

                // Check if the stored card is expired before attempting the charge
                const _now = new Date();
                const _curYear = _now.getFullYear();
                const _curMonth = _now.getMonth() + 1;
                const _expYear = defaultPaymentMethod.expiryYear;
                const _expMonth = defaultPaymentMethod.expiryMonth;

                if (_expYear && _expMonth) {
                  const _isExpired =
                    _expYear < _curYear ||
                    (_expYear === _curYear && _expMonth < _curMonth);

                  if (_isExpired) {
                    console.warn(`⚠️ AuthNet card expired (${_expMonth}/${_expYear}) for seeker ${seeker.userId} — trying fallback methods`);

                    const _isPastDueRetry = (seeker as any).isPastDueRetry;
                    const _actionType = _isPastDueRetry ? 'Past Due Retry' : 'Trial Conversion';
                    const _fallbackInvoice = _isPastDueRetry
                      ? `PD-R-${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}-${seeker.userId.slice(-4)}`
                      : `TR-C-${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}-${seeker.userId.slice(-4)}`;

                    const _fallbackResult = await tryFallbackPaymentMethods({
                      allPaymentMethods,
                      failedPaymentMethodId: defaultPaymentMethod.id,
                      amount: planDetails.amount,
                      amountInCents: false,
                      description: `${planDetails.name} - ${_actionType}`,
                      invoiceNumber: _fallbackInvoice,
                      email: seeker.user?.email || '',
                      entityLabel: `seeker ${seeker.userId}`,
                    });

                    if (_fallbackResult) {
                      console.log(`✅ [Fallback] seeker ${seeker.userId}: ${_actionType} succeeded with fallback method ${_fallbackResult.paymentMethodId}`);
                      await promoteToDefault(_fallbackResult.paymentMethodId, 'seeker', seeker.userId);
                      if (_fallbackResult.last4 && _fallbackResult.brand) {
                        await db.paymentMethod.update({
                          where: { id: _fallbackResult.paymentMethodId },
                          data: { last4: _fallbackResult.last4, brand: _fallbackResult.brand, updatedAt: new Date() }
                        });
                      }
                      if (_isPastDueRetry) {
                        await this.reactivatePastDueSubscription(seeker.userId, seeker.membershipPlan as string, workingSubscription.id, _fallbackResult.transactionId);
                      } else {
                        await this.convertTrialToPaid(seeker.userId, seeker.membershipPlan as string, workingSubscription.id, _fallbackResult.transactionId);
                      }
                      await this.sendRenewalSuccessNotifications(seeker, planDetails, _fallbackResult.transactionId, _fallbackResult.paymentType === 'PayPal' ? 'PayPal' : 'AuthNet');
                      results.successful++;
                      await this.safeLogAction(cronLogId, {
                        actionType: _isPastDueRetry ? 'seeker_pastdue_reactivated' : 'seeker_trial_converted',
                        entityType: 'seeker',
                        entityId: seeker.userId,
                        status: 'success',
                        message: `${_actionType} succeeded via fallback after expired card - $${planDetails.amount}`,
                        details: LogFormatter.success({
                          plan: seeker.membershipPlan as string,
                          amount: planDetails.amount,
                          transactionId: _fallbackResult.transactionId,
                          method: _fallbackResult.paymentType === 'PayPal' ? 'PayPal' : 'AuthNet',
                          email: seeker.user?.email ?? undefined,
                        }),
                      });
                    } else {
                      await this.handleRenewalFailure(seeker.userId, workingSubscription.id, cronLogId, seeker.user?.email ?? undefined, seeker.membershipPlan as string, _isPastDueRetry);
                      results.failed++;
                      results.errors.push(`${_actionType} failed for seeker ${seeker.userId}: card expired and all fallback methods exhausted`);
                      await this.safeLogAction(cronLogId, {
                        actionType: _isPastDueRetry ? 'seeker_pastdue_retry_failed' : 'seeker_trial_conversion_failed',
                        entityType: 'seeker',
                        entityId: seeker.userId,
                        status: 'failed',
                        message: `${_actionType} failed — card expired and all payment methods exhausted`,
                        details: LogFormatter.skipped('Payment method expired — all fallback methods exhausted', {
                          plan: seeker.membershipPlan as string,
                          email: seeker.user?.email ?? undefined,
                          entityId: seeker.userId,
                        }),
                      });
                    }
                    continue;
                  }
                }

                const authnetProfileIds = paymentProfileId?.split('|');
                if (!authnetProfileIds || authnetProfileIds.length !== 2) {
                  throw new Error('Invalid payment profile ID format');
                }

                const [customerProfileId, authnetPaymentProfileId] = authnetProfileIds;

                // Charge the stored payment method for the full trial amount
                const { getAuthorizeNetClient } = await import('../authorize-net');
                const authorizeNetClient = getAuthorizeNetClient();

                console.log(`🔍 DEBUG: Creating transaction for seeker ${seeker.userId}`, {
                  transactionType: 'authCaptureTransaction',
                  amount: planDetails.amount.toString(),
                  customerProfileId,
                  paymentProfileId: authnetPaymentProfileId,
                  invoiceNumber: isPastDueRetry
                    ? `PD-R-${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}`
                    : `TR-C-${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}`,
                  description: `${planDetails.name} - ${isPastDueRetry ? 'Past Due Retry' : 'Trial Conversion'}`
                });

                const seekerEmail = seeker.user?.email || '';

                const chargeResult = await authorizeNetClient.createTransaction({
                  transactionType: 'authCaptureTransaction',
                  amount: planDetails.amount.toString(),
                  profile: {
                    customerProfileId: customerProfileId,
                    paymentProfile: {
                      paymentProfileId: authnetPaymentProfileId
                    }
                  },
                  order: {
                    invoiceNumber: isPastDueRetry
                      ? `PD-R-${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}`
                      : `TR-C-${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}`,
                    description: `${planDetails.name} - ${isPastDueRetry ? 'Past Due Retry' : 'Trial Conversion'}`
                  },
                  customer: {
                    email: seekerEmail,
                  }
                });

                if (!chargeResult.success) {
                  throw new Error(`Payment failed: ${chargeResult.errors?.map(e => `[${e.errorCode}] ${e.errorText}`).join(', ') || 'Unknown error'}`);
                }

                transactionId = chargeResult.transactionId || transactionId;
                console.log(`✅ AuthNet ${actionType} charge successful: ${transactionId}`);

                // Update payment method with real card details if we got them
                if (chargeResult.accountNumber && chargeResult.accountType) {
                  const last4 = chargeResult.accountNumber.slice(-4);
                  const brand = chargeResult.accountType.toLowerCase();

                  await db.paymentMethod.update({
                    where: { id: defaultPaymentMethod.id },
                    data: {
                      last4: last4,
                      brand: brand,
                      updatedAt: new Date()
                    }
                  });

                  console.log(`✅ Updated payment method with real card details: ${brand} ****${last4}`);
                }
              }

              // Convert trial to paid subscription or reactivate past_due
              if (isPastDueRetry) {
                await this.reactivatePastDueSubscription(seeker.userId, seeker.membershipPlan as string, workingSubscription.id, transactionId);
              } else {
                await this.convertTrialToPaid(seeker.userId, seeker.membershipPlan as string, workingSubscription.id, transactionId);
              }

            } catch (chargeError) {
              console.error(`❌ Default payment failed for seeker ${seeker.userId}:`, chargeError);

              // ========== PAYMENT FALLBACK ==========
              const isPastDueRetry = (seeker as any).isPastDueRetry;
              const actionType = isPastDueRetry ? 'Past Due Retry' : 'Trial Conversion';
              const fallbackInvoice = isPastDueRetry
                ? `PD-R-${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}-${seeker.userId.slice(-4)}`
                : `TR-C-${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}-${seeker.userId.slice(-4)}`;

              const fallbackResult = await tryFallbackPaymentMethods({
                allPaymentMethods,
                failedPaymentMethodId: defaultPaymentMethod.id,
                amount: planDetails.amount,
                amountInCents: false,
                description: `${planDetails.name} - ${actionType}`,
                invoiceNumber: fallbackInvoice,
                email: seeker.user?.email || '',
                entityLabel: `seeker ${seeker.userId}`,
              });

              if (fallbackResult) {
                console.log(`✅ [Fallback] seeker ${seeker.userId}: ${actionType} succeeded with fallback method ${fallbackResult.paymentMethodId}`);

                // Promote successful method to default
                await promoteToDefault(fallbackResult.paymentMethodId, 'seeker', seeker.userId);

                // Update card details if available
                if (fallbackResult.last4 && fallbackResult.brand) {
                  await db.paymentMethod.update({
                    where: { id: fallbackResult.paymentMethodId },
                    data: { last4: fallbackResult.last4, brand: fallbackResult.brand, updatedAt: new Date() }
                  });
                }

                // Convert trial to paid or reactivate past_due
                if (isPastDueRetry) {
                  await this.reactivatePastDueSubscription(seeker.userId, seeker.membershipPlan as string, workingSubscription.id, fallbackResult.transactionId);
                } else {
                  await this.convertTrialToPaid(seeker.userId, seeker.membershipPlan as string, workingSubscription.id, fallbackResult.transactionId);
                }

                transactionId = fallbackResult.transactionId;

                // Log fallback success to action_log
                await this.safeLogAction(cronLogId, {
                  actionType: isPastDueRetry ? 'seeker_pastdue_reactivated' : 'seeker_trial_converted',
                  entityType: 'seeker',
                  entityId: seeker.userId,
                  status: 'success',
                  message: isPastDueRetry
                    ? `Past due subscription reactivated - $${planDetails.amount}`
                    : `Trial converted to paid - $${planDetails.amount}`,
                  details: LogFormatter.success({
                    plan: seeker.membershipPlan as string,
                    amount: planDetails.amount,
                    transactionId,
                    method: fallbackResult.paymentType === 'PayPal' ? 'PayPal' : 'AuthNet',
                    email: seeker.user?.email ?? undefined,
                  }),
                });
              } else {
                // All methods failed
                await this.handleRenewalFailure(seeker.userId, workingSubscription.id, cronLogId, seeker.user?.email ?? undefined, seeker.membershipPlan as string, isPastDueRetry);
                results.failed++;
                results.errors.push(`${actionType} failed for seeker ${seeker.userId}: ${chargeError} (all payment methods exhausted)`);

                // Log to action_log
                await this.safeLogAction(cronLogId, {
                  actionType: isPastDueRetry ? 'seeker_pastdue_retry_failed' : 'seeker_trial_conversion_failed',
                  entityType: 'seeker',
                  entityId: seeker.userId,
                  status: 'failed',
                  message: `${actionType} failed - all payment methods exhausted`,
                  details: LogFormatter.fallbackExhausted({
                    plan: seeker.membershipPlan as string,
                    amount: planDetails.amount,
                    method: isPayPalPaymentMethod(defaultPaymentMethod.authnetPaymentProfileId) ? 'PayPal' : 'AuthNet',
                    error: { error: String(chargeError) } as any,
                    email: seeker.user?.email ?? undefined,
                  }),
                });

                continue;
              }
            }

            // Send success notifications
            await this.sendRenewalSuccessNotifications(seeker, planDetails, transactionId, isPayPalPaymentMethod(defaultPaymentMethod.authnetPaymentProfileId) ? 'PayPal' : 'AuthNet', defaultPaymentMethod);

            results.successful++;
            console.log(`Successfully ${isPastDueRetry ? 'reactivated past_due subscription' : 'converted trial'} for seeker ${seeker.userId}`);

            // Log success to action_log
            const paymentMethodType = isPayPalPaymentMethod(defaultPaymentMethod.authnetPaymentProfileId) ? 'PayPal' : 'AuthNet';
            await this.safeLogAction(cronLogId, {
              actionType: isPastDueRetry ? 'seeker_pastdue_reactivated' : 'seeker_trial_converted',
              entityType: 'seeker',
              entityId: seeker.userId,
              status: 'success',
              message: isPastDueRetry
                ? `Past due subscription reactivated - $${planDetails.amount}`
                : `Trial converted to paid - $${planDetails.amount}`,
              details: LogFormatter.success({
                plan: seeker.membershipPlan as string,
                amount: planDetails.amount,
                transactionId,
                method: paymentMethodType,
                email: seeker.user?.email ?? undefined,
              }),
            });
          } else {
            // Regular renewal processing
            console.log(`Processing regular renewal for seeker ${seeker.userId} with plan ${seeker.membershipPlan}`);

            // Skip charging if user canceled before the billing date
            if (workingSubscription.cancelAtPeriodEnd) {
              console.log(`Subscription canceled for seeker ${seeker.userId} - skipping renewal charge`);

              await db.jobSeeker.update({
                where: { userId: seeker.userId },
                data: {
                  membershipPlan: 'none',
                  membershipExpiresAt: null,
                  profileVisibility: 'private',
                  cancelledSeeker: true,
                  cancelledAt: new Date(),
                  hasPreviousSubscription: true,
                  updatedAt: new Date()
                }
              });

              await db.subscription.update({
                where: { id: workingSubscription.id },
                data: {
                  status: 'canceled',
                  updatedAt: new Date()
                }
              });

              await this.safeLogAction(cronLogId, {
                actionType: 'seeker_subscription_canceled',
                entityType: 'seeker',
                entityId: seeker.userId,
                status: 'success',
                message: 'Subscription ended without charge (user canceled before billing date)',
                details: LogFormatter.skipped('Subscription canceled by user - ended without charge', {
                  plan: seeker.membershipPlan as string,
                  email: seeker.user?.email ?? undefined,
                  entityId: seeker.userId,
                }),
              });

              results.successful++;
              continue;
            }

            // Initialize transaction ID for renewal
            let transactionId = `RNW-${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}${String(new Date().getHours()).padStart(2, '0')}${String(new Date().getMinutes()).padStart(2, '0')}-${seeker.userId.slice(-4)}`;

            try {
              // Check if this is a PayPal or AuthNet payment method (by profile ID format or brand field)
              const isPayPal = isPayPalPaymentMethod(defaultPaymentMethod.authnetPaymentProfileId) || defaultPaymentMethod.brand?.toLowerCase() === 'paypal';

              if (isPayPal) {
                // PayPal Reference Transaction for renewal
                console.log(`🔵 Processing PayPal renewal for seeker ${seeker.userId}`);

                const billingAgreementId = extractBillingAgreementId(defaultPaymentMethod.authnetPaymentProfileId);
                if (!billingAgreementId) {
                  throw new Error('Invalid PayPal billing agreement ID');
                }

                const paypalClient = getPayPalClient();
                const paypalResult = await paypalClient.chargeReferenceTransaction({
                  billingAgreementId,
                  amount: planDetails.amount,
                  currency: 'USD',
                  description: `${planDetails.name} - Subscription Renewal`,
                  invoiceNumber: `RNW-${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}-${seeker.userId.slice(-4)}-${Date.now().toString(36)}`
                });

                if (!paypalResult.success) {
                  throw new Error(`PayPal payment failed: ${paypalResult.error || 'Unknown error'}`);
                }

                // Use saleId for refund support, fallback to transactionId
                transactionId = paypalResult.saleId || paypalResult.transactionId || transactionId;
                console.log(`✅ PayPal renewal charge successful: transactionId=${paypalResult.transactionId}, saleId=${paypalResult.saleId}`);

                // Renew membership with PayPal transaction ID
                await this.renewMembership(seeker.userId, seeker.membershipPlan as string, workingSubscription.id, transactionId, 'PayPal');

                // Send success notifications
                await this.sendRenewalSuccessNotifications(seeker, planDetails, transactionId, 'PayPal', defaultPaymentMethod);

                results.successful++;
                console.log(`Successfully renewed PayPal subscription for seeker ${seeker.userId}`);

                // Log success to action_log
                await this.safeLogAction(cronLogId, {
                  actionType: 'seeker_renewal_success',
                  entityType: 'seeker',
                  entityId: seeker.userId,
                  status: 'success',
                  message: `Subscription renewed via PayPal - $${planDetails.amount}`,
                  details: LogFormatter.success({
                    plan: seeker.membershipPlan as string,
                    amount: planDetails.amount,
                    transactionId,
                    method: 'PayPal',
                    email: seeker.user?.email ?? undefined,
                  }),
                });

              } else {
                // AuthNet payment for renewal (existing logic)

                // Check if the stored card is expired before attempting the charge
                const _now = new Date();
                const _curYear = _now.getFullYear();
                const _curMonth = _now.getMonth() + 1;
                const _expYear = defaultPaymentMethod.expiryYear;
                const _expMonth = defaultPaymentMethod.expiryMonth;

                if (_expYear && _expMonth) {
                  const _isExpired =
                    _expYear < _curYear ||
                    (_expYear === _curYear && _expMonth < _curMonth);

                  if (_isExpired) {
                    console.warn(`⚠️ AuthNet card expired (${_expMonth}/${_expYear}) for seeker ${seeker.userId} — trying fallback methods`);

                    const _fallbackInvoice = `RNW-${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}-${seeker.userId.slice(-4)}`;

                    const _fallbackResult = await tryFallbackPaymentMethods({
                      allPaymentMethods,
                      failedPaymentMethodId: defaultPaymentMethod.id,
                      amount: planDetails.amount,
                      amountInCents: false,
                      description: `${planDetails.name} - Subscription Renewal`,
                      invoiceNumber: _fallbackInvoice,
                      email: seeker.user?.email || '',
                      entityLabel: `seeker ${seeker.userId}`,
                    });

                    if (_fallbackResult) {
                      console.log(`✅ [Fallback] seeker ${seeker.userId}: Renewal succeeded with fallback method ${_fallbackResult.paymentMethodId}`);
                      await promoteToDefault(_fallbackResult.paymentMethodId, 'seeker', seeker.userId);
                      if (_fallbackResult.last4 && _fallbackResult.brand) {
                        await db.paymentMethod.update({
                          where: { id: _fallbackResult.paymentMethodId },
                          data: { last4: _fallbackResult.last4, brand: _fallbackResult.brand, updatedAt: new Date() }
                        });
                      }
                      const _paymentType = _fallbackResult.paymentType === 'PayPal' ? 'PayPal' : 'AuthNet';
                      await this.renewMembership(seeker.userId, seeker.membershipPlan as string, workingSubscription.id, _fallbackResult.transactionId, _paymentType);
                      await this.sendRenewalSuccessNotifications(seeker, planDetails, _fallbackResult.transactionId, _paymentType);
                      results.successful++;
                      await this.safeLogAction(cronLogId, {
                        actionType: 'seeker_renewal_success',
                        entityType: 'seeker',
                        entityId: seeker.userId,
                        status: 'success',
                        message: `Renewal succeeded via fallback after expired card - $${planDetails.amount}`,
                        details: LogFormatter.success({
                          plan: seeker.membershipPlan as string,
                          amount: planDetails.amount,
                          transactionId: _fallbackResult.transactionId,
                          method: _paymentType,
                          email: seeker.user?.email ?? undefined,
                        }),
                      });
                    } else {
                      await this.handleRenewalFailure(seeker.userId, workingSubscription.id, cronLogId, seeker.user?.email ?? undefined, seeker.membershipPlan as string, false);
                      results.failed++;
                      results.errors.push(`Renewal failed for seeker ${seeker.userId}: card expired and all fallback methods exhausted`);
                      await this.safeLogAction(cronLogId, {
                        actionType: 'seeker_renewal_failed',
                        entityType: 'seeker',
                        entityId: seeker.userId,
                        status: 'failed',
                        message: `Renewal failed — card expired and all payment methods exhausted`,
                        details: LogFormatter.fallbackExhausted({
                          plan: seeker.membershipPlan as string,
                          amount: planDetails.amount,
                          method: 'AuthNet',
                          error: { error: 'Primary card expired' } as any,
                          email: seeker.user?.email ?? undefined,
                        }),
                      });
                    }
                    continue;
                  }
                }

                // Get the stored payment method details
                const authnetProfileIds = defaultPaymentMethod.authnetPaymentProfileId?.split('|');
                if (!authnetProfileIds || authnetProfileIds.length !== 2) {
                  throw new Error('Invalid payment profile ID format');
                }

                const [customerProfileId, paymentProfileId] = authnetProfileIds;

                // Charge the stored payment method for renewal
                const { getAuthorizeNetClient } = await import('../authorize-net');
                const authorizeNetClient = getAuthorizeNetClient();

                console.log(`🔍 DEBUG: Creating renewal transaction for seeker ${seeker.userId}`, {
                  transactionType: 'authCaptureTransaction',
                  amount: planDetails.amount.toString(),
                  customerProfileId,
                  paymentProfileId,
                  invoiceNumber: `RNW-${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}-${seeker.userId.slice(-4)}`,
                  description: `${planDetails.name} - Subscription Renewal`
                });

                const seekerEmail = seeker.user?.email || '';

                const chargeResult = await authorizeNetClient.createTransaction({
                  transactionType: 'authCaptureTransaction',
                  amount: planDetails.amount.toString(),
                  profile: {
                    customerProfileId: customerProfileId,
                    paymentProfile: {
                      paymentProfileId: paymentProfileId
                    }
                  },
                  order: {
                    invoiceNumber: `RNW-${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}-${seeker.userId.slice(-4)}`,
                    description: `${planDetails.name} - Subscription Renewal`
                  },
                  customer: {
                    email: seekerEmail,
                  }
                });

                if (!chargeResult.success) {
                  throw new Error(`Payment failed: ${chargeResult.errors?.map(e => `[${e.errorCode}] ${e.errorText}`).join(', ') || 'Unknown error'}`);
                }

                transactionId = chargeResult.transactionId || transactionId;
                console.log(`✅ Renewal charge successful: ${transactionId}`);

                // Update payment method with real card details if we got them
                if (chargeResult.accountNumber && chargeResult.accountType) {
                  const last4 = chargeResult.accountNumber.slice(-4);
                  const brand = chargeResult.accountType.toLowerCase();

                  await db.paymentMethod.update({
                    where: { id: defaultPaymentMethod.id },
                    data: {
                      last4: last4,
                      brand: brand,
                      updatedAt: new Date()
                    }
                  });

                  console.log(`✅ Updated payment method with real card details: ${brand} ****${last4}`);
                }

                // Renew membership with real transaction ID
                await this.renewMembership(seeker.userId, seeker.membershipPlan as string, workingSubscription.id, transactionId, 'AuthNet');

                // Send success notifications
                await this.sendRenewalSuccessNotifications(seeker, planDetails, transactionId, 'AuthNet', defaultPaymentMethod);

                results.successful++;
                console.log(`Successfully renewed subscription for seeker ${seeker.userId}`);

                // Log success to action_log
                await this.safeLogAction(cronLogId, {
                  actionType: 'seeker_renewal_success',
                  entityType: 'seeker',
                  entityId: seeker.userId,
                  status: 'success',
                  message: `Subscription renewed via AuthNet - $${planDetails.amount}`,
                  details: LogFormatter.success({
                    plan: seeker.membershipPlan as string,
                    amount: planDetails.amount,
                    transactionId,
                    method: 'AuthNet',
                    email: seeker.user?.email ?? undefined,
                  }),
                });
              }

            } catch (chargeError) {
              console.error(`❌ Default renewal payment failed for seeker ${seeker.userId}:`, chargeError);

              // ========== PAYMENT FALLBACK ==========
              const fallbackInvoice = `RNW-${new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }).replace(/\//g, '')}-${seeker.userId.slice(-4)}`;

              const fallbackResult = await tryFallbackPaymentMethods({
                allPaymentMethods,
                failedPaymentMethodId: defaultPaymentMethod.id,
                amount: planDetails.amount,
                amountInCents: false,
                description: `${planDetails.name} - Subscription Renewal`,
                invoiceNumber: fallbackInvoice,
                email: seeker.user?.email || '',
                entityLabel: `seeker ${seeker.userId}`,
              });

              if (fallbackResult) {
                console.log(`✅ [Fallback] seeker ${seeker.userId}: Renewal succeeded with fallback method ${fallbackResult.paymentMethodId}`);

                // Promote successful method to default
                await promoteToDefault(fallbackResult.paymentMethodId, 'seeker', seeker.userId);

                // Update card details if available
                if (fallbackResult.last4 && fallbackResult.brand) {
                  await db.paymentMethod.update({
                    where: { id: fallbackResult.paymentMethodId },
                    data: { last4: fallbackResult.last4, brand: fallbackResult.brand, updatedAt: new Date() }
                  });
                }

                // Renew membership with fallback transaction
                const paymentType = fallbackResult.paymentType === 'PayPal' ? 'PayPal' : 'AuthNet';
                await this.renewMembership(seeker.userId, seeker.membershipPlan as string, workingSubscription.id, fallbackResult.transactionId, paymentType);

                // Send success notifications
                const fallbackPaymentMethodRecord = allPaymentMethods.find(pm => pm.id === fallbackResult.paymentMethodId) || defaultPaymentMethod;
                await this.sendRenewalSuccessNotifications(seeker, planDetails, fallbackResult.transactionId, paymentType, fallbackPaymentMethodRecord);

                results.successful++;
                console.log(`Successfully renewed subscription via fallback for seeker ${seeker.userId}`);

                // Log fallback success to action_log
                await this.safeLogAction(cronLogId, {
                  actionType: 'seeker_renewal_success',
                  entityType: 'seeker',
                  entityId: seeker.userId,
                  status: 'success',
                  message: `Subscription renewed via fallback (${paymentType}) - $${planDetails.amount}`,
                  details: LogFormatter.success({
                    plan: seeker.membershipPlan as string,
                    amount: planDetails.amount,
                    transactionId: fallbackResult.transactionId,
                    method: paymentType,
                    email: seeker.user?.email ?? undefined,
                  }),
                });
              } else {
                // All methods failed
                await this.handleRenewalFailure(seeker.userId, workingSubscription.id, cronLogId, seeker.user?.email ?? undefined, seeker.membershipPlan as string, false);
                results.failed++;
                results.errors.push(`Renewal failed for seeker ${seeker.userId}: ${chargeError} (all payment methods exhausted)`);

                // Log failure to action_log
                await this.safeLogAction(cronLogId, {
                  actionType: 'seeker_renewal_failed',
                  entityType: 'seeker',
                  entityId: seeker.userId,
                  status: 'failed',
                  message: `Renewal failed - all payment methods exhausted`,
                  details: LogFormatter.fallbackExhausted({
                    plan: seeker.membershipPlan as string,
                    amount: planDetails.amount,
                    method: isPayPalPaymentMethod(defaultPaymentMethod.authnetPaymentProfileId) ? 'PayPal' : 'AuthNet',
                    error: { error: String(chargeError) } as any,
                    email: seeker.user?.email ?? undefined,
                  }),
                });
              }
              continue;
            }
          }

        } catch (error) {
          results.failed++;
          const errorMsg = `Error processing renewal for seeker ${seeker.userId}: ${error}`;
          console.error(errorMsg);
          results.errors.push(errorMsg);

          // Log unexpected error to action_log
          await this.safeLogAction(cronLogId, {
            actionType: 'seeker_renewal_error',
            entityType: 'seeker',
            entityId: seeker.userId,
            status: 'failed',
            message: `Unexpected error during renewal`,
            details: LogFormatter.genericError(error, {
              plan: seeker.membershipPlan as string,
              email: seeker.user?.email ?? undefined,
            }),
          });
        }
      }

      // Track metrics
      await CacheService.incrementMetric('recurring_billing_processed');
      await CacheService.incrementMetric('recurring_billing_successful');
      await CacheService.incrementMetric('recurring_billing_failed');

      return results;
    } catch (error) {
      console.error('Error processing subscription renewals:', error);
      results.errors.push(`Recurring billing process failed: ${error}`);
      return results;
    }
  }

  /**
   * End trial without charge (user canceled during trial)
   */
  private static async endTrialWithoutCharge(
    seekerId: string,
    subscriptionId: string
  ): Promise<void> {
    // Update seeker to remove trial status and set membership to none
    await db.jobSeeker.update({
      where: { userId: seekerId },
      data: {
        membershipPlan: 'none',
        membershipExpiresAt: null,
        isOnTrial: false,
        trialEndsAt: null,
        profileVisibility: 'private',
        cancelledSeeker: true,
        cancelledAt: new Date(),
        hasPreviousSubscription: true,
        updatedAt: new Date()
      }
    });

    // Update subscription to canceled
    await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'canceled',
        updatedAt: new Date()
      }
    });

    console.log(`Trial ended without charge for seeker ${seekerId}`);
  }

  /**
   * Convert trial to paid subscription
   */
  private static async convertTrialToPaid(
    seekerId: string,
    membershipPlan: string,
    subscriptionId: string,
    transactionId: string
  ): Promise<void> {
    const expirationDate = calcPeriodEnd(membershipPlan)

    const resolvedPlan = getPlanByMembershipPlan(membershipPlan)?.membershipPlan ?? membershipPlan

    // Update seeker to convert from trial to paid
    await db.jobSeeker.update({
      where: { userId: seekerId },
      data: {
        membershipPlan: resolvedPlan as any,
        membershipExpiresAt: expirationDate,
        isOnTrial: false,
        trialEndsAt: null,
        updatedAt: new Date()
      }
    });

    // Update subscription
    await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: expirationDate,
        nextBillingDate: expirationDate,
        updatedAt: new Date()
      }
    });

    // Record payment
    const userProfile = await db.userProfile.findUnique({
      where: { id: seekerId }
    });

    if (userProfile) {
      await db.externalPayment.create({
        data: {
          userId: userProfile.id,
          authnetTransactionId: transactionId,
          amount: this.getPlanDetails(membershipPlan)?.amount || 0,
          planId: this.mapMembershipPlanToPlanId(membershipPlan),
          status: 'completed',
          webhookProcessedAt: new Date()
        }
      });
    }

    // Send renewal notification for trial conversion
    const planDetails = this.getPlanDetails(membershipPlan);
    if (planDetails && userProfile) {
      try {
        await inAppNotificationService.notifySeekerSubscriptionRenewal(
          seekerId,
          planDetails.name,
          planDetails.amount,
          expirationDate
        );
      } catch (error) {
        console.error(`Failed to send trial conversion notification for seeker ${seekerId}:`, error);
        // Don't throw - notification failure shouldn't block trial conversion
      }
    }

    console.log(`Trial converted to paid subscription for seeker ${seekerId}`);
  }

  /**
   * Reactivate past due subscription after successful payment
   */
  private static async reactivatePastDueSubscription(
    seekerId: string,
    membershipPlan: string,
    subscriptionId: string,
    transactionId: string
  ): Promise<void> {
    const expirationDate = calcPeriodEnd(membershipPlan)

    // Update seeker to reactivate membership
    await db.jobSeeker.update({
      where: { userId: seekerId },
      data: {
        membershipPlan: membershipPlan as any,
        membershipExpiresAt: expirationDate,
        isOnTrial: false,
        trialEndsAt: null,
        updatedAt: new Date()
      }
    });

    // Reactivate subscription
    await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: expirationDate,
        nextBillingDate: expirationDate,
        updatedAt: new Date()
      }
    });

    // Record payment
    const userProfile = await db.userProfile.findUnique({
      where: { id: seekerId }
    });

    if (userProfile) {
      await db.externalPayment.create({
        data: {
          userId: userProfile.id,
          authnetTransactionId: transactionId,
          amount: this.getPlanDetails(membershipPlan)?.amount || 0,
          planId: this.mapMembershipPlanToPlanId(membershipPlan),
          status: 'completed',
          webhookProcessedAt: new Date()
        }
      });
    }

    // Send renewal notification for past due reactivation
    const planDetails = this.getPlanDetails(membershipPlan);
    if (planDetails && userProfile) {
      try {
        await inAppNotificationService.notifySeekerSubscriptionRenewal(
          seekerId,
          planDetails.name,
          planDetails.amount,
          expirationDate
        );
      } catch (error) {
        console.error(`Failed to send reactivation notification for seeker ${seekerId}:`, error);
        // Don't throw - notification failure shouldn't block reactivation
      }
    }

    console.log(`Past due subscription reactivated for seeker ${seekerId}`);
  }

  /**
   * Renew membership after successful payment
   */
  private static async renewMembership(
    seekerId: string,
    membershipPlan: string,
    subscriptionId: string,
    transactionId: string,
    paymentMethod: 'PayPal' | 'AuthNet' = 'AuthNet'
  ): Promise<void> {
    const plan = getPlanByMembershipPlan(membershipPlan)
    const resolvedPlan = plan?.membershipPlan ?? membershipPlan
    const expirationDate = calcPeriodEnd(membershipPlan)

    // Update seeker membership
    await db.jobSeeker.update({
      where: { userId: seekerId },
      data: {
        membershipPlan: resolvedPlan as any,
        membershipExpiresAt: expirationDate,
        updatedAt: new Date()
      }
    });

    // Update subscription
    await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: expirationDate,
        nextBillingDate: expirationDate,
        updatedAt: new Date()
      }
    });

    // Record payment
    const userProfile = await db.userProfile.findUnique({
      where: { id: seekerId }
    });

    if (userProfile) {
      // Set ghlTransactionId with PAYPAL_ prefix for PayPal payments
      // This is used on the Sales page to identify PayPal transactions
      const ghlTransactionId = paymentMethod === 'PayPal'
        ? `PAYPAL_${transactionId}`
        : undefined;

      await db.externalPayment.create({
        data: {
          userId: userProfile.id,
          authnetTransactionId: transactionId,
          ghlTransactionId: ghlTransactionId,
          amount: this.getPlanDetails(membershipPlan)?.amount || 0,
          planId: this.mapMembershipPlanToPlanId(membershipPlan),
          status: 'completed',
          webhookProcessedAt: new Date()
        }
      });
    }

    // Send renewal notification with plan details and next billing date
    const planDetails = this.getPlanDetails(membershipPlan);
    if (planDetails && userProfile) {
      try {
        await inAppNotificationService.notifySeekerSubscriptionRenewal(
          seekerId,
          planDetails.name,
          planDetails.amount,
          expirationDate
        );
      } catch (error) {
        console.error(`Failed to send renewal notification for seeker ${seekerId}:`, error);
        // Don't throw - notification failure shouldn't block renewal
      }
    }

    // Schedule future reminders
    await MembershipReminderService.scheduleMembershipReminders(seekerId);
  }

  /** Number of days to retry payment before final cancellation */
  private static readonly GRACE_PERIOD_DAYS = 15;

  /**
   * Handle renewal payment failure with a 15-day grace period.
   *
   * First failure  → transition subscription to 'past_due' (keeps access).
   * Subsequent failures within 15 days → log retry, no action.
   * After 15 days of past_due (or isPastDueRetry=true) → full cancellation with cancelledSeeker flags.
   */
  private static async handleRenewalFailure(
    seekerId: string,
    subscriptionId: string,
    cronLogId?: string,
    email?: string,
    plan?: string,
    isPastDueRetry: boolean = false
  ): Promise<void> {
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
      select: { status: true, updatedAt: true }
    });

    // ── First failure: transition to past_due ──
    if (!isPastDueRetry && subscription?.status !== 'past_due') {
      await db.subscription.update({
        where: { id: subscriptionId },
        data: { status: 'past_due', updatedAt: new Date() }
      });

      // Clear trial flags so the seeker is no longer picked up by the
      // isOnTrial query in dueSubscriptions on subsequent daily runs.
      await db.jobSeeker.update({
        where: { userId: seekerId },
        data: { isOnTrial: false, trialEndsAt: null, updatedAt: new Date() }
      });

      await this.safeLogAction(cronLogId, {
        actionType: 'seeker_payment_retry_scheduled',
        entityType: 'seeker',
        entityId: seekerId,
        status: 'warning',
        message: `Payment failed — entering ${this.GRACE_PERIOD_DAYS}-day grace period`,
        details: LogFormatter.skipped('First payment failure — will retry daily', {
          plan, email, entityId: seekerId,
        }),
      });
      return;
    }

    // ── Already past_due: check if grace period has expired ──
    if (!isPastDueRetry && subscription?.status === 'past_due') {
      const daysPastDue = Math.floor(
        (Date.now() - subscription.updatedAt.getTime()) / (24 * 60 * 60 * 1000)
      );

      if (daysPastDue < this.GRACE_PERIOD_DAYS) {
        // Still within grace period — log and let the cron retry tomorrow
        await this.safeLogAction(cronLogId, {
          actionType: 'seeker_payment_retry_scheduled',
          entityType: 'seeker',
          entityId: seekerId,
          status: 'warning',
          message: `Payment retry failed (day ${daysPastDue + 1} of ${this.GRACE_PERIOD_DAYS})`,
          details: LogFormatter.skipped(`Grace period day ${daysPastDue + 1}/${this.GRACE_PERIOD_DAYS}`, {
            plan, email, entityId: seekerId,
          }),
        });
        return;
      }
    }

    // ── Grace period expired or isPastDueRetry: full cancellation ──
    await db.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'canceled', updatedAt: new Date() }
    });

    await db.jobSeeker.update({
      where: { userId: seekerId },
      data: {
        membershipPlan: 'none',
        membershipExpiresAt: null,
        isOnTrial: false,
        trialEndsAt: null,
        profileVisibility: 'private',
        cancelledSeeker: true,
        cancelledAt: new Date(),
        hasPreviousSubscription: true,
        updatedAt: new Date()
      }
    });

    await this.safeLogAction(cronLogId, {
      actionType: 'seeker_subscription_cancelled_payment_failed',
      entityType: 'seeker',
      entityId: seekerId,
      status: 'failed',
      message: `Subscription cancelled after ${this.GRACE_PERIOD_DAYS}-day grace period — all retries exhausted`,
      details: LogFormatter.skipped('Subscription cancelled - payment failed after grace period', {
        plan, email, entityId: seekerId,
      }),
    });
  }

  /**
   * Send renewal success notifications
   */
  private static async sendRenewalSuccessNotifications(
    seeker: any,
    planDetails: any,
    transactionId: string,
    paymentMethod: 'AuthNet' | 'PayPal' = 'AuthNet',
    defaultPaymentMethodRecord?: any
  ): Promise<void> {
    try {
      await ExternalWebhookService.sendSeekerPaymentConfirmation({
        userId: seeker.userId,
        email: seeker.user.email,
        firstName: seeker.user.firstName || '',
        amount: planDetails.amount,
        description: `${planDetails.name} - Subscription Renewal`,
        transactionId: transactionId,
        planName: planDetails.name
      });

      await inAppNotificationService.notifySeekerPaymentConfirmation(
        seeker.userId,
        planDetails.amount,
        `${planDetails.name} - Subscription Renewal`,
        transactionId,
        planDetails.name
      );

      // ====== GHL CONTACT NOTE: Sync renewal activity ======
      try {
        const { createGHLService } = await import('../ghl-sync-service');
        const ghlService = await createGHLService();

        if (ghlService) {
          const ghlContactId = await ghlService.syncUserToGHL(seeker.userId, 'update');

          if (ghlContactId) {
            await ghlService.addPurchaseActivityNote(
              seeker.userId,
              'subscription_purchase',
              {
                amount: planDetails.amount,
                planName: `${planDetails.name} (Renewal)`,
                paymentMethod: paymentMethod
              },
              ghlContactId
            );
            console.log(`✅ GHL: Renewal activity note added for ${paymentMethod} payment`);
          }
        }
      } catch (ghlError) {
        console.error('❌ GHL sync error (non-blocking):', ghlError);
        // Don't throw - GHL sync failure shouldn't break renewal flow
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
        const orderSuffix = transactionId.slice(-4);
        const orderNumber = `ORD-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${orderSuffix}`;

        // Calculate next payment date based on plan
        const nextPaymentDate = new Date();
        switch (planDetails.name) {
          case '3 Day Free Trial Subscription':
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
            break;
          case 'Flex Gold Professional':
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 2);
            break;
          case 'Flex VIP Platinum Professional':
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 3);
            break;
          case 'Flex Annual Platinum Professional':
            nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
            break;
          default:
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        }

        // Get billing period text
        const billingText = planDetails.name.includes('Annual') ? 'year' :
          planDetails.name.includes('VIP') ? '3 months' :
            planDetails.name.includes('Gold') ? '2 months' : 'month';

        await NotificationService.sendAdminPaymentNotification({
          orderNumber,
          orderDate: `${orderDateFormatted} at ${orderTimeFormatted}`,
          customerName: seeker.user.name || seeker.user.firstName || 'Unknown',
          customerType: 'Seeker',
          customerId: `USR-${seeker.userId.slice(-4).toUpperCase()}`,
          customerEmail: seeker.user.email || '',
          customerPhone: seeker.user.phone || undefined,
          productDescription: `${planDetails.name} - Subscription Renewal`,
          quantity: 1,
          price: planDetails.amount,
          subscriptionStartDate: orderDateFormatted,
          nextPaymentDate: nextPaymentDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          recurringTotal: `$${planDetails.amount.toFixed(2)} / ${billingText}`,
          isRenewal: true,
          paymentMethod: paymentMethod === 'PayPal' ? 'PayPal' : 'Credit Card',
          transactionId,
          billingFirstName: defaultPaymentMethodRecord?.billingFirstName || undefined,
          billingLastName: defaultPaymentMethodRecord?.billingLastName || undefined,
          billingCardAddress: defaultPaymentMethodRecord?.billingAddress || undefined,
          billingCardCity: defaultPaymentMethodRecord?.billingCity || undefined,
          billingCardState: defaultPaymentMethodRecord?.billingState || undefined,
          billingCardZipCode: defaultPaymentMethodRecord?.billingZipCode || undefined,
          paymentType: paymentMethod === 'PayPal' ? 'paypal' : 'card',
        });

        console.log(`✅ SEEKER RENEWAL: Admin order notification email sent`);
      } catch (adminEmailError) {
        console.warn('⚠️ SEEKER RENEWAL: Admin order notification email failed:', adminEmailError);
        // Don't throw - email failure shouldn't break renewal flow
      }

      // Send customer payment confirmation email for renewal - queued with feature flag
      try {
        await NotificationService.sendCustomerPaymentConfirmationEmail({
          email: seeker.user.email || '',
          firstName: seeker.user.firstName || seeker.user.name || 'Valued Customer',
          amount: planDetails.amount,
          description: `${planDetails.name} - Subscription Renewal`,
          transactionId,
          lineItems: [{ name: `${planDetails.name} Renewal`, amount: planDetails.amount }],
          isRecurring: false,
          billingFirstName: defaultPaymentMethodRecord?.billingFirstName || undefined,
          billingLastName: defaultPaymentMethodRecord?.billingLastName || undefined,
          address: defaultPaymentMethodRecord?.billingAddress || undefined,
          city: defaultPaymentMethodRecord?.billingCity || undefined,
          state: defaultPaymentMethodRecord?.billingState || undefined,
          zipCode: defaultPaymentMethodRecord?.billingZipCode || undefined,
          paymentType: paymentMethod === 'PayPal' ? 'paypal' : 'card',
          paymentMethod: paymentMethod !== 'PayPal' && defaultPaymentMethodRecord?.last4
            ? `Card ending in ${defaultPaymentMethodRecord.last4}`
            : undefined,
        });
        console.log('✅ SEEKER RENEWAL: Customer payment confirmation email queued');
      } catch (customerEmailError) {
        console.warn('⚠️ SEEKER RENEWAL: Customer payment confirmation email failed:', customerEmailError);
        // Don't throw - email failure shouldn't break renewal flow
      }
    } catch (error) {
      console.error('Failed to send renewal success notifications:', error);
    }
  }

  /**
   * Send renewal failure notifications
   */
  private static async sendRenewalFailureNotifications(
    seeker: any,
    planDetails: any
  ): Promise<void> {
    try {
      // Send payment failure notification
      console.log(`Would send payment failure notification to seeker ${seeker.userId} for plan ${planDetails.name}`);
      // Note: Would implement proper notification sending here
    } catch (error) {
      console.error('Failed to send renewal failure notifications:', error);
    }
  }

  /**
   * Get plan details by membership plan
   */
  private static getPlanDetails(membershipPlan: string): { amount: number; name: string } | null {
    const plan = getPlanByMembershipPlan(membershipPlan as string)
    if (!plan) return null
    return { amount: plan.price, name: plan.name }
  }

  /**
   * Map membership plan to plan ID
   */
  private static mapMembershipPlanToPlanId(membershipPlan: string): string {
    return membershipPlanToPlanId(membershipPlan)
  }

  /**
   * Get subscription renewal statistics
   */
  static async getRenewalStats(): Promise<{
    dueToday: number;
    dueThisWeek: number;
    successfulRenewals: number;
    failedRenewals: number;
    pastDueSubscriptions: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const [dueToday, dueThisWeek, pastDueSubscriptions] = await Promise.all([
        db.jobSeeker.count({
          where: {
            membershipPlan: { not: 'none' },
            membershipExpiresAt: {
              gte: today,
              lt: tomorrow
            },
            isSuspended: false
          }
        }),
        db.jobSeeker.count({
          where: {
            membershipPlan: { not: 'none' },
            membershipExpiresAt: {
              gte: new Date(),
              lte: nextWeek
            },
            isSuspended: false
          }
        }),
        db.subscription.count({
          where: {
            status: 'past_due'
          }
        })
      ]);

      // Get metrics from cache (simplified - would need proper metric storage)
      const successfulRenewals = 0; // Would implement proper metric retrieval
      const failedRenewals = 0; // Would implement proper metric retrieval

      return {
        dueToday,
        dueThisWeek,
        successfulRenewals,
        failedRenewals,
        pastDueSubscriptions
      };
    } catch (error) {
      console.error('Error getting renewal stats:', error);
      return {
        dueToday: 0,
        dueThisWeek: 0,
        successfulRenewals: 0,
        failedRenewals: 0,
        pastDueSubscriptions: 0
      };
    }
  }
}

// Export default function for cron job usage
export default async function processRecurringBilling(triggeredBy: string = 'cron') {
  const startTime = Date.now();
  let executionId: string | null = null;

  try {
    // Start execution log
    executionId = await CronLogger.start('seeker-recurring-billing', triggeredBy);
    console.log(`Starting recurring billing process... (executionId: ${executionId})`);

    const results = await RecurringBillingService.processSubscriptionRenewals(executionId);

    // Log individual results as action logs
    // Note: For detailed per-seeker logging, integrate CronLogger.logAction inside processSubscriptionRenewals

    // Finish execution log
    await CronLogger.finish(executionId, {
      processed: results.processed,
      successful: results.successful,
      failed: results.failed,
      errors: results.errors,
      results: {
        processed: results.processed,
        successful: results.successful,
        failed: results.failed,
        errors: results.errors,
      },
    }, startTime);

    console.log('Recurring billing process completed:', results);

    return results;
  } catch (error) {
    console.error('Recurring billing process failed:', error);

    // Log failure
    if (executionId) {
      await CronLogger.fail(executionId, error, startTime);
    }

    throw error;
  }
}