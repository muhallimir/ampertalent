import { db } from '../db';

/**
 * Soft-Delete Cancelled Seekers
 *
 * Archives seeker accounts that have been cancelled for over 1 year
 * by setting `isActive = false` on their UserProfile.
 *
 * Run daily via cron (e.g. alongside recurring-billing).
 */
export class SoftDeleteCancelledService {
  private static readonly ARCHIVE_AFTER_DAYS = 365;

  /**
   * Find seekers cancelled for over 1 year and deactivate their UserProfile.
   */
  static async run(): Promise<{ archived: number; errors: string[] }> {
    const results = { archived: 0, errors: [] as string[] };

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.ARCHIVE_AFTER_DAYS);

    try {
      const seekers = await db.jobSeeker.findMany({
        where: {
          cancelledSeeker: true,
          cancelledAt: { lte: cutoff },
          user: { isActive: true },
        },
        select: {
          userId: true,
          cancelledAt: true,
          user: { select: { email: true } },
        },
      });

      console.log(`[SOFT-DELETE] Found ${seekers.length} cancelled seekers past ${this.ARCHIVE_AFTER_DAYS}-day threshold`);

      for (const seeker of seekers) {
        try {
          await db.userProfile.update({
            where: { id: seeker.userId },
            data: { isActive: false },
          });
          results.archived++;
          console.log(`[SOFT-DELETE] Archived user ${seeker.userId} (${seeker.user?.email}), cancelled ${seeker.cancelledAt?.toISOString()}`);
        } catch (err) {
          const msg = `Failed to archive ${seeker.userId}: ${err instanceof Error ? err.message : String(err)}`;
          results.errors.push(msg);
          console.error(`[SOFT-DELETE] ${msg}`);
        }
      }

      console.log(`[SOFT-DELETE] Complete: ${results.archived} archived, ${results.errors.length} errors`);
    } catch (err) {
      const msg = `Query failed: ${err instanceof Error ? err.message : String(err)}`;
      results.errors.push(msg);
      console.error(`[SOFT-DELETE] ${msg}`);
    }

    return results;
  }
}
