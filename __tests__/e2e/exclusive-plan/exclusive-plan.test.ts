/**
 * Exclusive Plan Feature Tests
 * 
 * Tests for the exclusive plan flow where invited employers:
 * 1. Complete onboarding WITHOUT payment
 * 2. See an exclusive plan modal on dashboard
 * 3. Can activate (pay) or dismiss the offer
 * 4. Can access offer later from billing page
 * 
 * TEST DATA PREFIX: JEST_EXCLUSIVE_PLAN_
 * 
 * All test data created in this file uses the above prefix
 * for reliable cleanup. Manual UI testing data (real user emails
 * without this prefix) will NOT be affected.
 */

import { db } from "@/lib/db";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import {
    storeExclusivePlanEligibility,
    activateExclusivePlan,
    dismissExclusivePlanOffer,
    getExclusivePlanOffer,
    INVITATION_PACKAGE_CONFIG
} from "@/lib/employer-package-provisioning";

// Test data prefix - ONLY test data with this prefix will be cleaned up
const TEST_PREFIX = 'JEST_EXCLUSIVE_PLAN_';
const uniqueId = Date.now();

// Track all created test data IDs for targeted cleanup
const createdTestData = {
    userProfileIds: [] as string[],
    employerIds: [] as string[],
    invitationIds: [] as string[],
    packageIds: [] as string[],
    paymentMethodIds: [] as string[],
    invoiceIds: [] as string[],
};

describe('Exclusive Plan Feature', () => {

    // ========================================
    // SETUP
    // ========================================

    beforeAll(async () => {
        console.log('🧪 Exclusive Plan Tests: Starting...');
        console.log(`📋 Using test prefix: ${TEST_PREFIX}`);
        console.log('⚠️  Only test data with this prefix will be cleaned up');
        console.log('✅ Manual UI testing data will NOT be affected');
    });

    // ========================================
    // CLEANUP - Only removes TEST_PREFIX data
    // ========================================

    afterAll(async () => {
        console.log('🧹 Exclusive Plan Tests: Cleaning up test data...');
        console.log('⚠️  Only cleaning data with JEST_EXCLUSIVE_PLAN_ prefix');

        try {
            // Delete in reverse order of creation (respect foreign keys)

            // 1. Delete invoices for test packages
            if (createdTestData.packageIds.length > 0) {
                const deletedInvoices = await db.invoice.deleteMany({
                    where: { employerPackageId: { in: createdTestData.packageIds } }
                });
                console.log(`   ✅ Deleted ${deletedInvoices.count} invoices`);
            }

            // 2. Delete payment methods
            if (createdTestData.paymentMethodIds.length > 0) {
                const deletedPaymentMethods = await db.paymentMethod.deleteMany({
                    where: { id: { in: createdTestData.paymentMethodIds } }
                });
                console.log(`   ✅ Deleted ${deletedPaymentMethods.count} payment methods`);
            }

            // 3. Delete employer packages (by tracked IDs)
            if (createdTestData.packageIds.length > 0) {
                const deletedPackages = await db.employerPackage.deleteMany({
                    where: { id: { in: createdTestData.packageIds } }
                });
                console.log(`   ✅ Deleted ${deletedPackages.count} employer packages`);
            }

            // 4. Delete employers (by tracked IDs only)
            if (createdTestData.employerIds.length > 0) {
                const deletedEmployers = await db.employer.deleteMany({
                    where: { userId: { in: createdTestData.employerIds } }
                });
                console.log(`   ✅ Deleted ${deletedEmployers.count} employers`);
            }

            // 5. Delete user invitations (by prefix)
            const deletedInvitations = await db.userInvitation.deleteMany({
                where: { email: { startsWith: TEST_PREFIX.toLowerCase() } }
            });
            console.log(`   ✅ Deleted ${deletedInvitations.count} user invitations`);

            // 6. Delete user profiles (by tracked IDs)
            if (createdTestData.userProfileIds.length > 0) {
                const deletedUsers = await db.userProfile.deleteMany({
                    where: { id: { in: createdTestData.userProfileIds } }
                });
                console.log(`   ✅ Deleted ${deletedUsers.count} user profiles`);
            }

            // ========================================
            // VERIFICATION - Ensure only test data removed
            // ========================================

            // Verify no test data remains
            const remainingTestUsers = await db.userProfile.count({
                where: { email: { startsWith: TEST_PREFIX.toLowerCase() } }
            });

            const remainingTestEmployers = await db.employer.count({
                where: { companyName: { startsWith: TEST_PREFIX } }
            });

            const remainingTestInvitations = await db.userInvitation.count({
                where: { email: { startsWith: TEST_PREFIX.toLowerCase() } }
            });

            if (remainingTestUsers > 0 || remainingTestEmployers > 0 || remainingTestInvitations > 0) {
                console.warn(`⚠️ Remaining test data: ${remainingTestUsers} users, ${remainingTestEmployers} employers, ${remainingTestInvitations} invitations`);

                // Force cleanup by prefix (only JEST_ prefixed data)
                await db.invoice.deleteMany({
                    where: { employerPackage: { employer: { companyName: { startsWith: TEST_PREFIX } } } }
                });
                await db.employerPackage.deleteMany({
                    where: { employer: { companyName: { startsWith: TEST_PREFIX } } }
                });
                await db.paymentMethod.deleteMany({
                    where: { employer: { companyName: { startsWith: TEST_PREFIX } } }
                });
                await db.employer.deleteMany({
                    where: { companyName: { startsWith: TEST_PREFIX } }
                });
                await db.userInvitation.deleteMany({
                    where: { email: { startsWith: TEST_PREFIX.toLowerCase() } }
                });
                await db.userProfile.deleteMany({
                    where: { email: { startsWith: TEST_PREFIX.toLowerCase() } }
                });
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
                console.log('✅ Exclusive Plan Tests: All test data cleaned up successfully');
            } else {
                console.error('❌ Exclusive Plan Tests: Cleanup incomplete!');
            }

        } catch (error) {
            console.error('❌ Cleanup error:', error);
        }
    });

    // ========================================
    // HELPER FUNCTIONS
    // ========================================

    // Shared test admin for creating invitations
    let testAdminId: string;

    async function ensureTestAdmin(): Promise<string> {
        if (testAdminId) return testAdminId;

        const admin = await db.userProfile.create({
            data: {
                email: `${TEST_PREFIX}admin_${uniqueId}@test.com`.toLowerCase(),
                name: 'Test Admin',
                firstName: 'Test',
                lastName: 'Admin',
                role: 'admin',
                clerkUserId: `${TEST_PREFIX}admin_clerk_${uniqueId}`,
            }
        });
        createdTestData.userProfileIds.push(admin.id);
        testAdminId = admin.id;
        return testAdminId;
    }

    async function createTestUser(suffix: string): Promise<{ userProfile: any, employer: any }> {
        const email = `${TEST_PREFIX}user_${suffix}_${uniqueId}@test.com`.toLowerCase();
        const companyName = `${TEST_PREFIX}Company_${suffix}_${uniqueId}`;

        const userProfile = await db.userProfile.create({
            data: {
                email,
                name: `Test User ${suffix}`,
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
            }
        });
        createdTestData.employerIds.push(employer.userId);

        return { userProfile, employer };
    }

    async function createTestInvitation(email: string, packageType: string = 'gold_plus_recurring_6mo') {
        const adminId = await ensureTestAdmin();
        const packageConfig = INVITATION_PACKAGE_CONFIG[packageType];

        const invitation = await db.userInvitation.create({
            data: {
                email: email.toLowerCase(),
                role: 'employer',
                fullName: 'Test Invitee',
                invitedBy: adminId,
                invitationToken: `${TEST_PREFIX}token_${uniqueId}_${Math.random().toString(36).slice(2)}`,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                pendingPackageType: packageType,
                pendingAmountCents: packageConfig?.amountCents,
                pendingBillingCycles: packageConfig?.billingCyclesTotal,
            }
        });
        createdTestData.invitationIds.push(invitation.id);
        return invitation;
    }

    async function createTestInvitationWithoutPackage(email: string) {
        const adminId = await ensureTestAdmin();

        const invitation = await db.userInvitation.create({
            data: {
                email: email.toLowerCase(),
                role: 'employer',
                fullName: 'Test Invitee No Package',
                invitedBy: adminId,
                invitationToken: `${TEST_PREFIX}token_no_pkg_${uniqueId}_${Math.random().toString(36).slice(2)}`,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                // No package fields set
            }
        });
        createdTestData.invitationIds.push(invitation.id);
        return invitation;
    }

    // ========================================
    // PART A: Schema & Configuration
    // ========================================

    describe('Part A: Schema & Configuration', () => {

        it('should have INVITATION_PACKAGE_CONFIG with gold_plus_recurring_6mo', () => {
            const config = INVITATION_PACKAGE_CONFIG['gold_plus_recurring_6mo'];

            expect(config).toBeDefined();
            expect(config.packageName).toContain('Gold Plus');
            expect(config.amountCents).toBe(9700);
            expect(config.billingCyclesTotal).toBe(6);
            expect(config.isRecurring).toBe(true);
            expect(config.billingFrequency).toBe('monthly');
        });

        it('should verify Employer table has exclusive plan fields', async () => {
            // Query to verify columns exist (using raw SQL)
            const result = await db.$queryRaw<Array<{ column_name: string }>>`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'employers' 
                AND column_name LIKE 'exclusive_plan%'
            `;

            const columns = result.map(r => r.column_name);

            expect(columns).toContain('exclusive_plan_type');
            expect(columns).toContain('exclusive_plan_name');
            expect(columns).toContain('exclusive_plan_amount_cents');
            expect(columns).toContain('exclusive_plan_cycles');
            expect(columns).toContain('exclusive_plan_offered_at');
            expect(columns).toContain('exclusive_plan_dismissed_at');
            expect(columns).toContain('exclusive_plan_activated_at');
        });
    });

    // ========================================
    // PART B: Store Exclusive Plan Eligibility
    // ========================================

    describe('Part B: Store Exclusive Plan Eligibility', () => {

        it('should store exclusive plan eligibility for invited employer', async () => {
            const { userProfile, employer } = await createTestUser('eligibility_b1');
            const email = userProfile.email;

            // Create invitation with package
            await createTestInvitation(email);

            // Call the function that stores eligibility
            const result = await storeExclusivePlanEligibility(employer.userId, email);

            expect(result).not.toBeNull();
            expect(result.exclusivePlanType).toBe('gold_plus_recurring_6mo');

            // Verify in database
            const updatedEmployer = await db.$queryRaw<Array<{
                exclusive_plan_type: string | null;
                exclusive_plan_name: string | null;
                exclusive_plan_amount_cents: number | null;
                exclusive_plan_cycles: number | null;
                exclusive_plan_offered_at: Date | null;
            }>>`
                SELECT exclusive_plan_type, exclusive_plan_name, 
                       exclusive_plan_amount_cents, exclusive_plan_cycles,
                       exclusive_plan_offered_at
                FROM employers
                WHERE user_id = ${employer.userId}
            `;

            expect(updatedEmployer[0].exclusive_plan_type).toBe('gold_plus_recurring_6mo');
            expect(updatedEmployer[0].exclusive_plan_name).toContain('Gold Plus');
            expect(updatedEmployer[0].exclusive_plan_amount_cents).toBe(9700);
            expect(updatedEmployer[0].exclusive_plan_cycles).toBe(6);
            expect(updatedEmployer[0].exclusive_plan_offered_at).not.toBeNull();
        });

        it('should return null when no invitation exists', async () => {
            const { userProfile, employer } = await createTestUser('eligibility_b2');

            // No invitation created - should return null
            const result = await storeExclusivePlanEligibility(employer.userId, userProfile.email);

            expect(result).toBeNull();
        });

        it('should return null when invitation has no package', async () => {
            const { userProfile, employer } = await createTestUser('eligibility_b3');

            // Create invitation WITHOUT package
            await createTestInvitationWithoutPackage(userProfile.email);

            const result = await storeExclusivePlanEligibility(employer.userId, userProfile.email);

            expect(result).toBeNull();
        });
    });

    // ========================================
    // PART C: Get Exclusive Plan Offer
    // ========================================

    describe('Part C: Get Exclusive Plan Offer Status', () => {

        it('should return offer with showModal=true for new eligible employer', async () => {
            const { userProfile, employer } = await createTestUser('offer_c1');
            await createTestInvitation(userProfile.email);
            await storeExclusivePlanEligibility(employer.userId, userProfile.email);

            const offer = await getExclusivePlanOffer(employer.userId);

            expect(offer).not.toBeNull();
            expect(offer?.hasOffer).toBe(true);
            expect(offer?.showModal).toBe(true);
            expect(offer?.isActivated).toBe(false);
            expect(offer?.isDismissed).toBe(false);
            expect(offer?.planType).toBe('gold_plus_recurring_6mo');
            expect(offer?.amountCents).toBe(9700);
            expect(offer?.cycles).toBe(6);
        });

        it('should return null for employer without exclusive plan', async () => {
            const { employer } = await createTestUser('offer_c2');
            // No invitation or eligibility stored

            const offer = await getExclusivePlanOffer(employer.userId);

            expect(offer).toBeNull();
        });
    });

    // ========================================
    // PART D: Dismiss Exclusive Plan Offer
    // ========================================

    describe('Part D: Dismiss Exclusive Plan Offer', () => {

        it('should mark offer as dismissed and set showModal=false', async () => {
            const { userProfile, employer } = await createTestUser('dismiss_d1');
            await createTestInvitation(userProfile.email);
            await storeExclusivePlanEligibility(employer.userId, userProfile.email);

            // Dismiss the offer
            const dismissResult = await dismissExclusivePlanOffer(employer.userId);
            expect(dismissResult).toBe(true);

            // Check updated status
            const offer = await getExclusivePlanOffer(employer.userId);

            expect(offer?.hasOffer).toBe(true);
            expect(offer?.showModal).toBe(false); // Modal should not show
            expect(offer?.isDismissed).toBe(true);
            expect(offer?.isActivated).toBe(false);
        });
    });

    // ========================================
    // PART E: Activate Exclusive Plan
    // ========================================

    describe('Part E: Activate Exclusive Plan', () => {

        it('should create EmployerPackage when activated', async () => {
            const { userProfile, employer } = await createTestUser('activate_e1');
            await createTestInvitation(userProfile.email);
            await storeExclusivePlanEligibility(employer.userId, userProfile.email);

            // Simulate payment and activate
            const transactionId = `${TEST_PREFIX}TXN_${uniqueId}`;
            const pkg = await activateExclusivePlan(employer.userId, transactionId);

            expect(pkg).not.toBeNull();
            createdTestData.packageIds.push(pkg.id);

            // Verify package details
            expect(pkg.packageType).toBe('gold_plus_recurring_6mo');
            expect(pkg.isRecurring).toBe(true);
            expect(pkg.billingFrequency).toBe('monthly');
            expect(pkg.billingCyclesTotal).toBe(6);
            expect(pkg.billingCyclesCompleted).toBe(1);
            expect(pkg.recurringAmountCents).toBe(9700);
            expect(pkg.recurringStatus).toBe('active');

            // Verify offer status updated
            const offer = await getExclusivePlanOffer(employer.userId);
            expect(offer?.isActivated).toBe(true);
            expect(offer?.showModal).toBe(false);
        });

        it('should create Invoice for first payment', async () => {
            const { userProfile, employer } = await createTestUser('activate_e2');
            await createTestInvitation(userProfile.email);
            await storeExclusivePlanEligibility(employer.userId, userProfile.email);

            const transactionId = `${TEST_PREFIX}TXN_E2_${uniqueId}`;
            const pkg = await activateExclusivePlan(employer.userId, transactionId);
            createdTestData.packageIds.push(pkg.id);

            // Verify invoice created
            const invoice = await db.invoice.findFirst({
                where: { employerPackageId: pkg.id }
            });

            expect(invoice).not.toBeNull();
            expect(invoice?.amountDue).toBe(9700);
            expect(invoice?.status).toBe('paid');
            expect(invoice?.authnetTransactionId).toBe(transactionId);
        });

        it('should return null when no exclusive plan exists', async () => {
            const { employer } = await createTestUser('activate_e3');
            // No eligibility stored

            const pkg = await activateExclusivePlan(employer.userId, 'fake_txn');

            expect(pkg).toBeNull();
        });
    });

    // ========================================
    // PART F: Edge Cases
    // ========================================

    describe('Part F: Edge Cases', () => {

        it('should not allow double activation', async () => {
            const { userProfile, employer } = await createTestUser('edge_f1');
            await createTestInvitation(userProfile.email);
            await storeExclusivePlanEligibility(employer.userId, userProfile.email);

            // First activation
            const pkg1 = await activateExclusivePlan(employer.userId, `${TEST_PREFIX}TXN1_${uniqueId}`);
            expect(pkg1).not.toBeNull();
            createdTestData.packageIds.push(pkg1.id);

            // Second activation should fail (already activated)
            const pkg2 = await activateExclusivePlan(employer.userId, `${TEST_PREFIX}TXN2_${uniqueId}`);
            expect(pkg2).toBeNull();
        });

        it('should allow activation after dismissal', async () => {
            const { userProfile, employer } = await createTestUser('edge_f2');
            await createTestInvitation(userProfile.email);
            await storeExclusivePlanEligibility(employer.userId, userProfile.email);

            // First dismiss
            await dismissExclusivePlanOffer(employer.userId);

            // Then activate (should still work)
            const pkg = await activateExclusivePlan(employer.userId, `${TEST_PREFIX}TXN_F2_${uniqueId}`);
            expect(pkg).not.toBeNull();
            createdTestData.packageIds.push(pkg.id);
        });
    });

    // ========================================
    // PART G: CANCELLATION FLOW
    // Tests for when employers cancel their recurring plan
    // ========================================

    describe('Part G: Cancellation Flow', () => {

        it('should allow cancelling an active recurring package', async () => {
            const { userProfile, employer } = await createTestUser('cancel_g1');
            await createTestInvitation(userProfile.email);
            await storeExclusivePlanEligibility(employer.userId, userProfile.email);

            // Activate the plan first
            const pkg = await activateExclusivePlan(employer.userId, `${TEST_PREFIX}TXN_G1_${uniqueId}`);
            expect(pkg).not.toBeNull();
            createdTestData.packageIds.push(pkg.id);

            // Verify it's recurring
            expect(pkg.isRecurring).toBe(true);
            expect(pkg.recurringStatus).toBe('active');
            expect(pkg.billingCyclesTotal).toBe(6);

            // Cancel the package
            const cancelledPkg = await db.employerPackage.update({
                where: { id: pkg.id },
                data: {
                    recurringStatus: 'cancelled',
                    expiresAt: new Date()
                }
            });

            expect(cancelledPkg.recurringStatus).toBe('cancelled');
        });

        it('should track billing cycles completed before cancellation', async () => {
            const { userProfile, employer } = await createTestUser('cancel_g2');
            await createTestInvitation(userProfile.email);
            await storeExclusivePlanEligibility(employer.userId, userProfile.email);

            // Activate the plan
            const pkg = await activateExclusivePlan(employer.userId, `${TEST_PREFIX}TXN_G2_${uniqueId}`);
            expect(pkg).not.toBeNull();
            createdTestData.packageIds.push(pkg.id);

            // Simulate 3 billing cycles completed
            await db.employerPackage.update({
                where: { id: pkg.id },
                data: {
                    billingCyclesCompleted: 3
                }
            });

            // Cancel after 3 cycles
            const cancelledPkg = await db.employerPackage.update({
                where: { id: pkg.id },
                data: {
                    recurringStatus: 'cancelled',
                    expiresAt: new Date()
                }
            });

            expect(cancelledPkg.billingCyclesCompleted).toBe(3);
            expect(cancelledPkg.recurringStatus).toBe('cancelled');
            // 3 remaining cycles cancelled (6 total - 3 completed)
        });

        it('should have all required recurring fields for migration', async () => {
            const { userProfile, employer } = await createTestUser('cancel_g3');
            await createTestInvitation(userProfile.email);
            await storeExclusivePlanEligibility(employer.userId, userProfile.email);

            // Activate the plan
            const pkg = await activateExclusivePlan(employer.userId, `${TEST_PREFIX}TXN_G3_${uniqueId}`);
            expect(pkg).not.toBeNull();
            createdTestData.packageIds.push(pkg.id);

            // Verify all recurring-related fields exist
            expect(pkg).toHaveProperty('isRecurring');
            expect(pkg).toHaveProperty('recurringStatus');
            expect(pkg).toHaveProperty('recurringAmountCents');
            expect(pkg).toHaveProperty('billingCyclesTotal');
            expect(pkg).toHaveProperty('billingCyclesCompleted');
            expect(pkg).toHaveProperty('nextBillingDate');
            expect(pkg).toHaveProperty('arbSubscriptionId');

            // Verify values are correct for migration compatibility
            expect(pkg.isRecurring).toBe(true);
            expect(pkg.recurringAmountCents).toBe(9700); // $97.00
            expect(pkg.billingCyclesTotal).toBe(6);
            expect(typeof pkg.nextBillingDate).toBe('object'); // Date object
        });
    });
});
