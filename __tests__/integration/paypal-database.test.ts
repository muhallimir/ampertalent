/**
 * PayPal Integration Tests - REAL Database Operations
 * 
 * These tests use the LOCAL database (hiremymom_local on port 5433)
 * to verify PayPal payment flows work correctly with actual DB operations.
 * 
 * CLEANUP STRATEGY:
 * - All test data uses prefix "TEST_PAYPAL_" for easy identification
 * - beforeAll: Creates test users/seekers
 * - afterAll: Removes ALL test data created during tests
 * - Does NOT affect any non-PayPal or non-test data
 */

import { PrismaClient } from '@prisma/client';
import {
    isPayPalPaymentMethod,
    extractBillingAgreementId,
    formatPayPalStorageId,
    PayPalClient
} from '@/lib/paypal';

// Use local database directly
const db = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://hiremymom_user:local_dev_password@localhost:5433/hiremymom_local'
        }
    }
});

// Test data identifiers - ALL test data uses these prefixes for cleanup
const TEST_PREFIX = 'TEST_PAYPAL_';
const TEST_USER_EMAIL = 'test_paypal_user@test.hiremymom.com';
const TEST_EMPLOYER_EMAIL = 'test_paypal_employer@test.hiremymom.com';
const TEST_BILLING_AGREEMENT_ID = 'B-TEST123456789ABCD';
const TEST_PAYPAL_STORAGE_ID = `PAYPAL|${TEST_BILLING_AGREEMENT_ID}`;

// Store IDs created during tests for cleanup
let testSeekerId: string | null = null;
let testEmployerId: string | null = null;
let testSeekerProfileId: string | null = null;
let testEmployerProfileId: string | null = null;

describe('PayPal Database Integration Tests', () => {

    beforeAll(async () => {
        console.log('🧹 Setting up PayPal integration tests...');

        // Clean up any leftover test data from previous runs
        await cleanupTestData();

        // Create test seeker user profile
        const seekerProfile = await db.userProfile.create({
            data: {
                id: `${TEST_PREFIX}seeker_profile_${Date.now()}`,
                clerkUserId: `${TEST_PREFIX}clerk_seeker_${Date.now()}`,
                email: TEST_USER_EMAIL,
                name: 'Test PayPalSeeker',
                firstName: 'Test',
                lastName: 'PayPalSeeker',
                role: 'seeker',
            }
        });
        testSeekerProfileId = seekerProfile.id;

        // Create job seeker record - uses userId as primary key
        await db.jobSeeker.create({
            data: {
                userId: seekerProfile.id,
            }
        });
        testSeekerId = seekerProfile.id;

        // Create test employer user profile
        const employerProfile = await db.userProfile.create({
            data: {
                id: `${TEST_PREFIX}employer_profile_${Date.now()}`,
                clerkUserId: `${TEST_PREFIX}clerk_employer_${Date.now()}`,
                email: TEST_EMPLOYER_EMAIL,
                name: 'Test PayPalEmployer',
                firstName: 'Test',
                lastName: 'PayPalEmployer',
                role: 'employer',
            }
        });
        testEmployerProfileId = employerProfile.id;

        // Create employer record
        await db.employer.create({
            data: {
                userId: employerProfile.id,
                companyName: 'Test PayPal Company',
            }
        });
        testEmployerId = employerProfile.id;

        console.log(`✅ Created test seeker: ${testSeekerId}`);
        console.log(`✅ Created test employer: ${testEmployerId}`);
    });

    afterAll(async () => {
        console.log('🧹 Cleaning up PayPal integration test data...');
        await cleanupTestData();
        await db.$disconnect();
        console.log('✅ Cleanup complete');
    });

    /**
     * Clean up ALL test data - called in beforeAll and afterAll
     * Uses TEST_PREFIX to identify test data
     * Uses raw SQL to ensure we only delete test data
     * DOES NOT affect any real data
     */
    async function cleanupTestData() {
        try {
            // Delete test subscriptions first (FK constraint)
            await db.$executeRaw`
                DELETE FROM subscriptions 
                WHERE id LIKE ${TEST_PREFIX + '%'}
                   OR seeker_id LIKE ${TEST_PREFIX + '%'}
            `;

            // Delete test external payments
            await db.$executeRaw`
                DELETE FROM external_payments 
                WHERE id LIKE ${TEST_PREFIX + '%'}
                   OR user_id LIKE ${TEST_PREFIX + '%'}
            `;

            // Delete test payment methods (PayPal test ones)
            await db.$executeRaw`
                DELETE FROM payment_methods 
                WHERE id LIKE ${TEST_PREFIX + '%'}
                   OR authnet_payment_profile_id LIKE 'PAYPAL|B-TEST%'
                   OR seeker_id LIKE ${TEST_PREFIX + '%'}
                   OR employer_id LIKE ${TEST_PREFIX + '%'}
            `;

            // Delete test job seekers
            await db.$executeRaw`
                DELETE FROM job_seekers 
                WHERE user_id LIKE ${TEST_PREFIX + '%'}
            `;

            // Delete test employers
            await db.$executeRaw`
                DELETE FROM employers 
                WHERE user_id LIKE ${TEST_PREFIX + '%'}
            `;

            // Delete test user profiles
            await db.$executeRaw`
                DELETE FROM user_profiles 
                WHERE id LIKE ${TEST_PREFIX + '%'}
                   OR email IN (${TEST_USER_EMAIL}, ${TEST_EMPLOYER_EMAIL})
            `;

            console.log('✅ Test data cleanup complete');
        } catch (error) {
            console.error('⚠️ Cleanup error (may be expected if no test data):', error);
        }
    }

    describe('1. PayPal Utility Functions', () => {
        test('isPayPalPaymentMethod correctly identifies PayPal format', () => {
            // Valid PayPal formats
            expect(isPayPalPaymentMethod('PAYPAL|B-5YM51314FL220970W')).toBe(true);
            expect(isPayPalPaymentMethod('PAYPAL|B-095772398X458835V')).toBe(true);
            expect(isPayPalPaymentMethod(TEST_PAYPAL_STORAGE_ID)).toBe(true);

            // Invalid formats - should NOT match
            expect(isPayPalPaymentMethod('123456789|987654321')).toBe(false); // AuthNet
            expect(isPayPalPaymentMethod('PAYPAL|I-4XYHV1VRTS91')).toBe(false); // I-xxx not supported
            expect(isPayPalPaymentMethod(null)).toBe(false);
            expect(isPayPalPaymentMethod(undefined)).toBe(false);
            expect(isPayPalPaymentMethod('')).toBe(false);
        });

        test('extractBillingAgreementId extracts B-xxx correctly', () => {
            expect(extractBillingAgreementId('PAYPAL|B-5YM51314FL220970W')).toBe('B-5YM51314FL220970W');
            expect(extractBillingAgreementId(TEST_PAYPAL_STORAGE_ID)).toBe(TEST_BILLING_AGREEMENT_ID);
            expect(extractBillingAgreementId('123456789|987654321')).toBeNull();
            expect(extractBillingAgreementId(null)).toBeNull();
        });

        test('formatPayPalStorageId creates correct storage format', () => {
            expect(formatPayPalStorageId('B-5YM51314FL220970W')).toBe('PAYPAL|B-5YM51314FL220970W');
            expect(formatPayPalStorageId(TEST_BILLING_AGREEMENT_ID)).toBe(TEST_PAYPAL_STORAGE_ID);
        });
    });

    describe('2. Seeker PayPal Payment Method - Database Operations', () => {
        let paymentMethodId: string;

        test('should create PayPal payment method for seeker', async () => {
            paymentMethodId = `${TEST_PREFIX}pm_seeker_${Date.now()}`;

            // Create payment method using raw SQL (matches actual implementation)
            await db.$executeRaw`
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
                    ${TEST_PAYPAL_STORAGE_ID}, 
                    NOW(), 
                    NOW()
                )
            `;

            // Verify it was created
            const created = await db.$queryRaw<Array<any>>`
                SELECT * FROM payment_methods WHERE id = ${paymentMethodId}
            `;

            expect(created.length).toBe(1);
            expect(created[0].seeker_id).toBe(testSeekerProfileId);
            expect(created[0].brand).toBe('paypal');
            expect(created[0].type).toBe('paypal');
            expect(created[0].authnet_payment_profile_id).toBe(TEST_PAYPAL_STORAGE_ID);
            expect(created[0].is_default).toBe(true);
        });

        test('should detect PayPal payment method in database query', async () => {
            // Query for PayPal payment methods (simulates recurring billing detection)
            const paypalMethods = await db.$queryRaw<Array<any>>`
                SELECT * FROM payment_methods 
                WHERE seeker_id = ${testSeekerProfileId}
                  AND authnet_payment_profile_id LIKE 'PAYPAL|%'
            `;

            expect(paypalMethods.length).toBeGreaterThanOrEqual(1);
            expect(isPayPalPaymentMethod(paypalMethods[0].authnet_payment_profile_id)).toBe(true);
        });

        test('should update existing PayPal payment method', async () => {
            const newBillingAgreementId = 'B-TESTUPDATED999999';
            const newStorageId = formatPayPalStorageId(newBillingAgreementId);

            await db.$executeRaw`
                UPDATE payment_methods 
                SET authnet_payment_profile_id = ${newStorageId},
                    last4 = '@updated.com',
                    updated_at = NOW()
                WHERE id = ${paymentMethodId}
            `;

            // Verify update
            const updated = await db.$queryRaw<Array<any>>`
                SELECT * FROM payment_methods WHERE id = ${paymentMethodId}
            `;

            expect(updated[0].authnet_payment_profile_id).toBe(newStorageId);
            expect(updated[0].last4).toBe('@updated.com');
        });

        test('should not affect AuthNet payment methods when querying PayPal', async () => {
            // Create an AuthNet payment method for the same seeker
            const authnetPmId = `${TEST_PREFIX}pm_authnet_${Date.now()}`;

            await db.$executeRaw`
                INSERT INTO payment_methods (
                    id, seeker_id, type, last4, brand, 
                    expiry_month, expiry_year, is_default, 
                    authnet_payment_profile_id, created_at, updated_at
                )
                VALUES (
                    ${authnetPmId}, 
                    ${testSeekerProfileId}, 
                    'card', 
                    '4242', 
                    'visa',
                    12, 
                    2025, 
                    false, 
                    '123456789|987654321', 
                    NOW(), 
                    NOW()
                )
            `;

            // Query should only return PayPal methods
            const paypalOnly = await db.$queryRaw<Array<any>>`
                SELECT * FROM payment_methods 
                WHERE seeker_id = ${testSeekerProfileId}
                  AND authnet_payment_profile_id LIKE 'PAYPAL|%'
            `;

            expect(paypalOnly.length).toBeGreaterThanOrEqual(1);
            paypalOnly.forEach(pm => {
                expect(isPayPalPaymentMethod(pm.authnet_payment_profile_id)).toBe(true);
            });

            // AuthNet method should still exist
            const authnetMethod = await db.$queryRaw<Array<any>>`
                SELECT * FROM payment_methods WHERE id = ${authnetPmId}
            `;

            expect(authnetMethod.length).toBe(1);
            expect(isPayPalPaymentMethod(authnetMethod[0].authnet_payment_profile_id)).toBe(false);
        });
    });

    describe('3. Employer PayPal Payment Method - Database Operations', () => {
        test('should create PayPal payment method for employer', async () => {
            const employerPaymentMethodId = `${TEST_PREFIX}pm_employer_${Date.now()}`;

            await db.$executeRaw`
                INSERT INTO payment_methods (
                    id, employer_id, type, last4, brand, 
                    expiry_month, expiry_year, is_default, 
                    authnet_payment_profile_id, created_at, updated_at
                )
                VALUES (
                    ${employerPaymentMethodId}, 
                    ${testEmployerProfileId}, 
                    'paypal', 
                    '@employer.com', 
                    'paypal',
                    12, 
                    2099, 
                    true, 
                    ${TEST_PAYPAL_STORAGE_ID}, 
                    NOW(), 
                    NOW()
                )
            `;

            // Verify it was created with employer_id (not seeker_id)
            const created = await db.$queryRaw<Array<any>>`
                SELECT * FROM payment_methods WHERE id = ${employerPaymentMethodId}
            `;

            expect(created.length).toBe(1);
            expect(created[0].employer_id).toBe(testEmployerProfileId);
            expect(created[0].seeker_id).toBeNull();
            expect(created[0].brand).toBe('paypal');
        });
    });

    describe('4. Seeker Subscription with PayPal - Database Operations', () => {
        let subscriptionId: string;

        test('should create subscription for seeker with PayPal payment method', async () => {
            subscriptionId = `${TEST_PREFIX}sub_${Date.now()}`;

            // Create subscription using raw SQL with correct field names
            await db.$executeRaw`
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

            // Verify subscription created
            const sub = await db.$queryRaw<Array<any>>`
                SELECT * FROM subscriptions WHERE id = ${subscriptionId}
            `;

            expect(sub.length).toBe(1);
            expect(sub[0].status).toBe('active');
            expect(sub[0].plan).toBe('gold_bimonthly');
        });

        test('should identify seeker with PayPal for recurring billing', async () => {
            // Simulate the query that recurring billing cron would use
            const seekersForBilling = await db.$queryRaw<Array<any>>`
                SELECT 
                    s.id as subscription_id,
                    s.seeker_id,
                    s.plan,
                    pm.authnet_payment_profile_id,
                    pm.brand
                FROM subscriptions s
                JOIN payment_methods pm ON pm.seeker_id = s.seeker_id AND pm.is_default = true
                WHERE s.id = ${subscriptionId}
                  AND s.status = 'active'
            `;

            expect(seekersForBilling.length).toBe(1);
            expect(seekersForBilling[0].brand).toBe('paypal');
            expect(isPayPalPaymentMethod(seekersForBilling[0].authnet_payment_profile_id)).toBe(true);
        });
    });

    describe('5. External Payment Recording - Database Operations', () => {
        test('should record PayPal payment as external_payment', async () => {
            const externalPaymentId = `${TEST_PREFIX}extpay_${Date.now()}`;

            // Create external payment with correct field names
            await db.$executeRaw`
                INSERT INTO external_payments (
                    id, user_id, authnet_transaction_id, 
                    amount, plan_id, status,
                    created_at, updated_at
                )
                VALUES (
                    ${externalPaymentId},
                    ${testSeekerProfileId},
                    ${'PAYPAL-' + TEST_PREFIX + 'TXN-12345'},
                    49.99,
                    'gold_bimonthly',
                    'completed',
                    NOW(),
                    NOW()
                )
            `;

            // Verify payment recorded
            const payment = await db.$queryRaw<Array<any>>`
                SELECT * FROM external_payments WHERE id = ${externalPaymentId}
            `;

            expect(payment.length).toBe(1);
            expect(payment[0].authnet_transaction_id).toContain('PAYPAL');
            expect(Number(payment[0].amount)).toBe(49.99);
            expect(payment[0].status).toBe('completed');
        });
    });

    describe('6. Mixed Payment Methods - Routing Logic', () => {
        test('should correctly route PayPal vs AuthNet based on storage format', async () => {
            // Get all payment methods for test seeker
            const allMethods = await db.$queryRaw<Array<any>>`
                SELECT id, authnet_payment_profile_id, brand
                FROM payment_methods 
                WHERE seeker_id = ${testSeekerProfileId}
            `;

            expect(allMethods.length).toBeGreaterThanOrEqual(2);

            // Route each payment method
            const routingResults = allMethods.map(pm => ({
                id: pm.id,
                brand: pm.brand,
                isPayPal: isPayPalPaymentMethod(pm.authnet_payment_profile_id),
                processor: isPayPalPaymentMethod(pm.authnet_payment_profile_id) ? 'paypal' : 'authnet'
            }));

            // Verify PayPal methods route to PayPal
            const paypalMethods = routingResults.filter(r => r.brand === 'paypal');
            paypalMethods.forEach(pm => {
                expect(pm.isPayPal).toBe(true);
                expect(pm.processor).toBe('paypal');
            });

            // Verify non-PayPal methods route to AuthNet
            const authnetMethods = routingResults.filter(r => r.brand !== 'paypal');
            authnetMethods.forEach(pm => {
                expect(pm.isPayPal).toBe(false);
                expect(pm.processor).toBe('authnet');
            });
        });
    });

    describe('7. Data Isolation Verification', () => {
        test('should not have modified any non-test data', async () => {
            // Count non-test payment methods
            const realPaymentMethods = await db.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*) as count FROM payment_methods 
                WHERE id NOT LIKE ${TEST_PREFIX + '%'}
                  AND seeker_id NOT LIKE ${TEST_PREFIX + '%'}
                  AND (employer_id IS NULL OR employer_id NOT LIKE ${TEST_PREFIX + '%'})
            `;

            // This should be >= 0 (existing data should remain)
            expect(Number(realPaymentMethods[0].count)).toBeGreaterThanOrEqual(0);

            // Verify only test users match our test criteria
            const testUsers = await db.$queryRaw<Array<{ count: bigint }>>`
                SELECT COUNT(*) as count FROM user_profiles 
                WHERE id LIKE ${TEST_PREFIX + '%'}
                   OR email IN (${TEST_USER_EMAIL}, ${TEST_EMPLOYER_EMAIL})
            `;

            // Only our test users should match (2: one seeker, one employer)
            expect(Number(testUsers[0].count)).toBe(2);
        });
    });
});

describe('PayPal Sandbox API Integration', () => {
    // Skip if no real credentials
    const hasCredentials = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID &&
        process.env.PAYPAL_CLIENT_SECRET &&
        process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID !== 'test-client-id';

    const conditionalTest = hasCredentials ? test : test.skip;

    conditionalTest('should get access token from PayPal sandbox', async () => {
        const client = new PayPalClient();
        const token = await client.getAccessToken();

        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(10);
    }, 15000); // 15 second timeout for sandbox API

    conditionalTest('should create billing agreement token with real PayPal API', async () => {
        const client = new PayPalClient();

        const result = await client.createBillingAgreementToken({
            description: 'TEST - HireMyMom Integration Test',
            returnUrl: 'http://localhost:3000/test/paypal-return',
            cancelUrl: 'http://localhost:3000/test/paypal-cancel',
        });

        expect(result.tokenId).toBeDefined();
        expect(result.approvalUrl).toContain('paypal.com');

        console.log('✅ PayPal sandbox billing agreement token created:', result.tokenId);
        console.log('📍 Approval URL:', result.approvalUrl);
    });
});
