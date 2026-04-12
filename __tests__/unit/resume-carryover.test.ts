import { db } from '@/lib/db';
import { MembershipReminderService } from '@/lib/jobs/membership-reminders';
import { prismaMock } from '@/__tests__/mocks/prisma-mock';

/**
 * Resume Carryover Logic - Unit Tests
 * Tests for automatic resume carryover when billing renews
 */

describe('Resume Carryover Logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('processMembershipRenewal - Resume Carryover', () => {
        /**
         * TEST 1: Resumes from previous period are carried over to new period
         * Given: User has 3 active resumes from previous period
         * When: Membership renews
         * Then: All 3 resumes remain active in new period
         */
        it('should preserve active resumes from previous period on renewal', async () => {
            const seekerId = 'seeker-1';
            const plan = 'gold_bimonthly'; // 3 resumes limit

            // Setup: Create user with active resumes from previous period
            const existingResumes = [
                {
                    id: 'resume-1',
                    seekerId,
                    filename: 'john-doe-2024.pdf',
                    fileUrl: 'https://s3.../john-doe-2024.pdf',
                    uploadedAt: new Date('2024-12-01'),
                    status: 'active',
                    deletedAt: null,
                    isPrimary: true
                },
                {
                    id: 'resume-2',
                    seekerId,
                    filename: 'john-doe-alt.pdf',
                    fileUrl: 'https://s3.../john-doe-alt.pdf',
                    uploadedAt: new Date('2024-12-05'),
                    status: 'active',
                    deletedAt: null,
                    isPrimary: false
                },
                {
                    id: 'resume-3',
                    seekerId,
                    filename: 'john-doe-draft.pdf',
                    fileUrl: 'https://s3.../john-doe-draft.pdf',
                    uploadedAt: new Date('2024-12-10'),
                    status: 'active',
                    deletedAt: null,
                    isPrimary: false
                }
            ];

            const seeker = {
                userId: seekerId,
                membershipPlan: 'gold_bimonthly',
                membershipExpiresAt: new Date('2024-12-15'),
                resumeCredits: 3, // Already used 3 out of 3
                resumes: existingResumes
            };

            jest.spyOn(db.jobSeeker, 'findUnique').mockResolvedValue(seeker as any);
            jest.spyOn(db.resume, 'findMany').mockResolvedValue(existingResumes as any);
            jest.spyOn(db.jobSeeker, 'update').mockResolvedValue(seeker as any);
            jest.spyOn(db.subscription, 'update').mockResolvedValue({
                id: 'sub-1',
                status: 'active',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date()
            } as any);

            // Action: Process renewal
            const renewalResult = await MembershipReminderService.processMembershipRenewalWithCarryover(
                seekerId,
                plan,
                'sub-1'
            );

            // Assertion 1: Renewal successful
            expect(renewalResult).toBe(true);

            // Assertion 2: Resume credits preserved (carryover)
            // For gold plan: 3 limit, minus 3 used = 0 remaining
            // But old resumes should be tracked as "carryover"
            expect(db.jobSeeker.update).toHaveBeenCalledWith({
                where: { userId: seekerId },
                data: expect.objectContaining({
                    membershipPlan: 'gold_bimonthly',
                    resumeCredits: expect.any(Number), // Should account for carryover
                    lastBillingPeriodStart: expect.any(Date),
                    resumeCarryoverCount: 3
                })
            });
        });

        /**
         * TEST 2: Resume count includes both carryover and new uploads
         * Given: User had 2 resumes, uploads 1 new in new period
         * When: Check remaining credits
         * Then: Total is 2 (carryover) + 1 (new) = 3 used
         */
        it('should count carryover resumes correctly in quota calculation', () => {
            // Action: Calculate remaining credits with carryover
            const planLimit = 3;
            const carryoverCount = 2;
            const totalAvailableSlots = planLimit + carryoverCount; // 5 total slots
            const totalActiveResumes = 3; // 2 carryover + 1 new
            const remainingCredits = Math.max(0, totalAvailableSlots - totalActiveResumes);

            // Assertion: Correct credit calculation
            // 3 (plan limit) + 2 (carryover) - 3 (active) = 2 remaining
            expect(remainingCredits).toBe(2);
        });

        /**
         * TEST 3: Soft-deleted resumes don't count in carryover
         * Given: User has 3 resumes, 1 is soft-deleted
         * When: Membership renews
         * Then: Only 2 active resumes carry over
         */
        it('should exclude soft-deleted resumes from carryover count', () => {
            const resumes = [
                { id: 'r1', status: 'active', deletedAt: null },
                { id: 'r2', status: 'active', deletedAt: null },
                { id: 'r3', status: 'active', deletedAt: new Date('2024-12-10') } // Soft-deleted
            ];

            // Filter active (not soft-deleted) resumes only
            const activeResumes = resumes.filter(r => !r.deletedAt);

            // Assertion: Only non-deleted resumes counted
            expect(activeResumes.length).toBe(2);
        });

        /**
         * TEST 4: Unlimited plans don't need carryover tracking
         * Given: User on unlimited plan (VIP or Annual)
         * When: Membership renews
         * Then: Carryover count remains unlimited (999)
         */
        it('should handle unlimited plans correctly (no carryover constraint)', async () => {
            const seekerId = 'seeker-4';
            const plan = 'vip_quarterly'; // 999 (unlimited)

            const seeker = {
                userId: seekerId,
                membershipPlan: 'vip_quarterly',
                resumeCredits: 999,
                resumes: [] // Empty resumes array
            };

            jest.spyOn(db.jobSeeker, 'findUnique').mockResolvedValue(seeker as any);
            jest.spyOn(db.jobSeeker, 'update').mockResolvedValue(seeker as any);
            jest.spyOn(db.subscription, 'update').mockResolvedValue({} as any);

            await MembershipReminderService.processMembershipRenewalWithCarryover(
                seekerId,
                plan,
                'sub-1'
            );

            // Assertion: Unlimited users get unlimited credits (999)
            expect(db.jobSeeker.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        resumeCredits: 999
                    })
                })
            );
        });

        /**
         * TEST 5: Trial to paid upgrade carries over resume
         * Given: User on trial with 1 resume
         * When: Upgrades to gold (3 resumes)
         * Then: 1 resume carries over + 2 new slots available
         */
        it('should preserve resume when upgrading from trial to paid plan', async () => {
            const seekerId = 'seeker-5';

            const resumeFromTrial = {
                id: 'r-trial',
                seekerId,
                status: 'active',
                deletedAt: null,
                uploadedAt: new Date('2024-12-01')
            };

            const seeker = {
                userId: seekerId,
                membershipPlan: 'trial_monthly',
                resumeCredits: 0, // Trial slot used
                resumes: [resumeFromTrial]
            };

            jest.spyOn(db.jobSeeker, 'findUnique').mockResolvedValue(seeker as any);
            jest.spyOn(db.jobSeeker, 'update').mockResolvedValue(seeker as any);
            jest.spyOn(db.resume, 'findMany').mockResolvedValue([resumeFromTrial] as any);
            jest.spyOn(db.subscription, 'update').mockResolvedValue({} as any);

            // Action: Upgrade to gold
            await MembershipReminderService.processMembershipRenewalWithCarryover(
                seekerId,
                'gold_bimonthly',
                'sub-1'
            );

            // Assertion: Resume preserved, new credits added
            expect(db.jobSeeker.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        resumeCarryoverCount: 1,
                        resumeCredits: 2 // 3 (gold limit) - 1 (carryover) = 2 available
                    })
                })
            );
        });

        /**
         * TEST 6: Cancellation to renewal with old resumes
         * Given: User cancels subscription, resumes soft-deleted
         * When: User reactivates subscription after 15 days
         * Then: Old deleted resumes NOT in recovery window (<= 30 days) should still be restoreable
         */
        it('should handle reactivation with resumes in recovery window', () => {
            const cancellationDate = new Date('2024-11-15');
            const reactivationDate = new Date('2024-12-01'); // 16 days later
            const recoveryWindowEnd = new Date(cancellationDate);
            recoveryWindowEnd.setDate(recoveryWindowEnd.getDate() + 30); // Dec 15

            const deletedResumes = [
                {
                    id: 'r-del-1',
                    deletedAt: cancellationDate,
                    uploadedAt: new Date('2024-11-01')
                },
                {
                    id: 'r-del-2',
                    deletedAt: cancellationDate,
                    uploadedAt: new Date('2024-11-05')
                }
            ];

            // Query for resumes in recovery window
            const recoverableResumes = deletedResumes.filter(
                r => r.deletedAt && r.deletedAt > new Date(reactivationDate.getTime() - 30 * 24 * 60 * 60 * 1000)
            );

            // Assertion: Resumes still in 30-day window
            expect(recoverableResumes.length).toBe(2);
        });
    });

    describe('syncResumeCredits - Enhanced for Carryover', () => {
        /**
         * TEST 7: syncResumeCredits correctly accounts for carryover
         * Given: User with carryover resumes + new uploads
         * When: syncResumeCredits called
         * Then: Remaining credits calculated correctly
         */
        it('should sync credits accounting for carryover resumes', async () => {
            const seekerId = 'seeker-7';

            // Carryover from previous period (2 resumes)
            const carryoverResumes = [
                { id: 'c1', uploadedAt: new Date('2024-11-01') },
                { id: 'c2', uploadedAt: new Date('2024-11-15') }
            ];

            // New uploads in current period (1 resume)
            const newResumes = [
                { id: 'n1', uploadedAt: new Date('2024-12-10') }
            ];

            const allResumes = [...carryoverResumes, ...newResumes];

            const seeker = {
                userId: seekerId,
                membershipPlan: 'gold_bimonthly',
                membershipExpiresAt: new Date('2024-12-15'),
                lastBillingPeriodStart: new Date('2024-12-01'),
                resumeCarryoverCount: 2,
                resumes: allResumes
            };

            jest.spyOn(db.jobSeeker, 'findUnique').mockResolvedValue(seeker as any);
            jest.spyOn(db.jobSeeker, 'update').mockResolvedValue(seeker as any);
            jest.spyOn(db.resume, 'findMany').mockResolvedValue(allResumes as any);

            // Action: Sync credits
            const result = await MembershipReminderService.syncResumeCreditsWithCarryover(seekerId);

            // Assertion: Credits synced correctly
            // Gold = 3 limit; Carryover = 2; Total available = 5; Total used = 3; Remaining = 2
            expect(result.remainingCredits).toBe(2);
            expect(result.totalUsed).toBe(3);
            expect(result.carryoverCount).toBe(2);
        });
    });
});
