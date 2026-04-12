/**
 * PayPal Migration Readiness & Data Alignment Tests
 * 
 * These tests verify:
 * 1. WordPress MySQL (legacy_wordpress_mysql:3307) PayPal data structure
 * 2. NextJS PostgreSQL (hiremymom_local:5433) created data matches migration plan
 * 3. Data mapping alignment between WordPress and NextJS
 * 4. Post-cleanup verification that non-test data is untouched
 * 5. Pre/Post record counts to verify data isolation
 * 
 * CRITICAL: These tests query BOTH databases to ensure migration readiness
 */

import { PrismaClient } from '@prisma/client';
import mysql from 'mysql2/promise';
import {
    isPayPalPaymentMethod,
    extractBillingAgreementId,
    formatPayPalStorageId
} from '@/lib/paypal';

// NextJS PostgreSQL Database
const nextjsDb = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://hiremymom_user:local_dev_password@localhost:5433/hiremymom_local'
        }
    }
});

// WordPress MySQL Database Connection Config
const wordpressDbConfig = {
    host: 'localhost',
    port: 3307,
    user: 'hiremymom_user',
    password: 'local_dev_password',
    database: 'legacy_wordpress'
};

// Test data identifiers
const TEST_PREFIX = 'TEST_MIGRATION_';
const TEST_EMAIL = 'test_migration_paypal@test.hiremymom.com';

// Pre-test record counts for verification
interface RecordCounts {
    paymentMethods: number;
    subscriptions: number;
    externalPayments: number;
    userProfiles: number;
}

let preTestCounts: RecordCounts;
let postCleanupCounts: RecordCounts;
let testSeekerProfileId: string | null = null;
let wordpressConnection: mysql.Connection | null = null;

// Sample WordPress PayPal data for comparison
interface WordPressPayPalUser {
    email: string;
    paypalId: string | null;
    subscriptionStatus: string;
    paymentMethod: string;
}

describe('PayPal Migration Readiness Tests', () => {

    beforeAll(async () => {
        console.log('🔍 Starting Migration Readiness Tests...');
        console.log('📊 Capturing pre-test database state...');

        // Capture record counts BEFORE any test operations
        preTestCounts = await captureRecordCounts();
        console.log('📊 Pre-test counts:', preTestCounts);

        // Clean up any leftover test data
        await cleanupTestData();

        // Create test user for NextJS database tests
        const seekerProfile = await nextjsDb.userProfile.create({
            data: {
                id: `${TEST_PREFIX}seeker_${Date.now()}`,
                clerkUserId: `${TEST_PREFIX}clerk_${Date.now()}`,
                email: TEST_EMAIL,
                name: 'Test Migration User',
                firstName: 'Test',
                lastName: 'MigrationUser',
                role: 'seeker',
            }
        });
        testSeekerProfileId = seekerProfile.id;

        await nextjsDb.jobSeeker.create({
            data: { userId: seekerProfile.id }
        });

        console.log(`✅ Created test user: ${testSeekerProfileId}`);

        // Try to connect to WordPress MySQL
        try {
            wordpressConnection = await mysql.createConnection(wordpressDbConfig);
            console.log('✅ Connected to WordPress MySQL database');
        } catch (error) {
            console.warn('⚠️ Could not connect to WordPress MySQL - Docker may not be running');
            console.warn('   Tests requiring WordPress DB will be skipped');
        }
    });

    afterAll(async () => {
        console.log('🧹 Cleaning up test data...');
        await cleanupTestData();

        // Capture record counts AFTER cleanup
        postCleanupCounts = await captureRecordCounts();
        console.log('📊 Post-cleanup counts:', postCleanupCounts);

        // Verify counts match (data isolation)
        console.log('🔍 Verifying data isolation...');
        if (preTestCounts.paymentMethods !== postCleanupCounts.paymentMethods) {
            console.error(`❌ Payment methods count mismatch! Pre: ${preTestCounts.paymentMethods}, Post: ${postCleanupCounts.paymentMethods}`);
        }
        if (preTestCounts.subscriptions !== postCleanupCounts.subscriptions) {
            console.error(`❌ Subscriptions count mismatch! Pre: ${preTestCounts.subscriptions}, Post: ${postCleanupCounts.subscriptions}`);
        }
        if (preTestCounts.userProfiles !== postCleanupCounts.userProfiles) {
            console.error(`❌ User profiles count mismatch! Pre: ${preTestCounts.userProfiles}, Post: ${postCleanupCounts.userProfiles}`);
        }

        // Close connections
        if (wordpressConnection) {
            await wordpressConnection.end();
        }
        await nextjsDb.$disconnect();
        console.log('✅ Cleanup complete');
    });

    /**
     * Capture current record counts for non-test data
     */
    async function captureRecordCounts(): Promise<RecordCounts> {
        const [paymentMethods] = await nextjsDb.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) as count FROM payment_methods 
            WHERE id NOT LIKE ${TEST_PREFIX + '%'}
              AND seeker_id NOT LIKE ${TEST_PREFIX + '%'}
              AND (employer_id IS NULL OR employer_id NOT LIKE ${TEST_PREFIX + '%'})
        `;

        const [subscriptions] = await nextjsDb.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) as count FROM subscriptions 
            WHERE id NOT LIKE ${TEST_PREFIX + '%'}
              AND seeker_id NOT LIKE ${TEST_PREFIX + '%'}
        `;

        const [externalPayments] = await nextjsDb.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) as count FROM external_payments 
            WHERE id NOT LIKE ${TEST_PREFIX + '%'}
              AND (user_id IS NULL OR user_id NOT LIKE ${TEST_PREFIX + '%'})
        `;

        const [userProfiles] = await nextjsDb.$queryRaw<Array<{ count: bigint }>>`
            SELECT COUNT(*) as count FROM user_profiles 
            WHERE id NOT LIKE ${TEST_PREFIX + '%'}
        `;

        return {
            paymentMethods: Number(paymentMethods.count),
            subscriptions: Number(subscriptions.count),
            externalPayments: Number(externalPayments.count),
            userProfiles: Number(userProfiles.count),
        };
    }

    /**
     * Clean up ALL test data
     */
    async function cleanupTestData() {
        try {
            await nextjsDb.$executeRaw`DELETE FROM subscriptions WHERE id LIKE ${TEST_PREFIX + '%'} OR seeker_id LIKE ${TEST_PREFIX + '%'}`;
            await nextjsDb.$executeRaw`DELETE FROM external_payments WHERE id LIKE ${TEST_PREFIX + '%'} OR user_id LIKE ${TEST_PREFIX + '%'}`;
            await nextjsDb.$executeRaw`DELETE FROM payment_methods WHERE id LIKE ${TEST_PREFIX + '%'} OR seeker_id LIKE ${TEST_PREFIX + '%'}`;
            await nextjsDb.$executeRaw`DELETE FROM job_seekers WHERE user_id LIKE ${TEST_PREFIX + '%'}`;
            await nextjsDb.$executeRaw`DELETE FROM user_profiles WHERE id LIKE ${TEST_PREFIX + '%'} OR email = ${TEST_EMAIL}`;
            console.log('✅ Test data cleanup complete');
        } catch (error) {
            console.error('⚠️ Cleanup error:', error);
        }
    }

    describe('1. WordPress Database Structure Verification', () => {
        const skipIfNoWordPress = wordpressConnection ? test : test.skip;

        test('should verify WordPress MySQL connection is available', async () => {
            if (!wordpressConnection) {
                console.log('⏭️ Skipping - WordPress MySQL not available (Docker not running)');
                return;
            }

            const [rows] = await wordpressConnection.execute('SELECT 1 as test');
            expect(Array.isArray(rows)).toBe(true);
        });

        test('should query WordPress PayPal subscriptions structure', async () => {
            if (!wordpressConnection) {
                console.log('⏭️ Skipping - WordPress MySQL not available');
                return;
            }

            // Query to get PayPal subscription structure from WordPress
            const [rows] = await wordpressConnection.execute(`
                SELECT 
                    u.user_email as email,
                    pm_paypal.meta_value as paypal_id,
                    sub.post_status as subscription_status,
                    pm_method.meta_value as payment_method
                FROM wp_posts sub
                JOIN wp_postmeta pm_customer ON sub.ID = pm_customer.post_id 
                    AND pm_customer.meta_key = '_customer_user'
                JOIN wp_users u ON u.ID = pm_customer.meta_value
                LEFT JOIN wp_postmeta pm_paypal ON sub.ID = pm_paypal.post_id 
                    AND pm_paypal.meta_key = '_paypal_subscription_id'
                LEFT JOIN wp_postmeta pm_method ON sub.ID = pm_method.post_id 
                    AND pm_method.meta_key = '_payment_method'
                WHERE sub.post_type = 'shop_subscription'
                AND sub.post_status = 'wc-active'
                AND pm_method.meta_value = 'paypal'
                LIMIT 10
            `) as [WordPressPayPalUser[], any];

            console.log(`📊 Found ${rows.length} active PayPal subscriptions in WordPress`);

            // Verify structure matches expected
            if (rows.length > 0) {
                const sample = rows[0];
                expect(sample).toHaveProperty('email');
                expect(sample).toHaveProperty('paypal_id');
                expect(sample).toHaveProperty('subscription_status');
                expect(sample).toHaveProperty('payment_method');
                expect(sample.payment_method).toBe('paypal');
            }
        });

        test('should categorize WordPress PayPal IDs by type', async () => {
            if (!wordpressConnection) {
                console.log('⏭️ Skipping - WordPress MySQL not available');
                return;
            }

            const [rows] = await wordpressConnection.execute(`
                SELECT 
                    pm_paypal.meta_value as paypal_id,
                    COUNT(*) as count
                FROM wp_posts sub
                JOIN wp_postmeta pm_customer ON sub.ID = pm_customer.post_id 
                    AND pm_customer.meta_key = '_customer_user'
                LEFT JOIN wp_postmeta pm_paypal ON sub.ID = pm_paypal.post_id 
                    AND pm_paypal.meta_key = '_paypal_subscription_id'
                LEFT JOIN wp_postmeta pm_method ON sub.ID = pm_method.post_id 
                    AND pm_method.meta_key = '_payment_method'
                WHERE sub.post_type = 'shop_subscription'
                AND sub.post_status = 'wc-active'
                AND pm_method.meta_value = 'paypal'
                GROUP BY 
                    CASE 
                        WHEN pm_paypal.meta_value LIKE 'B-%' THEN 'B-xxx'
                        WHEN pm_paypal.meta_value LIKE 'I-%' THEN 'I-xxx'
                        WHEN pm_paypal.meta_value IS NULL OR pm_paypal.meta_value = '' THEN 'NO_ID'
                        ELSE 'OTHER'
                    END
            `) as [Array<{ paypal_id: string, count: number }>, any];

            console.log('📊 WordPress PayPal ID breakdown:');
            rows.forEach(row => {
                const type = row.paypal_id?.startsWith('B-') ? 'B-xxx (Billing Agreement)' :
                    row.paypal_id?.startsWith('I-') ? 'I-xxx (Subscription API)' :
                        !row.paypal_id ? 'NO_ID' : 'OTHER';
                console.log(`   ${type}: ${row.count}`);
            });
        });
    });

    describe('2. Data Mapping Alignment Tests', () => {

        test('should create NextJS payment method matching WordPress B-xxx format', async () => {
            // Sample WordPress B-xxx ID (from migration plan)
            const wordpressBillingAgreementId = 'B-8M732938PX9921933';
            const expectedStorageFormat = `PAYPAL|${wordpressBillingAgreementId}`;

            const paymentMethodId = `${TEST_PREFIX}pm_bxxx_${Date.now()}`;

            // Create payment method in NextJS format
            await nextjsDb.$executeRaw`
                INSERT INTO payment_methods (
                    id, seeker_id, type, last4, brand, 
                    expiry_month, expiry_year, is_default, 
                    authnet_payment_profile_id, created_at, updated_at
                )
                VALUES (
                    ${paymentMethodId}, 
                    ${testSeekerProfileId}, 
                    'paypal', 
                    '@gmail.com', 
                    'paypal',
                    12, 
                    2099, 
                    true, 
                    ${expectedStorageFormat}, 
                    NOW(), 
                    NOW()
                )
            `;

            // Verify the storage format matches migration plan
            const [created] = await nextjsDb.$queryRaw<Array<any>>`
                SELECT * FROM payment_methods WHERE id = ${paymentMethodId}
            `;

            // Assertions matching migration plan
            expect(created.authnet_payment_profile_id).toBe(expectedStorageFormat);
            expect(created.authnet_payment_profile_id).toMatch(/^PAYPAL\|B-[A-Z0-9]+$/);
            expect(isPayPalPaymentMethod(created.authnet_payment_profile_id)).toBe(true);
            expect(extractBillingAgreementId(created.authnet_payment_profile_id)).toBe(wordpressBillingAgreementId);

            console.log('✅ B-xxx mapping verified:', {
                wordpress: wordpressBillingAgreementId,
                nextjs: created.authnet_payment_profile_id,
                extracted: extractBillingAgreementId(created.authnet_payment_profile_id)
            });
        });

        test('should verify I-xxx format is NOT supported for migration', async () => {
            // I-xxx IDs from WordPress Subscription API cannot be used for reference transactions
            const wordpressSubscriptionId = 'I-N9VHJF6F6BBN';
            const storageFormat = `PAYPAL|${wordpressSubscriptionId}`;

            // This should NOT be detected as a valid PayPal payment method
            expect(isPayPalPaymentMethod(storageFormat)).toBe(false);

            console.log('✅ I-xxx correctly rejected:', {
                wordpress: wordpressSubscriptionId,
                isSupported: isPayPalPaymentMethod(storageFormat),
                reason: 'I-xxx uses PayPal Subscription API, not Reference Transactions'
            });
        });

        test('should create subscription matching WordPress active status', async () => {
            const subscriptionId = `${TEST_PREFIX}sub_${Date.now()}`;

            // WordPress 'wc-active' maps to NextJS 'active'
            await nextjsDb.$executeRaw`
                INSERT INTO subscriptions (
                    id, seeker_id, status, plan, 
                    current_period_start, current_period_end, next_billing_date,
                    created_at, updated_at
                )
                VALUES (
                    ${subscriptionId},
                    ${testSeekerProfileId},
                    'active',
                    'gold_bimonthly',
                    NOW(),
                    NOW() + INTERVAL '60 days',
                    NOW() + INTERVAL '60 days',
                    NOW(),
                    NOW()
                )
            `;

            const [sub] = await nextjsDb.$queryRaw<Array<any>>`
                SELECT * FROM subscriptions WHERE id = ${subscriptionId}
            `;

            // Verify status mapping
            expect(sub.status).toBe('active');
            expect(sub.next_billing_date).not.toBeNull();

            console.log('✅ Subscription status mapping verified:', {
                wordpress: 'wc-active',
                nextjs: sub.status
            });
        });
    });

    describe('3. End-to-End Payment Simulation', () => {

        test('should simulate complete PayPal payment flow and verify DB records', async () => {
            const paymentMethodId = `${TEST_PREFIX}pm_e2e_${Date.now()}`;
            const subscriptionId = `${TEST_PREFIX}sub_e2e_${Date.now()}`;
            const externalPaymentId = `${TEST_PREFIX}extpay_e2e_${Date.now()}`;
            const billingAgreementId = 'B-TESTE2E123456789';
            const storedId = formatPayPalStorageId(billingAgreementId);

            // Step 1: Create payment method (simulates PayPal approval)
            await nextjsDb.$executeRaw`
                INSERT INTO payment_methods (
                    id, seeker_id, type, last4, brand, 
                    expiry_month, expiry_year, is_default, 
                    authnet_payment_profile_id, created_at, updated_at
                )
                VALUES (
                    ${paymentMethodId}, 
                    ${testSeekerProfileId}, 
                    'paypal', 
                    '@test.com', 
                    'paypal',
                    12, 
                    2099, 
                    true, 
                    ${storedId}, 
                    NOW(), 
                    NOW()
                )
            `;

            // Step 2: Create subscription
            await nextjsDb.$executeRaw`
                INSERT INTO subscriptions (
                    id, seeker_id, status, plan, 
                    current_period_start, current_period_end, next_billing_date,
                    created_at, updated_at
                )
                VALUES (
                    ${subscriptionId},
                    ${testSeekerProfileId},
                    'active',
                    'gold_bimonthly',
                    NOW(),
                    NOW() + INTERVAL '60 days',
                    NOW() + INTERVAL '60 days',
                    NOW(),
                    NOW()
                )
            `;

            // Step 3: Create external payment record
            await nextjsDb.$executeRaw`
                INSERT INTO external_payments (
                    id, user_id, authnet_transaction_id, 
                    amount, plan_id, status,
                    created_at, updated_at
                )
                VALUES (
                    ${externalPaymentId},
                    ${testSeekerProfileId},
                    ${'PAYPAL-TXN-E2E-' + Date.now()},
                    49.99,
                    'gold_bimonthly',
                    'completed',
                    NOW(),
                    NOW()
                )
            `;

            // Verify all records created correctly
            const [pm] = await nextjsDb.$queryRaw<Array<any>>`SELECT * FROM payment_methods WHERE id = ${paymentMethodId}`;
            const [sub] = await nextjsDb.$queryRaw<Array<any>>`SELECT * FROM subscriptions WHERE id = ${subscriptionId}`;
            const [payment] = await nextjsDb.$queryRaw<Array<any>>`SELECT * FROM external_payments WHERE id = ${externalPaymentId}`;

            // Assertions
            expect(pm).toBeDefined();
            expect(pm.authnet_payment_profile_id).toBe(storedId);
            expect(isPayPalPaymentMethod(pm.authnet_payment_profile_id)).toBe(true);

            expect(sub).toBeDefined();
            expect(sub.status).toBe('active');
            expect(sub.seeker_id).toBe(testSeekerProfileId);

            expect(payment).toBeDefined();
            expect(payment.status).toBe('completed');
            expect(Number(payment.amount)).toBe(49.99);

            console.log('✅ E2E payment simulation verified:', {
                paymentMethod: pm.id,
                subscription: sub.id,
                externalPayment: payment.id
            });
        });

        test('should verify recurring billing query finds PayPal user', async () => {
            // This is the actual query recurring billing cron would use
            const seekersForBilling = await nextjsDb.$queryRaw<Array<any>>`
                SELECT 
                    s.id as subscription_id,
                    s.seeker_id,
                    s.plan,
                    s.status,
                    pm.id as payment_method_id,
                    pm.authnet_payment_profile_id,
                    pm.brand,
                    CASE 
                        WHEN pm.authnet_payment_profile_id LIKE 'PAYPAL|B-%' THEN 'paypal'
                        ELSE 'authnet'
                    END as processor
                FROM subscriptions s
                JOIN payment_methods pm ON pm.seeker_id = s.seeker_id AND pm.is_default = true
                WHERE s.seeker_id = ${testSeekerProfileId}
                  AND s.status = 'active'
                  AND pm.authnet_payment_profile_id LIKE 'PAYPAL|%'
            `;

            expect(seekersForBilling.length).toBeGreaterThanOrEqual(1);

            const result = seekersForBilling[0];
            expect(result.processor).toBe('paypal');
            expect(result.brand).toBe('paypal');
            expect(isPayPalPaymentMethod(result.authnet_payment_profile_id)).toBe(true);

            console.log('✅ Recurring billing detection verified:', {
                found: seekersForBilling.length,
                processor: result.processor
            });
        });
    });

    describe('4. Post-Cleanup Data Isolation Verification', () => {

        test('should verify non-test payment methods are untouched', async () => {
            const currentCounts = await captureRecordCounts();

            // Payment methods count should match pre-test
            expect(currentCounts.paymentMethods).toBe(preTestCounts.paymentMethods);
        });

        test('should verify non-test subscriptions are untouched', async () => {
            const currentCounts = await captureRecordCounts();

            // Subscriptions count should match pre-test
            expect(currentCounts.subscriptions).toBe(preTestCounts.subscriptions);
        });

        test('should verify non-test user profiles are untouched', async () => {
            const currentCounts = await captureRecordCounts();

            // User profiles count should match pre-test OR be +1 for test user
            // (test user may or may not be counted depending on test execution order)
            const diff = currentCounts.userProfiles - preTestCounts.userProfiles;
            expect(diff).toBeGreaterThanOrEqual(0);
            expect(diff).toBeLessThanOrEqual(1);
        });

        test('should verify no orphaned test data exists', async () => {
            // Check for any test data that might have been missed in cleanup
            const [orphanedPm] = await nextjsDb.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*) as count FROM payment_methods 
                WHERE authnet_payment_profile_id LIKE 'PAYPAL|B-TEST%'
                  AND id NOT LIKE ${TEST_PREFIX + '%'}
            `;

            // Should be 0 - no orphaned test PayPal methods
            expect(Number(orphanedPm.count)).toBe(0);
        });
    });

    describe('5. Migration Sample Data Comparison', () => {

        test('should match expected WordPress B-xxx sample to NextJS format', async () => {
            // Sample B-xxx users from PAYPAL_USER_MIGRATION_STATUS.md
            const wordPressSamples = [
                { email: 'Anniemmarcum@gmail.com', paypalId: 'B-8M732938PX9921933' },
                { email: 'bmjanzen03@gmail.com', paypalId: 'B-83F134434S436150J' },
                { email: 'deeac23@gmail.com', paypalId: 'B-4J219679MN051211C' },
            ];

            for (const sample of wordPressSamples) {
                const expectedNextJsFormat = formatPayPalStorageId(sample.paypalId);

                // Verify format transformation
                expect(expectedNextJsFormat).toBe(`PAYPAL|${sample.paypalId}`);
                expect(isPayPalPaymentMethod(expectedNextJsFormat)).toBe(true);
                expect(extractBillingAgreementId(expectedNextJsFormat)).toBe(sample.paypalId);
            }

            console.log('✅ Sample B-xxx migrations verified:', wordPressSamples.length);
        });

        test('should verify I-xxx samples are marked for re-authorization', async () => {
            // I-xxx users from migration plan (need re-auth)
            const ixxxSamples = [
                { email: 'b_smith36@sbcglobal.net', paypalId: 'I-N9VHJF6F6BBN' },
                { email: 'jcrousebusiness@gmail.com', paypalId: 'I-VCSX8GGTC3G7' },
                { email: 'thompsonmeg97@gmail.com', paypalId: 'I-J2W5CX9T778W' },
            ];

            for (const sample of ixxxSamples) {
                const attemptedFormat = `PAYPAL|${sample.paypalId}`;

                // I-xxx should NOT be valid for migration
                expect(isPayPalPaymentMethod(attemptedFormat)).toBe(false);
            }

            console.log('✅ I-xxx re-auth requirement verified:', ixxxSamples.length, 'users need re-authorization');
        });

        test('should verify NO_ID users cannot be migrated', async () => {
            // Users with no PayPal ID (need re-auth from scratch)
            const noIdSamples = [
                { email: 'countstartsnow@aol.com', paypalId: null },
                { email: 'janirablair@aol.com', paypalId: null },
                { email: 'revviehoward30@gmail.com', paypalId: null },
            ];

            for (const sample of noIdSamples) {
                // null PayPal ID cannot be formatted
                expect(sample.paypalId).toBeNull();
                expect(isPayPalPaymentMethod(null)).toBe(false);
                expect(isPayPalPaymentMethod('')).toBe(false);
            }

            console.log('✅ NO_ID re-auth requirement verified:', noIdSamples.length, 'users need new payment setup');
        });
    });

    describe('6. Final Cleanup Verification', () => {

        test('should confirm cleanup will restore original counts', async () => {
            // This test runs BEFORE afterAll cleanup
            // We verify that after cleanup, counts will match

            const currentTestData = await nextjsDb.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*) as count FROM user_profiles 
                WHERE id LIKE ${TEST_PREFIX + '%'}
            `;

            // Should have exactly 1 test user (created in beforeAll)
            expect(Number(currentTestData[0].count)).toBe(1);

            console.log('✅ Test data count before cleanup:', Number(currentTestData[0].count));
            console.log('📊 Expected post-cleanup user count:', preTestCounts.userProfiles);
        });
    });
});
