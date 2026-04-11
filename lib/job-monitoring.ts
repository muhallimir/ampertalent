import { CacheService, redis } from './redis';

/**
 * Job Monitoring Service
 * Tracks job execution, success rates, and provides monitoring capabilities
 */
export class JobMonitoringService {
  /**
   * Track job execution start
   */
  static async trackJobStart(jobType: string, jobId: string, metadata?: unknown): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const trackingData = {
        jobType,
        jobId,
        status: 'started',
        startTime: timestamp,
        metadata
      };

      // Store job tracking data
      await CacheService.set(`job_tracking:${jobId}`, trackingData, 86400); // 24 hours TTL

      // Increment job start counter
      await CacheService.incrementMetric(`jobs_started_${jobType}`);
      await CacheService.incrementMetric('jobs_started_total');

      console.log(`Job tracking started: ${jobType}:${jobId}`);
    } catch (error) {
      console.error('Error tracking job start:', error);
    }
  }

  /**
   * Track job completion
   */
  static async trackJobCompletion(
    jobType: string,
    jobId: string,
    success: boolean,
    result?: unknown,
    error?: string
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString();

      // Get existing tracking data
      const existingData = await CacheService.get(`job_tracking:${jobId}`) as Record<string, unknown> | null;

      const trackingData = {
        ...(existingData || {}),
        status: success ? 'completed' : 'failed',
        endTime: timestamp,
        duration: existingData?.startTime
          ? Date.now() - new Date(existingData.startTime as string).getTime()
          : null,
        success,
        result,
        error
      };

      // Update job tracking data
      await CacheService.set(`job_tracking:${jobId}`, trackingData, 86400);

      // Increment completion counters
      if (success) {
        await CacheService.incrementMetric(`jobs_completed_${jobType}`);
        await CacheService.incrementMetric('jobs_completed_total');
      } else {
        await CacheService.incrementMetric(`jobs_failed_${jobType}`);
        await CacheService.incrementMetric('jobs_failed_total');
      }

      console.log(`Job tracking completed: ${jobType}:${jobId} - ${success ? 'SUCCESS' : 'FAILED'}`);
    } catch (error) {
      console.error('Error tracking job completion:', error);
    }
  }

  /**
   * Get job execution statistics
   */
  static async getJobStats(days: number = 7): Promise<{
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    successRate: number;
    averageDuration: number;
    jobsByType: Record<string, {
      started: number;
      completed: number;
      failed: number;
      successRate: number;
    }>;
    recentFailures: Array<{
      jobType: string;
      jobId: string;
      error: string;
      timestamp: string;
    }>;
  }> {
    try {
      const dateRange = Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      });

      // Get metrics for each date
      const metrics = await Promise.all(
        dateRange.map(async (date) => {
          const [started, completed, failed] = await Promise.all([
            CacheService.get(`metrics:jobs_started_total:${date}`) || 0,
            CacheService.get(`metrics:jobs_completed_total:${date}`) || 0,
            CacheService.get(`metrics:jobs_failed_total:${date}`) || 0
          ]);
          return { date, started: Number(started), completed: Number(completed), failed: Number(failed) };
        })
      );

      // Aggregate totals
      const totalJobs = metrics.reduce((sum, m) => sum + m.started, 0);
      const successfulJobs = metrics.reduce((sum, m) => sum + m.completed, 0);
      const failedJobs = metrics.reduce((sum, m) => sum + m.failed, 0);
      const successRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 0;

      // Get job types statistics
      const jobTypes = ['email', 'job-expiration', 'membership', 'cleanup'];
      const jobsByType: Record<string, {
        started: number;
        completed: number;
        failed: number;
        successRate: number;
      }> = {};

      for (const jobType of jobTypes) {
        const typeMetrics = await Promise.all(
          dateRange.map(async (date) => {
            const [started, completed, failed] = await Promise.all([
              CacheService.get(`metrics:jobs_started_${jobType}:${date}`) || 0,
              CacheService.get(`metrics:jobs_completed_${jobType}:${date}`) || 0,
              CacheService.get(`metrics:jobs_failed_${jobType}:${date}`) || 0
            ]);
            return { started: Number(started), completed: Number(completed), failed: Number(failed) };
          })
        );

        const typeStarted = typeMetrics.reduce((sum, m) => sum + m.started, 0);
        const typeCompleted = typeMetrics.reduce((sum, m) => sum + m.completed, 0);
        const typeFailed = typeMetrics.reduce((sum, m) => sum + m.failed, 0);

        jobsByType[jobType] = {
          started: typeStarted,
          completed: typeCompleted,
          failed: typeFailed,
          successRate: typeStarted > 0 ? (typeCompleted / typeStarted) * 100 : 0
        };
      }

      // Get recent failures (simplified - would need more complex tracking for real implementation)
      const recentFailures: Array<{
        jobType: string;
        jobId: string;
        error: string;
        timestamp: string;
      }> = [];

      return {
        totalJobs,
        successfulJobs,
        failedJobs,
        successRate,
        averageDuration: 0, // Would calculate from actual job durations
        jobsByType,
        recentFailures
      };
    } catch (error) {
      console.error('Error getting job stats:', error);
      return {
        totalJobs: 0,
        successfulJobs: 0,
        failedJobs: 0,
        successRate: 0,
        averageDuration: 0,
        jobsByType: {},
        recentFailures: []
      };
    }
  }

  /**
   * Get queue health status
   * BullMQ queues have been removed — queuing is handled by Resend and Vercel Cron.
   */
  static async getQueueHealth(): Promise<{
    healthy: boolean;
    queues: Record<string, {
      active: number;
      waiting: number;
      completed: number;
      failed: number;
      delayed: number;
      paused: boolean;
    }>;
    issues: string[];
  }> {
    return {
      healthy: true,
      queues: {},
      issues: []
    };
  }

  /**
   * Get system performance metrics
   */
  static async getPerformanceMetrics(): Promise<{
    redis: {
      connected: boolean;
      memory: string;
      keyCount: number;
    };
    queues: {
      totalJobs: number;
      activeJobs: number;
      completedJobs: number;
      failedJobs: number;
    };
    cron: {
      dailyExecutions: number;
      hourlyExecutions: number;
      lastDailyRun: string | null;
      lastHourlyRun: string | null;
    };
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Redis metrics
      let redisMemory = 'unknown';
      let keyCount = 0;

      try {
        if (redis) {
          keyCount = await redis.dbsize();
          // Note: Upstash Redis doesn't support INFO command, so we'll use a placeholder
          redisMemory = 'N/A (Upstash)';
        }
      } catch (error) {
        console.error('Error getting Redis info:', error);
      }

      // Cron metrics
      const [dailyExecutions, hourlyExecutions] = await Promise.all([
        CacheService.get(`metrics:cron_daily_executions:${today}`) || 0,
        CacheService.get(`metrics:cron_hourly_executions:${today}`) || 0
      ]);

      return {
        redis: {
          connected: true,
          memory: redisMemory,
          keyCount
        },
        queues: {
          totalJobs: 0,
          activeJobs: 0,
          completedJobs: 0,
          failedJobs: 0
        },
        cron: {
          dailyExecutions: Number(dailyExecutions),
          hourlyExecutions: Number(hourlyExecutions),
          lastDailyRun: null, // Would track actual last run times
          lastHourlyRun: null
        }
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return {
        redis: { connected: false, memory: 'unknown', keyCount: 0 },
        queues: { totalJobs: 0, activeJobs: 0, completedJobs: 0, failedJobs: 0 },
        cron: { dailyExecutions: 0, hourlyExecutions: 0, lastDailyRun: null, lastHourlyRun: null }
      };
    }
  }

  /**
   * Trigger manual queue cleanup
   * BullMQ queues have been removed — this is a no-op.
   */
  static async triggerQueueCleanup(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'No queues to clean (BullMQ removed)' };
  }

  /**
   * Pause all queues
   * BullMQ queues have been removed — this is a no-op.
   */
  static async pauseAllQueues(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'No queues to pause (BullMQ removed)' };
  }

  /**
   * Resume all queues
   * BullMQ queues have been removed — this is a no-op.
   */
  static async resumeAllQueues(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'No queues to resume (BullMQ removed)' };
  }

  /**
   * Get job tracking details for a specific job
   */
  static async getJobDetails(jobId: string): Promise<unknown> {
    try {
      return await CacheService.get(`job_tracking:${jobId}`);
    } catch (error) {
      console.error('Error getting job details:', error);
      return null;
    }
  }

  /**
   * Clear old job tracking data
   */
  static async clearOldJobTracking(): Promise<{ cleared: number }> {
    try {
      if (!redis) {
        console.warn('Redis not available for job tracking cleanup');
        return { cleared: 0 };
      }

      const jobKeys = await redis.keys('job_tracking:*');
      let cleared = 0;

      for (const key of jobKeys) {
        try {
          const ttl = await redis.ttl(key);
          if (ttl === -1) { // No expiration set
            await redis.del(key);
            cleared++;
          }
        } catch (error) {
          console.error(`Error clearing job tracking key ${key}:`, error);
        }
      }

      return { cleared };
    } catch (error) {
      console.error('Error clearing old job tracking:', error);
      return { cleared: 0 };
    }
  }
}

// Export singleton instance
export const jobMonitoring = JobMonitoringService;