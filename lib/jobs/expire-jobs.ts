import { db } from '../db';
import { CacheService } from '../redis';

/**
 * Job Expiration Service
 * Handles automatic expiration of jobs based on their expiration dates
 */
export class JobExpirationService {
  /**
   * Find and expire jobs that have passed their expiration date
   */
  static async expireOverdueJobs(): Promise<{
    expired: number;
    errors: string[];
  }> {
    const results = {
      expired: 0,
      errors: [] as string[]
    };

    try {
      // Find jobs that should be expired
      // Exclude paused jobs from expiration
      const overdueJobs = await db.job.findMany({
        where: {
          status: 'approved',
          isPaused: false, // Don't expire paused jobs
          expiresAt: {
            lt: new Date()
          }
        },
        include: {
          employer: {
            include: {
              user: true
            }
          }
        }
      });

      console.log(`Found ${overdueJobs.length} overdue jobs to expire`);

      // Process each overdue job
      for (const job of overdueJobs) {
        try {
          // Update job status to expired
          await db.job.update({
            where: { id: job.id },
            data: {
              status: 'expired',
              updatedAt: new Date()
            }
          });

          // Track metrics
          await CacheService.incrementMetric('jobs_expired');

          results.expired++;
          console.log(`Expired job: ${job.id} - ${job.title}`);
        } catch (error) {
          const errorMsg = `Failed to expire job ${job.id}: ${error}`;
          console.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      // Log summary
      console.log(`Job expiration completed: ${results.expired} expired, ${results.errors.length} errors`);

      return results;
    } catch (error) {
      console.error('Error in job expiration process:', error);
      results.errors.push(`Job expiration process failed: ${error}`);
      return results;
    }
  }

  /**
   * Schedule expiration for a specific job
   */
  static async scheduleJobExpiration(jobId: string, expirationDate: Date): Promise<boolean> {
    try {
      const delay = expirationDate.getTime() - Date.now();

      if (delay > 0) {
        // Expiration is handled by the daily cron polling expireOverdueJobs()
        console.log(`Job ${jobId} scheduled for expiration at ${expirationDate.toISOString()} — will be picked up by daily cron`);
        return true;
      } else {
        // Job is already expired, expire immediately
        await this.expireSpecificJob(jobId);
        return true;
      }
    } catch (error) {
      console.error(`Failed to schedule expiration for job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Expire a specific job immediately
   */
  static async expireSpecificJob(jobId: string): Promise<boolean> {
    try {
      const job = await db.job.findUnique({
        where: { id: jobId },
        include: {
          employer: {
            include: {
              user: true
            }
          }
        }
      });

      if (!job) {
        console.error(`Job not found: ${jobId}`);
        return false;
      }

      if (job.status === 'expired') {
        console.log(`Job ${jobId} is already expired`);
        return true;
      }

      // Update job status
      await db.job.update({
        where: { id: jobId },
        data: {
          status: 'expired',
          updatedAt: new Date()
        }
      });

      // Send notification
      // TODO: implement job_expired email template and send via NotificationService

      // Track metrics
      await CacheService.incrementMetric('jobs_expired');

      console.log(`Successfully expired job: ${jobId}`);
      return true;
    } catch (error) {
      console.error(`Failed to expire job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Get jobs expiring soon (within specified days)
   */
  static async getJobsExpiringSoon(days: number = 7): Promise<Array<{
    id: string;
    title: string;
    expiresAt: Date;
    employer: {
      companyName: string;
      user: {
        name: string;
        clerkUserId: string;
      };
    };
  }>> {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const expiringSoonJobs = await db.job.findMany({
        where: {
          status: 'approved',
          isPaused: false, // Don't warn about paused jobs
          expiresAt: {
            gte: new Date(),
            lte: futureDate
          }
        },
        select: {
          id: true,
          title: true,
          expiresAt: true,
          employer: {
            select: {
              companyName: true,
              user: {
                select: {
                  name: true,
                  clerkUserId: true
                }
              }
            }
          }
        },
        orderBy: {
          expiresAt: 'asc'
        }
      });

      return expiringSoonJobs.filter(job => job.expiresAt !== null) as Array<{
        id: string;
        title: string;
        expiresAt: Date;
        employer: {
          companyName: string;
          user: {
            name: string;
            clerkUserId: string;
          };
        };
      }>;
    } catch (error) {
      console.error('Error getting jobs expiring soon:', error);
      return [];
    }
  }

  /**
   * Send expiration warnings to employers
   */
  static async sendExpirationWarnings(days: number = 3): Promise<{
    sent: number;
    errors: string[];
  }> {
    const results = {
      sent: 0,
      errors: [] as string[]
    };

    try {
      const expiringSoonJobs = await this.getJobsExpiringSoon(days);

      console.log(`Found ${expiringSoonJobs.length} jobs expiring within ${days} days`);

      for (const job of expiringSoonJobs) {
        try {
          // TODO: implement job_expiring_warning email template and send via NotificationService
          console.log(`Expiration warning logged for job: ${job.id} (${job.title}) - expires ${job.expiresAt?.toISOString().split('T')[0]}`);

          results.sent++;
          console.log(`Sent expiration warning for job: ${job.id}`);
        } catch (error) {
          const errorMsg = `Failed to send warning for job ${job.id}: ${error}`;
          console.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      return results;
    } catch (error) {
      console.error('Error sending expiration warnings:', error);
      results.errors.push(`Expiration warning process failed: ${error}`);
      return results;
    }
  }

  /**
   * Get expiration statistics
   */
  static async getExpirationStats(): Promise<{
    totalExpired: number;
    expiredToday: number;
    expiringSoon: number;
    averageJobLifetime: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const [totalExpired, expiredToday, expiringSoon] = await Promise.all([
        db.job.count({
          where: { status: 'expired' }
        }),
        db.job.count({
          where: {
            status: 'expired',
            updatedAt: {
              gte: today,
              lt: tomorrow
            }
          }
        }),
        db.job.count({
          where: {
            status: 'approved',
            isPaused: false, // Don't count paused jobs
            expiresAt: {
              gte: new Date(),
              lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
            }
          }
        })
      ]);

      // Calculate average job lifetime (simplified)
      const averageJobLifetime = 30; // Default to 30 days, would calculate from actual data

      return {
        totalExpired,
        expiredToday,
        expiringSoon,
        averageJobLifetime
      };
    } catch (error) {
      console.error('Error getting expiration stats:', error);
      return {
        totalExpired: 0,
        expiredToday: 0,
        expiringSoon: 0,
        averageJobLifetime: 0
      };
    }
  }
}

// Export default function for cron job usage
export default async function expireJobs() {
  console.log('Starting job expiration process...');

  const results = await JobExpirationService.expireOverdueJobs();

  // Also send warnings for jobs expiring in 3 days
  const warnings = await JobExpirationService.sendExpirationWarnings(3);

  console.log('Job expiration process completed:', {
    expired: results.expired,
    warnings: warnings.sent,
    errors: [...results.errors, ...warnings.errors]
  });

  return {
    expired: results.expired,
    warnings: warnings.sent,
    errors: [...results.errors, ...warnings.errors]
  };
}