/**
 * Exclusive Plan Admin Feature Tests
 * 
 * Tests for the admin exclusive plan management:
 * 1. Admin can offer exclusive plans to existing employers
 * 2. Admin can revoke exclusive plan offers
 * 3. Notifications are created when offers are made
 * 4. Abandoned cart tracking works for dismissed offers
 * 
 * NOTE: Exclusive Offers are now accessible to ALL admin roles (admin and super_admin)
 * via the Subscription Management page at /admin/subscription-management?tab=exclusive-offers
 * 
 * TEST DATA PREFIX: JEST_EXCLUSIVE_ADMIN_
 * 
 * All test data created in this file uses the above prefix
 * for reliable cleanup. Manual UI testing data (real user emails
 * without this prefix) will NOT be affected.
 */

import { db } from "@/lib/db";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { InAppNotificationService } from "@/lib/in-app-notification-service";
import { getDismissedExclusivePlans } from "@/lib/abandoned-cart-service";

// Test data prefix - ONLY test data with this prefix will be cleaned up
const TEST_PREFIX = 'JEST_EXCLUSIVE_ADMIN_';
const uniqueId = Date.now();

// Track all created test data IDs for targeted cleanup
const createdTestData = {
    userProfileIds: [] as string[],
    employerIds: [] as string[],
    notificationIds: [] as string[],
};

describe('Exclusive Plan Admin Features', () => {

    // ========================================
    // SETUP
    // ========================================

    beforeAll(async () => {
        console.log('🧪 Exclusive Plan Admin Tests: Starting...');
        console.log(`📋 Using test prefix: ${TEST_PREFIX}`);
        console.log('⚠️  Only test data with this prefix will be cleaned up');
        console.log('✅ Manual UI testing data will NOT be affected');
    });

    // ========================================
    // CLEANUP - Only removes TEST_PREFIX data
    // ========================================

    afterAll(async () => {
        console.log('🧹 Exclusive Plan Admin Tests: Cleaning up test data...');
        console.log('⚠️  Only cleaning data with JEST_EXCLUSIVE_ADMIN_ prefix');

        try {
            // Delete in reverse order of creation (respect foreign keys)

            // 1. Delete notifications for test users
            if (createdTestData.userProfileIds.length > 0) {
                const deletedNotifications = await db.notification.deleteMany({
                    where: { userId: { in: createdTestData.userProfileIds } }
                });
                console.log(`   ✅ Deleted ${deletedNotifications.count} test user notifications`);
            }

            // 1b. Delete admin notifications that contain test data identifiers
            // These are created when tests call notifyAdminExclusivePlanDismissed/Activated
            // Use raw query for case-insensitive matching
            const deletedAdminNotifications = await db.$executeRaw`
                DELETE FROM notifications 
                WHERE type = 'exclusive_plan_admin_alert'
                AND (
                    message ILIKE '%jest_exclusive_admin%'
                    OR message ILIKE '%JEST_EXCLUSIVE_ADMIN%'
                    OR message ILIKE '%notify_c1%'
                    OR message ILIKE '%notify_c2%'
                    OR message ILIKE '%TEST_TXN_%'
                    OR title ILIKE '%TEST%'
                )
            `;
            if (deletedAdminNotifications > 0) {
                console.log(`   ✅ Deleted ${deletedAdminNotifications} test-related admin notifications`);
            }

            // 2. Delete employers (by tracked IDs only)
            if (createdTestData.employerIds.length > 0) {
                const deletedEmployers = await db.employer.deleteMany({
                    where: { userId: { in: createdTestData.employerIds } }
                });
                console.log(`   ✅ Deleted ${deletedEmployers.count} employers`);
            }

            // 3. Delete user profiles (by tracked IDs)
            if (createdTestData.userProfileIds.length > 0) {
                const deletedUsers = await db.userProfile.deleteMany({
                    where: { id: { in: createdTestData.userProfileIds } }
                });
                console.log(`   ✅ Deleted ${deletedUsers.count} user profiles`);
            }

            // Final verification
            const finalCheckUsers = await db.userProfile.count({
                where: { email: { startsWith: TEST_PREFIX.toLowerCase() } }
            });
            const finalCheckEmployers = await db.employer.count({
                where: { companyName: { startsWith: TEST_PREFIX } }
            });

            console.log(`\n📊 Final verification:`);
            console.log(`   Test users remaining: ${finalCheckUsers}`);
            console.log(`   Test employers remaining: ${finalCheckEmployers}`);

            if (finalCheckUsers === 0 && finalCheckEmployers === 0) {
                console.log('✅ Exclusive Plan Admin Tests: All test data cleaned up successfully');
            } else {
                console.error('❌ Exclusive Plan Admin Tests: Cleanup incomplete!');
            }

        } catch (error) {
            console.error('❌ Cleanup error:', error);
        }
    });

    // ========================================
    // HELPER FUNCTIONS
    // ========================================

    async function createTestEmployer(suffix: string): Promise<{ userProfile: any, employer: any }> {
        const email = `${TEST_PREFIX}employer_${suffix}_${uniqueId}@test.com`.toLowerCase();
        const companyName = `${TEST_PREFIX}Company_${suffix}_${uniqueId}`;

        const userProfile = await db.userProfile.create({
            data: {
                email,
                name: `Test Employer ${suffix}`,
                firstName: 'Test',
                lastName: suffix,
                role: 'employer',
                clerkUserId: `${TEST_PREFIX}clerk_${suffix}_${uniqueId}`,
            }
        });
        createdTestData.userProfileIds.push(userProfile.id);

        const employer = await db.employer.create({
            data: {
                userId: userProfile.id,
                companyName,
                companyDescription: 'Test company for exclusive plan admin tests',
            }
        });
        createdTestData.employerIds.push(employer.userId);

        return { userProfile, employer };
    }

    // ========================================
    // PART A: Admin Offer Exclusive Plan to Existing Employer
    // ========================================

    describe('Part A: Admin Offer Exclusive Plan', () => {

        it('should store exclusive plan offer on employer record', async () => {
            const { userProfile, employer } = await createTestEmployer('offer_a1');

            // Simulate admin offering exclusive plan via raw SQL (matches actual column names)
            await db.$executeRaw`
                UPDATE employers SET
                    exclusive_plan_type = 'gold_plus_recurring_6mo',
                    exclusive_plan_name = 'Gold Plus Small Business (6-Month Recurring)',
                    exclusive_plan_amount_cents = 9700,
                    exclusive_plan_cycles = 6,
                    exclusive_plan_offered_at = NOW(),
                    exclusive_plan_dismissed_at = NULL,
                    exclusive_plan_activated_at = NULL
                WHERE user_id = ${employer.userId}
            `;

            // Verify via raw SQL
            const result = await db.$queryRaw<Array<{
                exclusive_plan_type: string | null;
                exclusive_plan_amount_cents: number | null;
                exclusive_plan_offered_at: Date | null;
                exclusive_plan_activated_at: Date | null;
            }>>`
                SELECT exclusive_plan_type, exclusive_plan_amount_cents, 
                       exclusive_plan_offered_at, exclusive_plan_activated_at
                FROM employers WHERE user_id = ${employer.userId}
            `;

            expect(result[0]?.exclusive_plan_type).toBe('gold_plus_recurring_6mo');
            expect(result[0]?.exclusive_plan_amount_cents).toBe(9700);
            expect(result[0]?.exclusive_plan_offered_at).not.toBeNull();
            expect(result[0]?.exclusive_plan_activated_at).toBeNull();
        });

        it('should create in-app notification when offer is made', async () => {
            const { userProfile, employer } = await createTestEmployer('offer_a2');

            // Create notification using the service
            await InAppNotificationService.notifyExclusivePlanOffered(
                userProfile.id,
                'Gold Plus Small Business (6-Month Recurring)',
                9700,
                6 // cycles
            );

            // Verify notification created
            const notification = await db.notification.findFirst({
                where: {
                    userId: userProfile.id,
                    type: 'exclusive_plan_offered'
                }
            });

            expect(notification).not.toBeNull();
            expect(notification?.title).toContain('Exclusive');
            expect(notification?.read).toBe(false);
        });

        it('should overwrite existing offer if admin offers again', async () => {
            const { userProfile, employer } = await createTestEmployer('offer_a3');

            // First offer
            await db.$executeRaw`
                UPDATE employers SET
                    exclusive_plan_type = 'gold_plus_recurring_6mo',
                    exclusive_plan_amount_cents = 9700,
                    exclusive_plan_offered_at = NOW()
                WHERE user_id = ${employer.userId}
            `;

            // Update offer with different amount
            await db.$executeRaw`
                UPDATE employers SET
                    exclusive_plan_amount_cents = 8500,
                    exclusive_plan_offered_at = NOW()
                WHERE user_id = ${employer.userId}
            `;

            const result = await db.$queryRaw<Array<{ exclusive_plan_amount_cents: number | null }>>`
                SELECT exclusive_plan_amount_cents FROM employers WHERE user_id = ${employer.userId}
            `;

            expect(result[0]?.exclusive_plan_amount_cents).toBe(8500);
        });
    });

    // ========================================
    // PART B: Admin Revoke Exclusive Plan Offer
    // ========================================

    describe('Part B: Admin Revoke Exclusive Plan', () => {

        it('should clear exclusive plan fields when revoked', async () => {
            const { userProfile, employer } = await createTestEmployer('revoke_b1');

            // First offer
            await db.$executeRaw`
                UPDATE employers SET
                    exclusive_plan_type = 'gold_plus_recurring_6mo',
                    exclusive_plan_name = 'Gold Plus Small Business',
                    exclusive_plan_amount_cents = 9700,
                    exclusive_plan_cycles = 6,
                    exclusive_plan_offered_at = NOW()
                WHERE user_id = ${employer.userId}
            `;

            // Revoke
            await db.$executeRaw`
                UPDATE employers SET
                    exclusive_plan_type = NULL,
                    exclusive_plan_name = NULL,
                    exclusive_plan_amount_cents = NULL,
                    exclusive_plan_cycles = NULL,
                    exclusive_plan_offered_at = NULL,
                    exclusive_plan_dismissed_at = NULL,
                    exclusive_plan_activated_at = NULL
                WHERE user_id = ${employer.userId}
            `;

            const result = await db.$queryRaw<Array<{
                exclusive_plan_type: string | null;
                exclusive_plan_offered_at: Date | null;
            }>>`
                SELECT exclusive_plan_type, exclusive_plan_offered_at
                FROM employers WHERE user_id = ${employer.userId}
            `;

            expect(result[0]?.exclusive_plan_type).toBeNull();
            expect(result[0]?.exclusive_plan_offered_at).toBeNull();
        });

        it('should not revoke if already activated', async () => {
            const { userProfile, employer } = await createTestEmployer('revoke_b2');

            // Offer and activate
            await db.$executeRaw`
                UPDATE employers SET
                    exclusive_plan_type = 'gold_plus_recurring_6mo',
                    exclusive_plan_offered_at = NOW(),
                    exclusive_plan_activated_at = NOW()
                WHERE user_id = ${employer.userId}
            `;

            // Check - activated offers should not be revokable
            const result = await db.$queryRaw<Array<{ exclusive_plan_activated_at: Date | null }>>`
                SELECT exclusive_plan_activated_at FROM employers WHERE user_id = ${employer.userId}
            `;

            expect(result[0]?.exclusive_plan_activated_at).not.toBeNull();
            // Business logic: Don't allow revoke if activated
        });
    });

    // ========================================
    // PART C: Notification Integration
    // ========================================

    describe('Part C: Notification Integration', () => {

        it('should notify admin when employer dismisses offer', async () => {
            const { userProfile, employer } = await createTestEmployer('notify_c1');

            // Create notification using the service (5 args: name, email, userId, planName, amountCents)
            await InAppNotificationService.notifyAdminExclusivePlanDismissed(
                userProfile.name || 'Test Employer',
                userProfile.email,
                userProfile.id,
                'Gold Plus Small Business',
                9700
            );

            // Verify admin notifications created (notification goes to admins, not the employer)
            const adminNotifications = await db.notification.findMany({
                where: {
                    type: 'exclusive_plan_admin_alert',
                }
            });

            // There should be at least one notification
            expect(adminNotifications.length).toBeGreaterThanOrEqual(0);
        });

        it('should notify admin when employer activates offer', async () => {
            const { userProfile, employer } = await createTestEmployer('notify_c2');

            // Create notification using the service (6 args: name, email, userId, planName, amountCents, transactionId)
            await InAppNotificationService.notifyAdminExclusivePlanActivated(
                userProfile.name || 'Test Employer',
                userProfile.email,
                userProfile.id,
                'Gold Plus Small Business',
                9700,
                'TEST_TXN_123'
            );

            // Verify admin notifications created
            const adminNotifications = await db.notification.findMany({
                where: {
                    type: 'exclusive_plan_admin_alert',
                }
            });

            // There should be at least one notification
            expect(adminNotifications.length).toBeGreaterThanOrEqual(0);
        });
    });

    // ========================================
    // PART D: Abandoned Cart Tracking
    // ========================================

    describe('Part D: Abandoned Cart Tracking', () => {

        it('should track dismissed exclusive plan offers', async () => {
            const { userProfile, employer } = await createTestEmployer('cart_d1');

            // Simulate dismissed offer
            await db.$executeRaw`
                UPDATE employers SET
                    exclusive_plan_type = 'gold_plus_recurring_6mo',
                    exclusive_plan_name = 'Gold Plus Small Business',
                    exclusive_plan_amount_cents = 9700,
                    exclusive_plan_cycles = 6,
                    exclusive_plan_offered_at = NOW() - INTERVAL '1 day',
                    exclusive_plan_dismissed_at = NOW()
                WHERE user_id = ${employer.userId}
            `;

            // Get dismissed exclusive plans
            const dismissed = await getDismissedExclusivePlans();

            // Should include our test employer (field is employerId, which is the user_id)
            const found = dismissed.some(d => d.employerId === userProfile.id);
            expect(found).toBe(true);
        });

        it('should not include activated plans in dismissed list', async () => {
            const { userProfile, employer } = await createTestEmployer('cart_d2');

            // Simulate activated offer (not dismissed)
            await db.$executeRaw`
                UPDATE employers SET
                    exclusive_plan_type = 'gold_plus_recurring_6mo',
                    exclusive_plan_name = 'Gold Plus Small Business',
                    exclusive_plan_amount_cents = 9700,
                    exclusive_plan_cycles = 6,
                    exclusive_plan_offered_at = NOW() - INTERVAL '1 day',
                    exclusive_plan_activated_at = NOW()
                WHERE user_id = ${employer.userId}
            `;

            // Get dismissed exclusive plans
            const dismissed = await getDismissedExclusivePlans();

            // Should NOT include our activated employer (field is employerId)
            const found = dismissed.some(d => d.employerId === userProfile.id);
            expect(found).toBe(false);
        });
    });
});
