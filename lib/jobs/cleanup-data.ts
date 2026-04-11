import { db } from '../db';
import { CacheService, redis } from '../redis';
import { S3Service } from '../s3';

/**
 * Data Cleanup Service
 * Handles automatic cleanup of old data, temporary files, and orphaned records
 */
export class DataCleanupService {
  /**
   * Get resume credit limit for a membership plan
   */
  private static getPlanResumeLimit(plan: string): number {
    const limits: Record<string, number> = {
      trial_monthly: 1,
      gold_bimonthly: 3,
      vip_quarterly: 999, // Unlimited
      annual_platinum: 999 // Unlimited
    };
    return limits[plan] || 1; // Default to 1 if plan not found
  }

  /**
   * Clean up old applications for expired jobs
   */
  static async cleanupOldApplications(olderThanDays: number = 90): Promise<{
    deleted: number;
    errors: string[];
  }> {
    const results = {
      deleted: 0,
      errors: [] as string[]
    };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      console.log(`Cleaning up applications older than ${olderThanDays} days (before ${cutoffDate.toISOString()})`);

      // Delete applications for expired jobs that are older than cutoff
      const deleteResult = await db.application.deleteMany({
        where: {
          job: {
            status: 'expired',
            updatedAt: {
              lt: cutoffDate
            }
          }
        }
      });

      results.deleted = deleteResult.count;

      // Track metrics
      await CacheService.incrementMetric('old_applications_cleaned');

      console.log(`Cleaned up ${results.deleted} old applications`);
      return results;
    } catch (error) {
      const errorMsg = `Failed to cleanup old applications: ${error}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
      return results;
    }
  }

  /**
   * Clean up expired sessions and temporary data from Redis
   */
  static async cleanupExpiredSessions(): Promise<{
    cleaned: number;
    errors: string[];
  }> {
    const results = {
      cleaned: 0,
      errors: [] as string[]
    };

    try {
      console.log('Cleaning up expired sessions and temporary data...');

      // Redis TTL handles most of this automatically, but we can clean up specific patterns
      // This is a placeholder for more complex cleanup logic

      // Clean up old rate limiting keys
      let cleanedKeys = 0;

      if (redis) {
        const rateLimitKeys = await redis.keys('rate_limit:*');

        for (const key of rateLimitKeys) {
          try {
            const ttl = await redis.ttl(key);
            if (ttl === -1) { // Key exists but has no expiration
              await redis.del(key);
              cleanedKeys++;
            }
          } catch (error) {
            console.error(`Error cleaning key ${key}:`, error);
          }
        }

        // Clean up old job tracking keys
        const jobKeys = await redis.keys('job:*');
        for (const key of jobKeys) {
          try {
            const ttl = await redis.ttl(key);
            if (ttl === -1) { // Key exists but has no expiration
              await redis.del(key);
              cleanedKeys++;
            }
          } catch (error) {
            console.error(`Error cleaning job key ${key}:`, error);
          }
        }
      }

      results.cleaned = cleanedKeys;

      // Track metrics
      await CacheService.incrementMetric('expired_sessions_cleaned');

      console.log(`Cleaned up ${results.cleaned} expired session keys`);
      return results;
    } catch (error) {
      const errorMsg = `Failed to cleanup expired sessions: ${error}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
      return results;
    }
  }

  /**
   * Clean up temporary files from S3
   */
  static async cleanupTempFiles(olderThanDays: number = 1): Promise<{
    deleted: number;
    errors: string[];
  }> {
    const results = {
      deleted: 0,
      errors: [] as string[]
    };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      console.log(`Cleaning up temporary files older than ${olderThanDays} days (before ${cutoffDate.toISOString()})`);

      // List and delete temporary files from S3
      const bucket = process.env.AWS_S3_BUCKET || 'hire-my-mom-files';
      const tempPrefix = 'temp/';

      try {
        const tempFiles = await S3Service.listFiles(bucket, tempPrefix);

        for (const file of tempFiles) {
          if (file.lastModified < cutoffDate) {
            try {
              await S3Service.deleteFile(bucket, file.key);
              results.deleted++;
              console.log(`Deleted temp file: ${file.key}`);
            } catch (error) {
              const errorMsg = `Failed to delete temp file ${file.key}: ${error}`;
              console.error(errorMsg);
              results.errors.push(errorMsg);
            }
          }
        }
      } catch (error) {
        console.error('Error listing temp files:', error);
        results.errors.push(`Failed to list temp files: ${error}`);
      }

      // Track metrics
      await CacheService.incrementMetric('temp_files_cleaned');

      console.log(`Cleaned up ${results.deleted} temporary files`);
      return results;
    } catch (error) {
      const errorMsg = `Failed to cleanup temporary files: ${error}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
      return results;
    }
  }

  /**
   * Clean up orphaned records (records that reference non-existent entities)
   */
  static async cleanupOrphanedRecords(): Promise<{
    cleaned: number;
    errors: string[];
  }> {
    const results = {
      cleaned: 0,
      errors: [] as string[]
    };

    try {
      console.log('Cleaning up orphaned records...');

      // Clean up admin action logs for deleted users (simplified approach)
      // In a real implementation, you'd need to check for non-existent admin IDs
      console.log('Orphaned admin logs cleanup - would require complex query');

      // Clean up subscriptions for deleted seekers (simplified approach)
      // In a real implementation, you'd need to check for non-existent seeker IDs
      console.log('Orphaned subscriptions cleanup - would require complex query');

      // Clean up resume critiques for deleted seekers (simplified approach)
      // In a real implementation, you'd need to check for non-existent seeker IDs
      console.log('Orphaned critiques cleanup - would require complex query');

      // For now, just return 0 cleaned items
      results.cleaned += 0;

      // Track metrics
      await CacheService.incrementMetric('orphaned_records_cleaned');

      console.log(`Cleaned up ${results.cleaned} orphaned records`);
      return results;
    } catch (error) {
      const errorMsg = `Failed to cleanup orphaned records: ${error}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
      return results;
    }
  }

  /**
   * Clean up old notification logs (if we implement database logging)
   */
  static async cleanupOldNotificationLogs(olderThanDays: number = 30): Promise<{
    deleted: number;
    errors: string[];
  }> {
    const results = {
      deleted: 0,
      errors: [] as string[]
    };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      console.log(`Cleaning up notification logs older than ${olderThanDays} days`);

      // This would clean up notification logs if we implement database logging
      // For now, it's a placeholder since we're using console logging

      // Track metrics
      await CacheService.incrementMetric('notification_logs_cleaned');

      console.log(`Cleaned up ${results.deleted} old notification logs`);
      return results;
    } catch (error) {
      const errorMsg = `Failed to cleanup notification logs: ${error}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
      return results;
    }
  }

  /**
   * Clean up old metrics data
   */
  static async cleanupOldMetrics(olderThanDays: number = 90): Promise<{
    deleted: number;
    errors: string[];
  }> {
    const results = {
      deleted: 0,
      errors: [] as string[]
    };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

      console.log(`Cleaning up metrics older than ${olderThanDays} days (before ${cutoffDateStr})`);

      // Clean up old metrics from Redis
      let deletedKeys = 0;
      if (redis) {
        const metricKeys = await redis.keys('metrics:*');

        for (const key of metricKeys) {
          try {
            // Extract date from key (format: metrics:metric_name:YYYY-MM-DD)
            const keyParts = key.split(':');
            if (keyParts.length === 3) {
              const keyDate = keyParts[2];
              if (keyDate < cutoffDateStr) {
                await redis.del(key);
                deletedKeys++;
              }
            }
          } catch (error) {
            console.error(`Error cleaning metric key ${key}:`, error);
          }
        }
      }

      results.deleted = deletedKeys;

      console.log(`Cleaned up ${results.deleted} old metric keys`);
      return results;
    } catch (error) {
      const errorMsg = `Failed to cleanup old metrics: ${error}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
      return results;
    }
  }

  /**
   * Permanently delete soft-deleted resumes after 30-day recovery window
   * - Finds resumes deleted >30 days ago
   * - Deletes from database
   * - Removes S3 files
   * - Updates resume credits and carryover counts
   * - Updates application statuses
   * - Logs audit trail
   */
  static async cleanupDeletedResumes(recoveryDays: number = 30): Promise<{
    hardDeleted: number;
    s3FilesRemoved: number;
    applicationsUpdated: number;
    preserved: number;
    errors: string[];
  }> {
    const results = {
      hardDeleted: 0,
      s3FilesRemoved: 0,
      applicationsUpdated: 0,
      preserved: 0,
      errors: [] as string[]
    };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - recoveryDays);

      console.log(`🗑️  Starting hard delete cleanup for resumes deleted before ${cutoffDate.toISOString()}`);

      // Find all soft-deleted resumes older than recovery window
      const deletedResumes = await db.resume.findMany({
        where: {
          deletedAt: {
            lt: cutoffDate
          },
          status: 'active' // Still marked as active, just soft-deleted
        },
        select: {
          id: true,
          seekerId: true,
          fileUrl: true,
          filename: true,
          createdAt: true,
          deletedAt: true
        }
      });

      console.log(`Found ${deletedResumes.length} resumes eligible for hard delete`);

      // Count preserved resumes (within recovery window)
      const preservedCount = await db.resume.count({
        where: {
          deletedAt: {
            gte: cutoffDate,
            not: null
          },
          status: 'active'
        }
      });
      results.preserved = preservedCount;

      // Process each resume for hard deletion
      for (const resume of deletedResumes) {
        try {
          // Update applications tied to this resume
          try {
            const appResult = await db.application.updateMany({
              where: { resumeId: resume.id },
              data: { status: 'orphaned' }
            });
            results.applicationsUpdated += appResult.count;
            console.log(`Updated ${appResult.count} applications for resume ${resume.id}`);
          } catch (appError) {
            console.warn(`Failed to update applications for ${resume.id}:`, appError);
            results.errors.push(`Application update failed for ${resume.id}`);
          }

          // Try to delete S3 file
          if (resume.fileUrl) {
            try {
              const bucket = process.env.AWS_S3_BUCKET || 'hire-my-mom-files';
              // Extract S3 key from fileUrl (e.g., https://bucket.s3.region.amazonaws.com/path/to/file.pdf -> path/to/file.pdf)
              const s3Key = resume.fileUrl.includes('amazonaws.com') 
                ? resume.fileUrl.split('.amazonaws.com/')[1]
                : resume.fileUrl.split('/').slice(-2).join('/'); // Fallback: last two path segments
              
              if (s3Key) {
                await S3Service.deleteFile(bucket, s3Key);
                results.s3FilesRemoved++;
                console.log(`✅ Deleted S3 file: ${s3Key}`);
              }
            } catch (s3Error) {
              console.warn(`Failed to delete S3 file for resume ${resume.id}:`, s3Error);
              results.errors.push(`S3 deletion failed for resume ${resume.id}`);
              // Continue with DB deletion even if S3 fails
            }
          }

          // Delete resume from database
          await db.resume.deleteMany({
            where: {
              id: resume.id
            }
          });
          results.hardDeleted++;
          console.log(`🗑️  Hard deleted resume: ${resume.id}`);

          // Update seeker's resume credits and carryover count
          try {
            const seeker = await db.jobSeeker.findUnique({
              where: { userId: resume.seekerId },
              select: {
                userId: true,
                membershipPlan: true,
                resumeCarryoverCount: true,
                resumeCredits: true,
                lastBillingPeriodStart: true
              }
            });

            if (seeker) {
              // Calculate new carryover count
              // If deleted resume was from previous billing period, decrement carryover
              const isCarryover =
                seeker.lastBillingPeriodStart &&
                resume.createdAt < seeker.lastBillingPeriodStart;

              const newCarryoverCount = Math.max(
                0,
                seeker.resumeCarryoverCount - (isCarryover ? 1 : 0)
              );

              // Recalculate credits
              const planLimit = this.getPlanResumeLimit(seeker.membershipPlan as string);
              const newCredits =
                planLimit === 999
                  ? 999
                  : Math.max(0, planLimit - newCarryoverCount);

              await db.jobSeeker.update({
                where: { userId: resume.seekerId },
                data: {
                  resumeCarryoverCount: newCarryoverCount,
                  resumeCredits: newCredits,
                  updatedAt: new Date()
                }
              });

              console.log(
                `📊 Updated seeker ${resume.seekerId}: carryover ${seeker.resumeCarryoverCount} → ${newCarryoverCount}, credits → ${newCredits}`
              );
            }
          } catch (seekerError) {
            console.warn(`Failed to update seeker for resume ${resume.id}:`, seekerError);
            results.errors.push(`Seeker credit update failed for ${resume.id}`);
          }
        } catch (error) {
          const errorMsg = `Failed to hard delete resume ${resume.id}: ${error}`;
          console.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      // Track metrics
      await CacheService.incrementMetric('hard_deleted_resumes');
      await CacheService.incrementMetric(`hard_deleted_resumes:count:${results.hardDeleted}`);

      console.log(
        `✅ Hard delete cleanup complete: ${results.hardDeleted} deleted, ${results.preserved} preserved`
      );
      return results;
    } catch (error) {
      const errorMsg = `Failed to cleanup deleted resumes: ${error}`;
      console.error(errorMsg);
      results.errors.push(errorMsg);
      return results;
    }
  }

  /**
   * Get cleanup statistics
   */
  static async getCleanupStats(): Promise<{
    lastCleanup: string;
    totalCleaned: number;
    cleanupsByType: Record<string, number>;
  }> {
    try {
      // Get cleanup metrics from cache
      const today = new Date().toISOString().split('T')[0];

      const [
        oldApplications,
        expiredSessions,
        tempFiles,
        orphanedRecords,
        notificationLogs,
        oldMetrics
      ] = await Promise.all([
        CacheService.get(`metrics:old_applications_cleaned:${today}`) || 0,
        CacheService.get(`metrics:expired_sessions_cleaned:${today}`) || 0,
        CacheService.get(`metrics:temp_files_cleaned:${today}`) || 0,
        CacheService.get(`metrics:orphaned_records_cleaned:${today}`) || 0,
        CacheService.get(`metrics:notification_logs_cleaned:${today}`) || 0,
        CacheService.get(`metrics:old_metrics_cleaned:${today}`) || 0
      ]);

      const cleanupsByType = {
        oldApplications: Number(oldApplications),
        expiredSessions: Number(expiredSessions),
        tempFiles: Number(tempFiles),
        orphanedRecords: Number(orphanedRecords),
        notificationLogs: Number(notificationLogs),
        oldMetrics: Number(oldMetrics)
      };

      const totalCleaned = Object.values(cleanupsByType).reduce((sum, count) => sum + count, 0);

      return {
        lastCleanup: today,
        totalCleaned,
        cleanupsByType
      };
    } catch (error) {
      console.error('Error getting cleanup stats:', error);
      return {
        lastCleanup: 'unknown',
        totalCleaned: 0,
        cleanupsByType: {}
      };
    }
  }

  /**
   * Comprehensive cleanup - runs all cleanup tasks
   */
  static async runComprehensiveCleanup(): Promise<{
    totalCleaned: number;
    results: Record<string, any>;
  }> {
    console.log('Starting comprehensive data cleanup...');

    const [
      oldApplicationsResult,
      expiredSessionsResult,
      tempFilesResult,
      orphanedRecordsResult,
      notificationLogsResult,
      oldMetricsResult,
      deletedResumesResult
    ] = await Promise.all([
      this.cleanupOldApplications(90),
      this.cleanupExpiredSessions(),
      this.cleanupTempFiles(1),
      this.cleanupOrphanedRecords(),
      this.cleanupOldNotificationLogs(30),
      this.cleanupOldMetrics(90),
      this.cleanupDeletedResumes(30) // 30-day recovery window
    ]);

    const results = {
      oldApplications: { cleaned: oldApplicationsResult.deleted, errors: oldApplicationsResult.errors },
      expiredSessions: { cleaned: expiredSessionsResult.cleaned, errors: expiredSessionsResult.errors },
      tempFiles: { cleaned: tempFilesResult.deleted, errors: tempFilesResult.errors },
      orphanedRecords: { cleaned: orphanedRecordsResult.cleaned, errors: orphanedRecordsResult.errors },
      notificationLogs: { cleaned: notificationLogsResult.deleted, errors: notificationLogsResult.errors },
      oldMetrics: { cleaned: oldMetricsResult.deleted, errors: oldMetricsResult.errors },
      deletedResumes: {
        hardDeleted: deletedResumesResult.hardDeleted,
        s3FilesRemoved: deletedResumesResult.s3FilesRemoved,
        applicationsUpdated: deletedResumesResult.applicationsUpdated,
        preserved: deletedResumesResult.preserved,
        errors: deletedResumesResult.errors
      }
    };

    const totalCleaned =
      oldApplicationsResult.deleted +
      expiredSessionsResult.cleaned +
      tempFilesResult.deleted +
      orphanedRecordsResult.cleaned +
      notificationLogsResult.deleted +
      oldMetricsResult.deleted +
      deletedResumesResult.hardDeleted;

    const totalErrors = Object.values(results).reduce(
      (errors, result: any) => [...errors, ...(result.errors || [])],
      [] as string[]
    );

    console.log('Comprehensive cleanup completed:', {
      totalCleaned,
      errorCount: totalErrors.length,
      results
    });

    return {
      totalCleaned,
      results
    };
  }
}

// Export default function for cron job usage
export default async function cleanupData() {
  console.log('Starting data cleanup process...');

  const results = await DataCleanupService.runComprehensiveCleanup();

  console.log('Data cleanup process completed:', results);

  return results;
}