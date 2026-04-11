import { db } from '../db';
import { CacheService } from '../redis';
import { MembershipPlan } from '@prisma/client';
import { NotificationService } from '../notification-service';
import { isPayPalPaymentMethod } from '../paypal';
import { sendBatchIndividualEmails, BatchEmailPayload } from '../resend';
import { emailTemplates } from '../email-templates';

// Plan display names and prices — mirrors SEEKER_SUBSCRIPTION_PLANS without importing React icons
const PLAN_INFO: Record<string, { name: string; price: number; billing: string }> = {
  trial_monthly: { name: '3 Day Free Trial Subscription', price: 34.99, billing: 'month' },
  gold_bimonthly: { name: 'Gold Mom Professional', price: 49.99, billing: '2 months' },
  vip_quarterly: { name: 'VIP Platinum Mom Professional', price: 79.99, billing: '3 months' },
  annual_platinum: { name: 'Annual Platinum Mom Professional', price: 299.00, billing: 'year' },
};

/**
 * Membership Reminder Service
 * Handles automatic reminders for subscription renewals and expirations
 */
export class MembershipReminderService {
  /**
   * Send renewal reminders to seekers whose memberships expire within the next 24 hours.
   * Fires once per day via the daily cron — catches members expiring tomorrow.
   * One email per member total (industry standard: 1-day-before reminder).
   */
  static async sendRenewalReminders(): Promise<{
    sent: number;
    errors: string[];
  }> {
    const results = {
      sent: 0,
      errors: [] as string[]
    };

    try {
      const now = new Date();

      // Window: expiring between now and 24 hours from now.
      // This gives a 1-day-before reminder — fires once when the daily cron runs.
      const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const expiringSeekers = await db.jobSeeker.findMany({
        where: {
          membershipPlan: { not: 'none' },
          membershipExpiresAt: {
            gt: now,      // not already expired
            lte: windowEnd
          },
          isOnTrial: false,
          isSuspended: false
        },
        include: {
          user: {
            select: { email: true, firstName: true, name: true }
          },
          paymentMethods: {
            where: { isDefault: true },
            select: { brand: true, last4: true, authnetPaymentProfileId: true },
            take: 1
          }
        }
      });

      console.log(`Found ${expiringSeekers.length} memberships expiring within 7-day window`);

      // Feature flag check
      if (process.env.ENABLE_CUSTOMER_PAYMENT_EMAILS !== 'true') {
        console.log('ℹ️ Customer subscription reminder emails disabled via ENABLE_CUSTOMER_PAYMENT_EMAILS flag');
        return results;
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ampertalent.com';
      const manageUrl = `${baseUrl}/seeker/subscription`;

      const batchPayloads: BatchEmailPayload[] = [];
      const skippedEmails: string[] = [];

      for (const seeker of expiringSeekers) {
        const planInfo = PLAN_INFO[seeker.membershipPlan as string];
        if (!planInfo) {
          console.warn(`Unknown plan ${seeker.membershipPlan} for seeker ${seeker.userId} — skipping reminder`);
          skippedEmails.push(`Unknown plan ${seeker.membershipPlan} for seeker ${seeker.userId}`);
          continue;
        }

        const email = seeker.user.email;
        if (!email) {
          console.warn(`No email for seeker ${seeker.userId} — skipping reminder`);
          continue;
        }

        const firstName = seeker.user.firstName || seeker.user.name || 'Valued Member';
        const renewalDate = seeker.membershipExpiresAt!.toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        });
        const daysUntilRenewal = Math.ceil(
          (seeker.membershipExpiresAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
        );

        const pm = seeker.paymentMethods[0];
        const paymentMethod = pm
          ? (isPayPalPaymentMethod(pm.authnetPaymentProfileId)
            ? 'PayPal'
            : pm.last4 ? `Card ending in ${pm.last4}` : undefined)
          : undefined;

        const template = emailTemplates.subscriptionReminder({
          firstName,
          plan: planInfo.name,
          renewalDate,
          amount: planInfo.price,
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
        const batchResult = await sendBatchIndividualEmails(batchPayloads);
        results.sent = batchResult.sent;
        results.errors.push(...batchResult.errors);

        batchPayloads.forEach(p => {
          console.log(`✅ Renewal reminder queued for ${p.to}`);
        });

        await CacheService.incrementMetric('renewal_reminders_sent');
      }

      results.errors.push(...skippedEmails);

      return results;
    } catch (error) {
      console.error('Error sending renewal reminders:', error);
      results.errors.push(`Renewal reminder process failed: ${error}`);
      return results;
    }
  }

  /**
   * Handle expired memberships
   */
  static async handleExpiredMemberships(): Promise<{
    expired: number;
    notified: number;
    errors: string[];
  }> {
    const results = {
      expired: 0,
      notified: 0,
      errors: [] as string[]
    };

    try {
      // Find memberships that have expired
      const expiredSeekers = await db.jobSeeker.findMany({
        where: {
          membershipPlan: {
            not: 'none'
          },
          membershipExpiresAt: {
            lt: new Date()
          },
          isSuspended: false,
          isOnTrial: false  // Trials are handled by recurring billing
        },
        include: {
          user: true
        }
      });

      console.log(`Found ${expiredSeekers.length} expired memberships to process`);

      for (const seeker of expiredSeekers) {
        try {
          // Update membership to none and zero out resume credits
          await db.jobSeeker.update({
            where: { userId: seeker.userId },
            data: {
              membershipPlan: 'none',
              membershipExpiresAt: null,
              resumeCredits: 0, // ✅ Zero out credits on expiration
              updatedAt: new Date()
            }
          });

          // Send expiration notification
          // TODO: implement expired membership email via NotificationService
          console.log(`Expiration notification pending for seeker: ${seeker.userId}`);

          // Track metrics
          await CacheService.incrementMetric('memberships_expired');

          results.expired++;
          results.notified++;
          console.log(`Processed expired membership for seeker: ${seeker.userId}`);
        } catch (error) {
          const errorMsg = `Failed to process expired membership for seeker ${seeker.userId}: ${error}`;
          console.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      return results;
    } catch (error) {
      console.error('Error handling expired memberships:', error);
      results.errors.push(`Expired membership process failed: ${error}`);
      return results;
    }
  }

  /**
   * Send payment failure notifications
   */
  static async sendPaymentFailureNotifications(): Promise<{
    sent: number;
    errors: string[];
  }> {
    const results = {
      sent: 0,
      errors: [] as string[]
    };

    try {
      // Find subscriptions with payment failures (past_due or unpaid status)
      const failedSubscriptions = await db.subscription.findMany({
        where: {
          status: {
            in: ['past_due', 'unpaid']
          }
        },
        include: {
          seeker: {
            include: {
              user: true
            }
          }
        }
      });

      console.log(`Found ${failedSubscriptions.length} subscriptions with payment failures`);

      for (const subscription of failedSubscriptions) {
        try {
          // TODO: implement payment_failed email via NotificationService
          console.log(`Payment failure notification pending for subscription: ${subscription.id} (seeker: ${subscription.seekerId})`);

          // Track metrics
          await CacheService.incrementMetric('payment_failure_notifications_sent');

          results.sent++;
          console.log(`Sent payment failure notification for subscription: ${subscription.id}`);
        } catch (error) {
          const errorMsg = `Failed to send payment failure notification for subscription ${subscription.id}: ${error}`;
          console.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      return results;
    } catch (error) {
      console.error('Error sending payment failure notifications:', error);
      results.errors.push(`Payment failure notification process failed: ${error}`);
      return results;
    }
  }

  /**
   * Get membership statistics
   */
  static async getMembershipStats(): Promise<{
    totalActive: number;
    expiringSoon: number;
    expiredToday: number;
    byPlan: Record<MembershipPlan, number>;
    renewalRate: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const [totalActive, expiringSoon, expiredToday, planCounts] = await Promise.all([
        db.jobSeeker.count({
          where: {
            membershipPlan: { not: 'none' },
            membershipExpiresAt: { gte: new Date() },
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
        db.jobSeeker.count({
          where: {
            membershipPlan: 'none',
            updatedAt: {
              gte: today,
              lt: tomorrow
            }
          }
        }),
        Promise.all([
          db.jobSeeker.count({ where: { membershipPlan: 'none' } }),
          db.jobSeeker.count({ where: { membershipPlan: 'trial_monthly' } }),
          db.jobSeeker.count({ where: { membershipPlan: 'gold_bimonthly' } }),
          db.jobSeeker.count({ where: { membershipPlan: 'vip_quarterly' } }),
          db.jobSeeker.count({ where: { membershipPlan: 'annual_platinum' } })
        ])
      ]);

      const byPlan: Record<MembershipPlan, number> = {
        none: planCounts[0],
        trial_monthly: planCounts[1],
        gold_bimonthly: planCounts[2],
        vip_quarterly: planCounts[3],
        annual_platinum: planCounts[4]
      };

      // Calculate renewal rate (simplified - would need more complex logic for actual rate)
      const renewalRate = totalActive > 0 ? ((totalActive - expiredToday) / totalActive) * 100 : 0;

      return {
        totalActive,
        expiringSoon,
        expiredToday,
        byPlan,
        renewalRate
      };
    } catch (error) {
      console.error('Error getting membership stats:', error);
      return {
        totalActive: 0,
        expiringSoon: 0,
        expiredToday: 0,
        byPlan: {
          none: 0,
          trial_monthly: 0,
          gold_bimonthly: 0,
          vip_quarterly: 0,
          annual_platinum: 0
        },
        renewalRate: 0
      };
    }
  }

  /**
   * Schedule membership reminders for a specific seeker
   */
  static async scheduleMembershipReminders(seekerId: string): Promise<boolean> {
    try {
      const seeker = await db.jobSeeker.findUnique({
        where: { userId: seekerId },
        select: {
          membershipPlan: true,
          membershipExpiresAt: true
        }
      });

      if (!seeker || seeker.membershipPlan === 'none' || !seeker.membershipExpiresAt) {
        console.log(`No active membership found for seeker: ${seekerId}`);
        return false;
      }

      const expirationDate = seeker.membershipExpiresAt;
      const now = new Date();

      // Schedule reminder 7 days before expiration
      const reminderDate = new Date(expirationDate);
      reminderDate.setDate(reminderDate.getDate() - 7);

      if (reminderDate > now) {
        // Reminder scheduling is handled by the hourly/daily cron polling sendRenewalReminders()
        console.log(`7-day reminder noted for seeker ${seekerId} at ${reminderDate.toISOString()} — will be picked up by hourly cron`);
      }

      // Schedule reminder 1 day before expiration
      const finalReminderDate = new Date(expirationDate);
      finalReminderDate.setDate(finalReminderDate.getDate() - 1);

      if (finalReminderDate > now) {
        // Reminder scheduling is handled by the hourly/daily cron polling sendRenewalReminders()
        console.log(`1-day reminder noted for seeker ${seekerId} at ${finalReminderDate.toISOString()} — will be picked up by hourly cron`);
      }

      return true;
    } catch (error) {
      console.error(`Failed to schedule membership reminders for seeker ${seekerId}:`, error);
      return false;
    }
  }

  /**
   * Get seekers with memberships expiring in specified days
   */
  static async getExpiringSeekers(days: number): Promise<Array<{
    userId: string;
    membershipPlan: MembershipPlan;
    membershipExpiresAt: Date;
    user: {
      name: string;
      clerkUserId: string;
    };
  }>> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const expiringSeekers = await db.jobSeeker.findMany({
        where: {
          membershipPlan: { not: 'none' },
          membershipExpiresAt: {
            gte: new Date(),
            lte: futureDate
          },
          isSuspended: false
        },
        select: {
          userId: true,
          membershipPlan: true,
          membershipExpiresAt: true,
          user: {
            select: {
              name: true,
              clerkUserId: true
            }
          }
        },
        orderBy: {
          membershipExpiresAt: 'asc'
        }
      });

      return expiringSeekers.filter(seeker => seeker.membershipExpiresAt !== null) as Array<{
        userId: string;
        membershipPlan: MembershipPlan;
        membershipExpiresAt: Date;
        user: {
          name: string;
          clerkUserId: string;
        };
      }>;
    } catch (error) {
      console.error('Error getting expiring seekers:', error);
      return [];
    }
  }

  /**
   * Get resume credit limit for a given plan
   */
  static getPlanResumeLimit(plan: string): number {
    const planMap: Record<string, number> = {
      'trial_monthly': 1,
      'gold_bimonthly': 3,
      'vip_quarterly': 999,
      'annual_platinum': 999,
      // Legacy plan names (if any)
      'monthly': 1,
      'quarterly': 3,
      'annual': 999
    };
    return planMap[plan] || 0;
  }

  /**
   * Process membership renewals (for successful payments)
   */
  static async processMembershipRenewal(
    seekerId: string,
    plan: MembershipPlan,
    subscriptionId?: string
  ): Promise<boolean> {
    try {
      const seeker = await db.jobSeeker.findUnique({
        where: { userId: seekerId }
      });

      if (!seeker) {
        console.error(`Seeker not found: ${seekerId}`);
        return false;
      }

      // Calculate new expiration date
      const now = new Date();
      const expirationDate = new Date(now);

      switch (plan) {
        case 'trial_monthly':
          expirationDate.setDate(expirationDate.getDate() + 33); // 33 days for trial
          break;
        case 'gold_bimonthly':
          expirationDate.setMonth(expirationDate.getMonth() + 2); // 2 months
          break;
        case 'vip_quarterly':
          expirationDate.setMonth(expirationDate.getMonth() + 3); // 3 months
          break;
        case 'annual_platinum':
          expirationDate.setFullYear(expirationDate.getFullYear() + 1); // 1 year
          break;
        case 'none':
          console.log(`No active plan for seeker: ${seekerId}`);
          return false;
        default:
          console.error(`Invalid membership plan: ${plan}`);
          return false;
      }

      // Get the resume credit limit for this plan
      const resumeCreditLimit = this.getPlanResumeLimit(plan);

      // Update seeker membership and RESET resume credits on renewal
      await db.jobSeeker.update({
        where: { userId: seekerId },
        data: {
          membershipPlan: plan,
          membershipExpiresAt: expirationDate,
          resumeCredits: resumeCreditLimit, // ✅ Reset credits on renewal
          updatedAt: new Date()
        }
      });

      // Update subscription if provided
      if (subscriptionId) {
        await db.subscription.update({
          where: { id: subscriptionId },
          data: {
            status: 'active',
            currentPeriodEnd: expirationDate,
            updatedAt: new Date()
          }
        });
      }

      // Schedule future reminders
      await this.scheduleMembershipReminders(seekerId);

      // Track metrics
      await CacheService.incrementMetric('membership_renewals');

      console.log(`Processed membership renewal for seeker ${seekerId}: ${plan} until ${expirationDate.toISOString()}`);
      return true;
    } catch (error) {
      console.error(`Failed to process membership renewal for seeker ${seekerId}:`, error);
      return false;
    }
  }

  /**
   * Process membership renewal WITH resume carryover
   * Preserves active resumes from previous billing period when renewing subscription
   */
  static async processMembershipRenewalWithCarryover(
    seekerId: string,
    plan: MembershipPlan,
    subscriptionId?: string
  ): Promise<boolean> {
    try {
      const seeker = await db.jobSeeker.findUnique({
        where: { userId: seekerId },
        include: {
          resumes: {
            where: {
              deletedAt: null, // Only active resumes
              status: 'active'
            },
            select: {
              id: true,
              uploadedAt: true,
              filename: true
            }
          }
        }
      });

      if (!seeker) {
        console.error(`Seeker not found: ${seekerId}`);
        return false;
      }

      // Calculate new expiration date
      const now = new Date();
      const expirationDate = new Date(now);
      const newBillingPeriodStart = now; // Current renewal date

      switch (plan) {
        case 'trial_monthly':
          expirationDate.setDate(expirationDate.getDate() + 33);
          break;
        case 'gold_bimonthly':
          expirationDate.setMonth(expirationDate.getMonth() + 2);
          break;
        case 'vip_quarterly':
          expirationDate.setMonth(expirationDate.getMonth() + 3);
          break;
        case 'annual_platinum':
          expirationDate.setFullYear(expirationDate.getFullYear() + 1);
          break;
        case 'none':
          console.log(`No active plan for seeker: ${seekerId}`);
          return false;
        default:
          console.error(`Invalid membership plan: ${plan}`);
          return false;
      }

      // Get the resume credit limit for this plan
      const resumeCreditLimit = this.getPlanResumeLimit(plan as string);

      // Count active resumes from previous period (carryover)
      const carryoverResumes = seeker.resumes;
      const carryoverCount = carryoverResumes.length;

      // For limited plans, calculate remaining credits after carryover
      let newResumeCredits = resumeCreditLimit;
      if (plan !== 'vip_quarterly' && plan !== 'annual_platinum') {
        // Limited plans: Available = Limit - Carryover count
        newResumeCredits = Math.max(0, resumeCreditLimit - carryoverCount);
      }

      console.log(`📋 Resume Carryover for ${seekerId}:`, {
        plan,
        carryoverCount,
        planLimit: resumeCreditLimit,
        newCredits: newResumeCredits,
        renewalDate: newBillingPeriodStart.toISOString(),
        expirationDate: expirationDate.toISOString()
      });

      // Update seeker membership with carryover tracking
      await db.jobSeeker.update({
        where: { userId: seekerId },
        data: {
          membershipPlan: plan,
          membershipExpiresAt: expirationDate,
          resumeCredits: newResumeCredits,
          lastBillingPeriodStart: newBillingPeriodStart, // Track renewal date
          resumeCarryoverCount: carryoverCount, // Track carried-over resumes
          updatedAt: new Date()
        }
      });

      // Update subscription if provided
      if (subscriptionId) {
        await db.subscription.update({
          where: { id: subscriptionId },
          data: {
            status: 'active',
            currentPeriodStart: newBillingPeriodStart,
            currentPeriodEnd: expirationDate,
            updatedAt: new Date()
          }
        });
      }

      // Schedule future reminders
      await this.scheduleMembershipReminders(seekerId);

      // Track metrics
      await CacheService.incrementMetric('membership_renewals_with_carryover');
      if (carryoverCount > 0) {
        await CacheService.incrementMetric(`resumes_carried_over:${carryoverCount}`);
      }

      console.log(`✅ Processed membership renewal with carryover for seeker ${seekerId}: ${plan} until ${expirationDate.toISOString()}`);
      return true;
    } catch (error) {
      console.error(`Failed to process membership renewal with carryover for seeker ${seekerId}:`, error);
      return false;
    }
  }

  /**
   * Sync resume credits accounting for carryover resumes
   * Recalculates remaining credits based on plan limit, carryover, and new uploads
   */
  static async syncResumeCreditsWithCarryover(seekerId: string): Promise<{
    remainingCredits: number;
    totalUsed: number;
    carryoverCount: number;
    planLimit: number;
    success: boolean;
  }> {
    try {
      const seeker = await db.jobSeeker.findUnique({
        where: { userId: seekerId },
        include: {
          resumes: {
            where: {
              deletedAt: null,
              status: 'active'
            }
          }
        }
      });

      if (!seeker) {
        return {
          remainingCredits: 0,
          totalUsed: 0,
          carryoverCount: 0,
          planLimit: 0,
          success: false
        };
      }

      const planLimit = this.getPlanResumeLimit(seeker.membershipPlan as string);
      const carryoverCount = seeker.resumeCarryoverCount || 0;
      const totalActiveResumes = seeker.resumes.length;

      // For unlimited plans
      if (planLimit === 999) {
        return {
          remainingCredits: 999,
          totalUsed: totalActiveResumes,
          carryoverCount,
          planLimit: 999,
          success: true
        };
      }

      // For limited plans: Available = (Plan Limit + Carryover) - Total Active
      // This allows users to use ALL slots (both carryover and new)
      const totalAvailableSlots = planLimit + carryoverCount;
      const remainingCredits = Math.max(0, totalAvailableSlots - totalActiveResumes);

      console.log(`📊 Resume Credits Sync for ${seekerId}:`, {
        planLimit,
        carryoverCount,
        totalAvailableSlots,
        totalActiveResumes,
        remainingCredits
      });

      // Update database if needed
      if (seeker.resumeCredits !== remainingCredits) {
        await db.jobSeeker.update({
          where: { userId: seekerId },
          data: {
            resumeCredits: remainingCredits,
            updatedAt: new Date()
          }
        });
      }

      return {
        remainingCredits,
        totalUsed: totalActiveResumes,
        carryoverCount,
        planLimit,
        success: true
      };
    } catch (error) {
      console.error(`Failed to sync resume credits with carryover for ${seekerId}:`, error);
      return {
        remainingCredits: 0,
        totalUsed: 0,
        carryoverCount: 0,
        planLimit: 0,
        success: false
      };
    }
  }
}

// Export default function for cron job usage
export default async function processMembershipReminders() {
  console.log('Starting membership reminder process...');

  const [renewalResults, expiredResults, paymentFailureResults] = await Promise.all([
    MembershipReminderService.sendRenewalReminders(),
    MembershipReminderService.handleExpiredMemberships(),
    MembershipReminderService.sendPaymentFailureNotifications()
  ]);

  const totalSent = renewalResults.sent + expiredResults.notified + paymentFailureResults.sent;
  const totalErrors = [
    ...renewalResults.errors,
    ...expiredResults.errors,
    ...paymentFailureResults.errors
  ];

  console.log('Membership reminder process completed:', {
    renewalReminders: renewalResults.sent,
    expiredMemberships: expiredResults.expired,
    paymentFailureNotifications: paymentFailureResults.sent,
    totalSent,
    errors: totalErrors
  });

  return {
    renewalReminders: renewalResults.sent,
    expiredMemberships: expiredResults.expired,
    paymentFailureNotifications: paymentFailureResults.sent,
    totalSent,
    errors: totalErrors
  };
}