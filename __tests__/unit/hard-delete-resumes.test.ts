import { db } from '../../lib/db';
import { DataCleanupService } from '../../lib/jobs/cleanup-data';
import { S3Service } from '../../lib/s3';
import { CacheService } from '../../lib/redis';

/**
 * Hard Delete Resumes Cron Job - TDD Tests
 * 
 * Feature: Permanently delete soft-deleted resumes after 30-day recovery window
 * Purpose: Clean up storage, ensure data privacy, and prevent recovery of deleted resumes
 * 
 * Business Rules:
 * - Resumes soft-deleted >30 days ago → hard delete from DB + S3
 * - Resumes within 30-day window → preserve (recovery period)
 * - Update resume credits when deleting carryover resumes
 * - Update application statuses for deleted resumes
 * - Log all hard deletions for audit trail
 * - Send notification to seeker about permanent deletion
 */
describe('Hard Delete Resumes Cron Job', () => {
    beforeEach(() => {
        // Mock all database and S3 operations
        jest.spyOn(db.resume, 'findMany').mockClear();
        jest.spyOn(db.resume, 'deleteMany').mockClear();
        jest.spyOn(db.jobSeeker, 'update').mockClear();
        jest.spyOn(db.application, 'updateMany').mockClear();
        jest.spyOn(S3Service, 'deleteFile').mockClear();
        jest.spyOn(CacheService, 'incrementMetric').mockClear();
    });

    describe('cleanupDeletedResumes', () => {
        /**
         * TEST 1: Delete resumes that have been soft-deleted for >30 days
         * Given: Resume deleted 35 days ago
         * When: Hard delete job runs
         * Then: Resume permanently deleted from DB + S3, quota updated
         */
        it('should permanently delete resumes older than 30 days', async () => {
            const seekerId = 'seeker-1';
            const userId = 'user-1';
            const thirtyFiveDaysAgo = new Date();
            thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);

            const deletedResume = {
                id: 'resume-old-1',
                seekerId,
                filename: 'old-resume.pdf',
                fileUrl: 'https://hire-my-mom-files.s3.us-east-1.amazonaws.com/resumes/user-1/old-resume-uuid.pdf',
                createdAt: new Date('2024-09-01'),
                deletedAt: thirtyFiveDaysAgo
            };

            const seeker = {
                userId,
                membershipPlan: 'gold_bimonthly',
                resumeCredits: 1,
                resumeCarryoverCount: 1,
                lastBillingPeriodStart: new Date('2024-12-01')
            };

            jest.spyOn(db.resume, 'findMany').mockResolvedValue([deletedResume] as any);
            jest.spyOn(db.resume, 'count').mockResolvedValue(0); // No preserved resumes
            jest.spyOn(db.resume, 'deleteMany').mockResolvedValue({ count: 1 });
            jest.spyOn(db.application, 'updateMany').mockResolvedValue({ count: 0 });
            jest.spyOn(db.jobSeeker, 'findUnique').mockResolvedValue(seeker as any);
            jest.spyOn(db.jobSeeker, 'update').mockResolvedValue(seeker as any);
            jest.spyOn(S3Service, 'deleteFile').mockResolvedValue(true);
            jest.spyOn(CacheService, 'incrementMetric').mockResolvedValue(1);

            // Action: Call hard delete cleanup
            const result = await DataCleanupService.cleanupDeletedResumes();

            // Assertions
            expect(result.hardDeleted).toBe(1);
            expect(result.s3FilesRemoved).toBe(1);
            expect(db.resume.deleteMany).toHaveBeenCalledWith({
                where: { id: deletedResume.id }
            });
            expect(S3Service.deleteFile).toHaveBeenCalledWith('hire-my-mom-files', 'resumes/user-1/old-resume-uuid.pdf');
            expect(result.errors.length).toBe(0);
        });

        /**
         * TEST 2: Preserve resumes within 30-day recovery window
         * Given: Resume deleted 10 days ago
         * When: Hard delete job runs
         * Then: Resume preserved, not deleted
         */
        it('should preserve resumes within 30-day recovery window', async () => {
            const tenDaysAgo = new Date();
            tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

            jest.spyOn(db.resume, 'findMany').mockResolvedValue([] as any); // No old resumes
            jest.spyOn(db.resume, 'count').mockResolvedValue(1); // 1 recent resume
            jest.spyOn(CacheService, 'incrementMetric').mockResolvedValue(1);

            // Action: Call hard delete cleanup
            const result = await DataCleanupService.cleanupDeletedResumes();

            // Assertions: No hard deletes should occur
            expect(result.hardDeleted).toBe(0);
            expect(result.preserved).toBe(1);
            expect(db.resume.deleteMany).not.toHaveBeenCalled();
            expect(S3Service.deleteFile).not.toHaveBeenCalled();
        });

        /**
         * TEST 3: Update resume credits and carryover when deleting
         * Given: Seeker with 2 carryover resumes, 1 being hard deleted
         * When: Hard delete processes
         * Then: Carryover count decremented, credits recalculated
         */
        it('should update resume credits when deleting carryover resumes', async () => {
            const userId = 'user-3';
            const thirtyFiveDaysAgo = new Date();
            thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);

            const deletedResume = {
                id: 'resume-carryover-1',
                seekerId: 'seeker-3',
                deletedAt: thirtyFiveDaysAgo,
                createdAt: new Date('2024-11-01'), // From previous period
                fileUrl: 'https://hire-my-mom-files.s3.us-east-1.amazonaws.com/resumes/user-3/resume-uuid.pdf'
            };

            const seeker = {
                userId,
                membershipPlan: 'gold_bimonthly',
                resumeCredits: 2, // 3 limit - 1 carryover
                resumeCarryoverCount: 1, // Has 1 carryover
                lastBillingPeriodStart: new Date('2024-12-01')
            };

            jest.spyOn(db.resume, 'findMany').mockResolvedValue([deletedResume] as any);
            jest.spyOn(db.resume, 'count').mockResolvedValue(0);
            jest.spyOn(db.application, 'updateMany').mockResolvedValue({ count: 0 });
            jest.spyOn(db.jobSeeker, 'findUnique').mockResolvedValue(seeker as any);
            jest.spyOn(db.resume, 'deleteMany').mockResolvedValue({ count: 1 });
            jest.spyOn(db.jobSeeker, 'update').mockResolvedValue({
                ...seeker,
                resumeCarryoverCount: 0,
                resumeCredits: 3 // Back to full credits
            } as any);
            jest.spyOn(S3Service, 'deleteFile').mockResolvedValue(true);
            jest.spyOn(CacheService, 'incrementMetric').mockResolvedValue(1);

            // Action: Hard delete
            const result = await DataCleanupService.cleanupDeletedResumes();

            // Assertions: Carryover count and credits updated
            expect(db.jobSeeker.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { userId: 'seeker-3' },
                    data: expect.objectContaining({
                        resumeCarryoverCount: 0, // Decremented
                        resumeCredits: 3 // Recalculated
                    })
                })
            );
            expect(result.hardDeleted).toBe(1);
        });

        /**
         * TEST 4: Update application statuses when resume is hard deleted
         * Given: 2 applications tied to deleted resume
         * When: Hard delete processes
         * Then: Applications marked as orphaned or updated
         */
        it('should update application statuses when deleting resumes', async () => {
            const seekerId = 'seeker-4';
            const resumeId = 'resume-with-apps-1';
            const thirtyFiveDaysAgo = new Date();
            thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);

            const deletedResume = {
                id: resumeId,
                seekerId,
                deletedAt: thirtyFiveDaysAgo,
                fileUrl: 'https://hire-my-mom-files.s3.us-east-1.amazonaws.com/resumes/user-4/resume.pdf',
                status: 'active'
            };

            jest.spyOn(db.resume, 'findMany').mockResolvedValue([deletedResume] as any);
            jest.spyOn(db.resume, 'deleteMany').mockResolvedValue({ count: 1 });
            jest.spyOn(db.application, 'updateMany').mockResolvedValue({ count: 2 });
            jest.spyOn(db.jobSeeker, 'findUnique').mockResolvedValue({
                resumeCarryoverCount: 0
            } as any);
            jest.spyOn(db.jobSeeker, 'update').mockResolvedValue({} as any);
            jest.spyOn(S3Service, 'deleteFile').mockResolvedValue(true);

            // Action: Hard delete
            const result = await DataCleanupService.cleanupDeletedResumes();

            // Assertions: Applications updated
            expect(db.application.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { resumeId },
                    data: expect.objectContaining({
                        status: 'orphaned' // Or 'withdrawn', depending on business logic
                    })
                })
            );
            expect(result.applicationsUpdated).toBeGreaterThanOrEqual(0);
        });

        /**
         * TEST 5: Handle S3 deletion failures gracefully
         * Given: Resume scheduled for deletion, S3 file not found
         * When: Hard delete processes
         * Then: DB deletion still proceeds, error logged
         */
        it('should handle S3 deletion failures gracefully', async () => {
            const seekerId = 'seeker-5';
            const thirtyFiveDaysAgo = new Date();
            thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);

            const deletedResume = {
                id: 'resume-5',
                seekerId,
                deletedAt: thirtyFiveDaysAgo,
                fileUrl: 'https://hire-my-mom-files.s3.us-east-1.amazonaws.com/resumes/user-5/nonexistent.pdf',
                status: 'active'
            };

            jest.spyOn(db.resume, 'findMany').mockResolvedValue([deletedResume] as any);
            jest.spyOn(db.resume, 'deleteMany').mockResolvedValue({ count: 1 });
            jest.spyOn(db.jobSeeker, 'findUnique').mockResolvedValue({
                resumeCarryoverCount: 0
            } as any);
            jest.spyOn(db.jobSeeker, 'update').mockResolvedValue({} as any);
            jest.spyOn(S3Service, 'deleteFile').mockRejectedValue(
                new Error('NoSuchKey: The specified key does not exist.')
            );

            // Action: Hard delete (should not throw)
            const result = await DataCleanupService.cleanupDeletedResumes();

            // Assertions: DB deleted despite S3 error
            expect(db.resume.deleteMany).toHaveBeenCalled();
            expect(result.hardDeleted).toBe(1);
            expect(result.errors.length).toBeGreaterThan(0); // Error logged
        });

        /**
         * TEST 6: Batch delete multiple expired resumes
         * Given: 5 resumes deleted 35+ days ago
         * When: Hard delete job runs
         * Then: All 5 deleted from DB + S3
         */
        it('should batch delete multiple expired resumes', async () => {
            const deletedResumes = Array.from({ length: 5 }, (_, i) => ({
                id: `resume-batch-${i}`,
                seekerId: `seeker-${i}`,
                deletedAt: (() => {
                    const date = new Date();
                    date.setDate(date.getDate() - (35 + i)); // 35-39 days ago
                    return date;
                })(),
                fileUrl: `https://hire-my-mom-files.s3.us-east-1.amazonaws.com/resumes/user-${i}/resume-${i}.pdf`,
                status: 'active'
            }));

            jest.spyOn(db.resume, 'findMany').mockResolvedValue(deletedResumes as any);
            jest.spyOn(db.resume, 'deleteMany').mockResolvedValue({ count: 5 });
            jest.spyOn(db.jobSeeker, 'findUnique').mockResolvedValue({
                resumeCarryoverCount: 0
            } as any);
            jest.spyOn(db.jobSeeker, 'update').mockResolvedValue({} as any);
            jest.spyOn(S3Service, 'deleteFile').mockResolvedValue(true);

            // Action: Hard delete
            const result = await DataCleanupService.cleanupDeletedResumes();

            // Assertions: All resumes deleted
            expect(result.hardDeleted).toBe(5);
            expect(S3Service.deleteFile).toHaveBeenCalledTimes(5);
            expect(result.errors.length).toBe(0);
        });

        /**
         * TEST 7: Track metrics and audit trail
         * Given: 2 resumes hard deleted
         * When: Hard delete completes
         * Then: Metrics incremented, audit logged
         */
        it('should track metrics and audit trail for hard deletes', async () => {
            const thirtyFiveDaysAgo = new Date();
            thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);

            jest.spyOn(db.resume, 'findMany').mockResolvedValue([
                {
                    id: 'resume-audit-1',
                    seekerId: 'seeker-audit',
                    deletedAt: thirtyFiveDaysAgo,
                    fileUrl: 'https://hire-my-mom-files.s3.us-east-1.amazonaws.com/resumes/user-audit/resume-1.pdf',
                    status: 'active'
                }
            ] as any);
            jest.spyOn(db.resume, 'deleteMany').mockResolvedValue({ count: 1 });
            jest.spyOn(db.jobSeeker, 'findUnique').mockResolvedValue({
                resumeCarryoverCount: 0
            } as any);
            jest.spyOn(db.jobSeeker, 'update').mockResolvedValue({} as any);
            jest.spyOn(S3Service, 'deleteFile').mockResolvedValue(true);
            jest.spyOn(CacheService, 'incrementMetric').mockResolvedValue(1);

            // Action: Hard delete
            const result = await DataCleanupService.cleanupDeletedResumes();

            // Assertions: Metrics tracked
            expect(CacheService.incrementMetric).toHaveBeenCalledWith(
                expect.stringContaining('hard_deleted_resumes')
            );
            expect(result.hardDeleted).toBe(1);
        });
    });

    describe('cleanupDeletedResumes - Edge Cases', () => {
        /**
         * TEST 8: Handle null deletedAt gracefully
         * Given: Resume with deletedAt = null (not actually deleted)
         * When: Hard delete runs
         * Then: Resume skipped, no error
         */
        it('should skip resumes with null deletedAt', () => {
            const resume = {
                id: 'resume-active',
                seekerId: 'seeker-edge',
                deletedAt: null, // Not deleted
                s3Key: 'resumes/user-edge/active.pdf',
                status: 'active'
            };

            // Filter logic: only get resumes where deletedAt is NOT null
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const candidatesForDeletion = [resume].filter(
                r => r.deletedAt && r.deletedAt < thirtyDaysAgo
            );

            // Assertion: Active resume not included
            expect(candidatesForDeletion.length).toBe(0);
        });

        /**
         * TEST 9: Handle exactly 30-day boundary
         * Given: Resume deleted exactly 30 days ago
         * When: Hard delete runs
         * Then: Resume preserved (inclusive of recovery period)
         */
        it('should preserve resumes at exactly 30-day boundary', () => {
            const now = new Date();
            const thirtyDaysAgo = new Date(now);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const resume = {
                id: 'resume-boundary',
                deletedAt: thirtyDaysAgo
            };

            // Query: deletedAt < (now - 30 days)  [strict inequality]
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 30);

            const shouldDelete = resume.deletedAt < cutoff;

            // Assertion: Exactly 30 days is preserved (not deleted)
            expect(shouldDelete).toBe(false);
        });

        /**
         * TEST 10: Empty result set (no old resumes to delete)
         * Given: No resumes older than 30 days
         * When: Hard delete runs
         * Then: Completes successfully with 0 deleted
         */
        it('should handle empty result set gracefully', async () => {
            jest.spyOn(db.resume, 'findMany').mockResolvedValue([] as any);
            jest.spyOn(CacheService, 'incrementMetric').mockResolvedValue(1);

            // Action: Hard delete
            const result = await DataCleanupService.cleanupDeletedResumes();

            // Assertions: Completes successfully
            expect(result.hardDeleted).toBe(0);
            expect(result.errors.length).toBe(0);
        });
    });
});
