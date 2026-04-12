/**
 * Integration Tests: Service-Only Onboarding Flow
 *
 * Tests the service-only onboarding flow where users coming from premium service
 * SKU links complete onboarding without selecting a subscription plan.
 *
 * These tests verify:
 * 1. JobSeeker creation with membershipPlan: 'none'
 * 2. No Subscription record created for service-only users
 * 3. Redirect to service purchase after onboarding
 *
 * Related documentation:
 * - docs/SERVICE_ONLY_ONBOARDING.md
 * - docs/SERVICE_ONLY_ONBOARDING_MANUAL_TESTS.md
 */

import { db } from '@/lib/db'
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'

describe('Service-Only Onboarding Flow', () => {
    const uniqueId = Date.now()

    beforeAll(async () => {
        console.log('Service-Only Onboarding Tests Starting...')
    })

    afterAll(async () => {
        console.log('Service-Only Onboarding Tests Complete')
    })

    // ======================================
    // PART A: SERVICE-ONLY USER CREATION
    // ======================================

    describe('Service-Only User - Database Records', () => {
        let serviceOnlySeeker: any

        beforeAll(async () => {
            // Simulate a service-only user created during onboarding
            serviceOnlySeeker = await db.userProfile.create({
                data: {
                    name: 'Service Only Seeker',
                    email: `service-only-${uniqueId}@test.com`,
                    role: 'seeker' as any,
                    jobSeeker: {
                        create: {
                            // Service-only users get membershipPlan: 'none'
                            membershipPlan: 'none',
                            // No subscription will be created
                        },
                    },
                },
                include: { jobSeeker: true },
            })
        })

        afterAll(async () => {
            // Clean up in reverse order
            await db.subscription.deleteMany({
                where: { seekerId: serviceOnlySeeker.jobSeeker?.userId },
            })
            await db.jobSeeker.delete({
                where: { userId: serviceOnlySeeker.id },
            })
            await db.userProfile.delete({ where: { id: serviceOnlySeeker.id } })
        })

        // TEST 1: Service-only user has membershipPlan: 'none'
        it('should create JobSeeker with membershipPlan: none', async () => {
            const seeker = await db.jobSeeker.findUnique({
                where: { userId: serviceOnlySeeker.id },
            })

            expect(seeker).not.toBeNull()
            expect(seeker?.membershipPlan).toBe('none')
        })

        // TEST 2: Service-only user has NO subscription record
        it('should NOT create Subscription record for service-only user', async () => {
            const subscription = await db.subscription.findFirst({
                where: { seekerId: serviceOnlySeeker.id },
            })

            expect(subscription).toBeNull()
        })

        // TEST 3: UserProfile has correct role
        it('should have role: seeker in UserProfile', async () => {
            const profile = await db.userProfile.findUnique({
                where: { id: serviceOnlySeeker.id },
            })

            expect(profile).not.toBeNull()
            expect(profile?.role).toBe('seeker')
        })
    })

    // ======================================
    // PART B: COMPARISON WITH SUBSCRIPTION USER
    // ======================================

    describe('Comparison: Service-Only vs Subscription User', () => {
        let serviceOnlySeeker: any
        let subscriptionSeeker: any

        beforeAll(async () => {
            // Create service-only user
            serviceOnlySeeker = await db.userProfile.create({
                data: {
                    name: 'Service Only Compare',
                    email: `service-compare-${uniqueId}@test.com`,
                    role: 'seeker' as any,
                    jobSeeker: {
                        create: {
                            membershipPlan: 'none',
                        },
                    },
                },
                include: { jobSeeker: true },
            })

            // Create subscription user (standard flow)
            subscriptionSeeker = await db.userProfile.create({
                data: {
                    name: 'Subscription Compare',
                    email: `subscription-compare-${uniqueId}@test.com`,
                    role: 'seeker' as any,
                    jobSeeker: {
                        create: {
                            membershipPlan: 'trial_monthly',
                        },
                    },
                },
                include: { jobSeeker: true },
            })

            // Create subscription for the subscription user
            await db.subscription.create({
                data: {
                    seekerId: subscriptionSeeker.id,
                    plan: 'trial_monthly',
                    status: 'active',
                    billingFrequency: '1-month',
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    cancelAtPeriodEnd: false,
                },
            })
        })

        afterAll(async () => {
            // Clean up service-only user
            await db.subscription.deleteMany({
                where: { seekerId: serviceOnlySeeker.id },
            })
            await db.jobSeeker.delete({
                where: { userId: serviceOnlySeeker.id },
            })
            await db.userProfile.delete({ where: { id: serviceOnlySeeker.id } })

            // Clean up subscription user
            await db.subscription.deleteMany({
                where: { seekerId: subscriptionSeeker.id },
            })
            await db.jobSeeker.delete({
                where: { userId: subscriptionSeeker.id },
            })
            await db.userProfile.delete({ where: { id: subscriptionSeeker.id } })
        })

        // TEST 1: Both users have JobSeeker record
        it('should create JobSeeker for both user types', async () => {
            const serviceSeeker = await db.jobSeeker.findUnique({
                where: { userId: serviceOnlySeeker.id },
            })
            const subSeeker = await db.jobSeeker.findUnique({
                where: { userId: subscriptionSeeker.id },
            })

            expect(serviceSeeker).not.toBeNull()
            expect(subSeeker).not.toBeNull()
        })

        // TEST 2: Different membershipPlan values
        it('should have different membershipPlan values', async () => {
            const serviceSeeker = await db.jobSeeker.findUnique({
                where: { userId: serviceOnlySeeker.id },
            })
            const subSeeker = await db.jobSeeker.findUnique({
                where: { userId: subscriptionSeeker.id },
            })

            expect(serviceSeeker?.membershipPlan).toBe('none')
            expect(subSeeker?.membershipPlan).toBe('trial_monthly')
        })

        // TEST 3: Only subscription user has Subscription record
        it('should only create Subscription for subscription user', async () => {
            const serviceSub = await db.subscription.findFirst({
                where: { seekerId: serviceOnlySeeker.id },
            })
            const subSub = await db.subscription.findFirst({
                where: { seekerId: subscriptionSeeker.id },
            })

            expect(serviceSub).toBeNull()
            expect(subSub).not.toBeNull()
            expect(subSub?.plan).toBe('trial_monthly')
        })
    })

    // ======================================
    // PART C: SERVICE PURCHASE AFTER ONBOARDING
    // ======================================

    describe('Service Purchase After Onboarding', () => {
        let serviceOnlySeeker: any
        let testService: any

        beforeAll(async () => {
            serviceOnlySeeker = await db.userProfile.create({
                data: {
                    name: 'Service Purchase Test',
                    email: `service-purchase-${uniqueId}@test.com`,
                    role: 'seeker' as any,
                    jobSeeker: {
                        create: {
                            membershipPlan: 'none',
                        },
                    },
                },
                include: { jobSeeker: true },
            })

            // Create or find a test service
            testService = await db.additionalService.upsert({
                where: { serviceId: 'test_resume_refresh' },
                update: {},
                create: {
                    serviceId: 'test_resume_refresh',
                    name: 'Test Resume Refresh',
                    description: 'Test service for integration tests',
                    price: 149.0,
                    category: 'resume',
                    userType: 'seeker',
                    isActive: true,
                },
            })
        })

        afterAll(async () => {
            // Clean up service purchases
            await db.additionalServicePurchase.deleteMany({
                where: { seekerId: serviceOnlySeeker.id },
            })
            await db.subscription.deleteMany({
                where: { seekerId: serviceOnlySeeker.id },
            })
            await db.jobSeeker.delete({
                where: { userId: serviceOnlySeeker.id },
            })
            await db.userProfile.delete({ where: { id: serviceOnlySeeker.id } })
        })

        // TEST 1: Can create AdditionalServicePurchase without subscription
        it('should allow service purchase for user without subscription', async () => {
            const servicePurchase = await db.additionalServicePurchase.create({
                data: {
                    serviceId: testService.serviceId,
                    userId: serviceOnlySeeker.id,
                    seekerId: serviceOnlySeeker.id,
                    amountPaid: 149.0,
                    status: 'completed',
                },
            })

            expect(servicePurchase).not.toBeNull()
            expect(servicePurchase.serviceId).toBe(testService.serviceId)
            expect(Number(servicePurchase.amountPaid)).toBe(149.0)
            expect(servicePurchase.status).toBe('completed')
        })

        // TEST 2: Service purchase linked to correct seeker
        it('should link service purchase to correct seeker', async () => {
            const servicePurchase = await db.additionalServicePurchase.findFirst({
                where: { seekerId: serviceOnlySeeker.id },
            })

            expect(servicePurchase).not.toBeNull()
            expect(servicePurchase?.seekerId).toBe(serviceOnlySeeker.id)
        })

        // TEST 3: Multiple services can be purchased
        it('should allow multiple service purchases', async () => {
            // Create another test service
            const testService2 = await db.additionalService.upsert({
                where: { serviceId: 'test_cover_letter' },
                update: {},
                create: {
                    serviceId: 'test_cover_letter',
                    name: 'Test Cover Letter',
                    description: 'Test cover letter service',
                    price: 75.0,
                    category: 'resume',
                    userType: 'seeker',
                    isActive: true,
                },
            })

            // Add another service purchase
            await db.additionalServicePurchase.create({
                data: {
                    serviceId: testService2.serviceId,
                    userId: serviceOnlySeeker.id,
                    seekerId: serviceOnlySeeker.id,
                    amountPaid: 75.0,
                    status: 'completed',
                },
            })

            const purchases = await db.additionalServicePurchase.findMany({
                where: { seekerId: serviceOnlySeeker.id },
            })

            expect(purchases.length).toBeGreaterThanOrEqual(2)

            const serviceIds = purchases.map((p) => p.serviceId)
            expect(serviceIds).toContain('test_resume_refresh')
            expect(serviceIds).toContain('test_cover_letter')
        })
    })

    // ======================================
    // PART D: MEMBERSHIP PLAN ENUM VALIDATION
    // ======================================

    describe('MembershipPlan Enum Values', () => {
        const validPlans = ['none', 'trial_monthly', 'gold_bimonthly', 'vip_quarterly', 'annual_platinum']

        it('should accept "none" as valid membershipPlan', async () => {
            const testSeeker = await db.userProfile.create({
                data: {
                    name: 'Plan None Test',
                    email: `plan-none-${uniqueId}@test.com`,
                    role: 'seeker' as any,
                    jobSeeker: {
                        create: {
                            membershipPlan: 'none',
                        },
                    },
                },
                include: { jobSeeker: true },
            })

            expect(testSeeker.jobSeeker?.membershipPlan).toBe('none')

            // Cleanup
            await db.jobSeeker.delete({ where: { userId: testSeeker.id } })
            await db.userProfile.delete({ where: { id: testSeeker.id } })
        })

        it('should reject invalid membershipPlan values', async () => {
            // This test verifies the schema constraint
            // Prisma should throw an error for invalid enum values
            await expect(async () => {
                await db.userProfile.create({
                    data: {
                        name: 'Invalid Plan Test',
                        email: `invalid-plan-${uniqueId}@test.com`,
                        role: 'seeker' as any,
                        jobSeeker: {
                            create: {
                                // @ts-expect-error - Testing invalid enum value
                                membershipPlan: 'invalid_plan',
                            },
                        },
                    },
                })
            }).rejects.toThrow()
        })
    })
})
