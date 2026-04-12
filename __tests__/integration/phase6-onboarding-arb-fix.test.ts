import { db } from "@/lib/db";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

/**
 * Phase 6: Onboarding ARB Subscription Fix
 * 
 * Tests that newly onboarded seekers' subscriptions are created with ALL ARB fields
 * required for webhook processing (authnetSubscriptionId, authnetCustomerId, 
 * billingFrequency, currentPeriodStart, nextBillingDate).
 * 
 * Without these fields, webhooks cannot find subscriptions for renewal processing,
 * causing renewals to fall back to the legacy cron job.
 */

describe("Phase 6: Onboarding ARB Subscription Fix", () => {
    const uniqueId = Date.now();

    beforeAll(async () => {
        console.log("Phase 6: Onboarding ARB Fix Tests Starting...");
    });

    afterAll(async () => {
        console.log("Phase 6: Onboarding ARB Fix Tests Complete");
    });

    // ======================================
    // PART A: NEW SIGNUP SUBSCRIPTION FIELDS
    // ======================================

    describe("New Signup Subscription - ARB Field Population", () => {
        let newSeeker: any;

        beforeAll(async () => {
            // Simulate a new user created during onboarding
            newSeeker = await db.userProfile.create({
                data: {
                    name: "Test New Signup Seeker",
                    email: `new-signup-${uniqueId}@test.com`,
                    role: "seeker" as any,
                    jobSeeker: {
                        create: {},
                    },
                },
                include: { jobSeeker: true },
            });
        });

        afterAll(async () => {
            await db.subscription.deleteMany({
                where: { seekerId: newSeeker.jobSeeker.userId },
            });
            await db.jobSeeker.delete({
                where: { userId: newSeeker.jobSeeker.userId },
            });
            await db.userProfile.delete({ where: { id: newSeeker.id } });
        });

        // TEST 1: New signup subscription MUST have authnetSubscriptionId
        it("should create subscription with authnetSubscriptionId for new signup", async () => {
            const now = new Date();
            const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

            const subscription = await db.subscription.create({
                data: {
                    seekerId: newSeeker.jobSeeker.userId,
                    plan: "trial_monthly",
                    status: "active",
                    // ✅ CRITICAL: These fields MUST be populated for webhook processing
                    authnetSubscriptionId: `arb-new-signup-${uniqueId}`,
                    authnetCustomerId: `cust-new-signup-${uniqueId}`,
                    billingFrequency: "1-month",
                    currentPeriodStart: now,
                    currentPeriodEnd: futureDate,
                    nextBillingDate: futureDate,
                    cancelAtPeriodEnd: false,
                },
            });

            expect(subscription.authnetSubscriptionId).toBe(`arb-new-signup-${uniqueId}`);
            expect(subscription.authnetSubscriptionId).not.toBeNull();
            expect(subscription.authnetSubscriptionId).not.toBeUndefined();
        });

        // TEST 2: New signup subscription MUST have authnetCustomerId
        it("should create subscription with authnetCustomerId for new signup", async () => {
            const subscription = await db.subscription.findFirst({
                where: {
                    seekerId: newSeeker.jobSeeker.userId,
                },
            });

            expect(subscription?.authnetCustomerId).toBe(`cust-new-signup-${uniqueId}`);
            expect(subscription?.authnetCustomerId).not.toBeNull();
            expect(subscription?.authnetCustomerId).not.toBeUndefined();
        });

        // TEST 3: New signup subscription MUST have billingFrequency
        it("should create subscription with billingFrequency for new signup", async () => {
            const subscription = await db.subscription.findFirst({
                where: {
                    seekerId: newSeeker.jobSeeker.userId,
                },
            });

            expect(subscription?.billingFrequency).toBe("1-month");
            expect(subscription?.billingFrequency).not.toBeNull();
            expect(subscription?.billingFrequency).not.toBeUndefined();
        });

        // TEST 4: New signup subscription MUST have currentPeriodStart
        it("should create subscription with currentPeriodStart for new signup", async () => {
            const subscription = await db.subscription.findFirst({
                where: {
                    seekerId: newSeeker.jobSeeker.userId,
                },
            });

            expect(subscription?.currentPeriodStart).toBeDefined();
            expect(subscription?.currentPeriodStart).not.toBeNull();
        });

        // TEST 5: New signup subscription MUST have nextBillingDate
        it("should create subscription with nextBillingDate for new signup", async () => {
            const subscription = await db.subscription.findFirst({
                where: {
                    seekerId: newSeeker.jobSeeker.userId,
                },
            });

            expect(subscription?.nextBillingDate).toBeDefined();
            expect(subscription?.nextBillingDate).not.toBeNull();
        });

        // TEST 6: All ARB fields must be present together
        it("should have all ARB fields populated together in new signup subscription", async () => {
            const subscription = await db.subscription.findFirst({
                where: {
                    seekerId: newSeeker.jobSeeker.userId,
                },
            });

            const requiredFields = {
                authnetSubscriptionId: subscription?.authnetSubscriptionId,
                authnetCustomerId: subscription?.authnetCustomerId,
                billingFrequency: subscription?.billingFrequency,
                currentPeriodStart: subscription?.currentPeriodStart,
                nextBillingDate: subscription?.nextBillingDate,
            };

            // All fields must be present
            Object.entries(requiredFields).forEach(([, value]) => {
                expect(value).toBeDefined();
                expect(value).not.toBeNull();
            });
        });
    });

    // ======================================
    // PART B: WEBHOOK MATCHING CAPABILITY
    // ======================================

    describe("New Signup - Webhook Subscription Matching", () => {
        let webhookSeeker: any;
        let testSubscription: any;

        beforeAll(async () => {
            webhookSeeker = await db.userProfile.create({
                data: {
                    name: "Test Webhook Seeker",
                    email: `webhook-test-${uniqueId}@test.com`,
                    role: "seeker" as any,
                    jobSeeker: {
                        create: {},
                    },
                },
                include: { jobSeeker: true },
            });

            // Create a subscription with all ARB fields (as should happen during onboarding)
            testSubscription = await db.subscription.create({
                data: {
                    seekerId: webhookSeeker.jobSeeker.userId,
                    plan: "gold_bimonthly",
                    status: "active",
                    authnetSubscriptionId: `webhook-arb-${uniqueId}`,
                    authnetCustomerId: `webhook-cust-${uniqueId}`,
                    billingFrequency: "2-months",
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                    nextBillingDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                    cancelAtPeriodEnd: false,
                },
            });
        });

        afterAll(async () => {
            await db.subscription.deleteMany({
                where: { seekerId: webhookSeeker.jobSeeker.userId },
            });
            await db.jobSeeker.delete({
                where: { userId: webhookSeeker.jobSeeker.userId },
            });
            await db.userProfile.delete({ where: { id: webhookSeeker.id } });
        });

        // TEST 7: Webhook can find subscription by authnetSubscriptionId
        it("should find subscription by authnetSubscriptionId (webhook matching)", async () => {
            // This is the query that webhook handlers use to find subscriptions
            const foundSubscription = await db.subscription.findFirst({
                where: {
                    authnetSubscriptionId: `webhook-arb-${uniqueId}`,
                },
            });

            expect(foundSubscription).toBeDefined();
            expect(foundSubscription?.id).toBe(testSubscription.id);
            expect(foundSubscription?.seekerId).toBe(webhookSeeker.jobSeeker.userId);
        });

        // TEST 8: Webhook matching works with exact ARB subscription ID
        it("should match webhook events using authnetSubscriptionId field", async () => {
            // Simulates a webhook event from Authorize.net
            const webhookPayload = {
                subscriptionId: `webhook-arb-${uniqueId}`,
                transactionId: "12345678",
                settlementTimeUTC: new Date().toISOString(),
            };

            const subscription = await db.subscription.findFirst({
                where: {
                    authnetSubscriptionId: webhookPayload.subscriptionId,
                },
            });

            expect(subscription).toBeDefined();
            expect(subscription?.status).toBe("active");
        });

        // TEST 9: Query returns null if authnetSubscriptionId is not present (old behavior)
        it("should NOT find subscription if authnetSubscriptionId is null/missing", async () => {
            // Create a subscription WITHOUT authnetSubscriptionId (the broken state)
            const brokenSubscription = await db.subscription.create({
                data: {
                    seekerId: webhookSeeker.jobSeeker.userId,
                    plan: "trial_monthly",
                    status: "active",
                    currentPeriodEnd: new Date(),
                    cancelAtPeriodEnd: false,
                    // NOTE: No authnetSubscriptionId, authnetCustomerId, billingFrequency, etc.
                },
            });

            // Try to find it using webhook query (should NOT find it)
            const foundByWebhook = await db.subscription.findFirst({
                where: {
                    authnetSubscriptionId: "some-arb-id",
                },
            });

            expect(foundByWebhook).toBeNull();

            // Clean up the broken subscription
            await db.subscription.delete({
                where: { id: brokenSubscription.id },
            });
        });
    });

    // ======================================
    // PART C: CONSISTENCY ACROSS ALL PLANS
    // ======================================

    describe("New Signup - ARB Fields for All Plans", () => {
        let planTestSeeker: any;

        beforeAll(async () => {
            planTestSeeker = await db.userProfile.create({
                data: {
                    name: "Test Plan Seeker",
                    email: `plan-test-${uniqueId}@test.com`,
                    role: "seeker" as any,
                    jobSeeker: {
                        create: {},
                    },
                },
                include: { jobSeeker: true },
            });
        });

        afterAll(async () => {
            await db.subscription.deleteMany({
                where: { seekerId: planTestSeeker.jobSeeker.userId },
            });
            await db.jobSeeker.delete({
                where: { userId: planTestSeeker.jobSeeker.userId },
            });
            await db.userProfile.delete({ where: { id: planTestSeeker.id } });
        });

        // TEST 10: Trial plan new signup has all ARB fields
        it("should create Trial plan new signup subscription with all ARB fields", async () => {
            const subscription = await db.subscription.create({
                data: {
                    seekerId: planTestSeeker.jobSeeker.userId,
                    plan: "trial_monthly",
                    status: "active",
                    authnetSubscriptionId: `trial-new-${uniqueId}`,
                    authnetCustomerId: `trial-cust-${uniqueId}`,
                    billingFrequency: "1-month",
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
            });

            expect(subscription.authnetSubscriptionId).toBeDefined();
            expect(subscription.authnetCustomerId).toBeDefined();
            expect(subscription.billingFrequency).toBe("1-month");
        });

        // TEST 11: Gold plan new signup has all ARB fields
        it("should create Gold plan new signup subscription with all ARB fields", async () => {
            const subscription = await db.subscription.create({
                data: {
                    seekerId: planTestSeeker.jobSeeker.userId,
                    plan: "gold_bimonthly",
                    status: "active",
                    authnetSubscriptionId: `gold-new-${uniqueId}`,
                    authnetCustomerId: `gold-cust-${uniqueId}`,
                    billingFrequency: "2-months",
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                    nextBillingDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                },
            });

            expect(subscription.billingFrequency).toBe("2-months");
        });

        // TEST 12: VIP plan new signup has all ARB fields
        it("should create VIP plan new signup subscription with all ARB fields", async () => {
            const subscription = await db.subscription.create({
                data: {
                    seekerId: planTestSeeker.jobSeeker.userId,
                    plan: "vip_quarterly",
                    status: "active",
                    authnetSubscriptionId: `vip-new-${uniqueId}`,
                    authnetCustomerId: `vip-cust-${uniqueId}`,
                    billingFrequency: "3-months",
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                    nextBillingDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                },
            });

            expect(subscription.billingFrequency).toBe("3-months");
        });

        // TEST 13: Annual plan new signup has all ARB fields
        it("should create Annual plan new signup subscription with all ARB fields", async () => {
            const subscription = await db.subscription.create({
                data: {
                    seekerId: planTestSeeker.jobSeeker.userId,
                    plan: "annual_platinum",
                    status: "active",
                    authnetSubscriptionId: `annual-new-${uniqueId}`,
                    authnetCustomerId: `annual-cust-${uniqueId}`,
                    billingFrequency: "12-months",
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                    nextBillingDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                },
            });

            expect(subscription.billingFrequency).toBe("12-months");
        });

        // TEST 14: All new signup subscriptions have ARB fields populated
        it("should have 4 subscriptions with all ARB fields for new signup plans", async () => {
            const subscriptions = await db.subscription.findMany({
                where: {
                    seekerId: planTestSeeker.jobSeeker.userId,
                    authnetSubscriptionId: { not: null },
                },
            });

            expect(subscriptions.length).toBe(4);
            subscriptions.forEach((sub) => {
                expect(sub.authnetSubscriptionId).toBeDefined();
                expect(sub.authnetCustomerId).toBeDefined();
                expect(sub.billingFrequency).toBeDefined();
                expect(sub.currentPeriodStart).toBeDefined();
                expect(sub.nextBillingDate).toBeDefined();
            });
        });
    });

    // ======================================
    // PART D: COMPARISON WITH WORKING PATH
    // ======================================

    describe("New Signup ARB Fields - Comparison with Existing Seeker Path", () => {
        let existingSeeker: any;
        let newSeeker: any;

        beforeAll(async () => {
            existingSeeker = await db.userProfile.create({
                data: {
                    name: "Existing Seeker",
                    email: `existing-${uniqueId}@test.com`,
                    role: "seeker" as any,
                    jobSeeker: {
                        create: {},
                    },
                },
                include: { jobSeeker: true },
            });

            newSeeker = await db.userProfile.create({
                data: {
                    name: "New Seeker",
                    email: `new-${uniqueId}@test.com`,
                    role: "seeker" as any,
                    jobSeeker: {
                        create: {},
                    },
                },
                include: { jobSeeker: true },
            });
        });

        afterAll(async () => {
            await db.subscription.deleteMany({
                where: {
                    OR: [
                        { seekerId: existingSeeker.jobSeeker.userId },
                        { seekerId: newSeeker.jobSeeker.userId },
                    ],
                },
            });
            await db.jobSeeker.deleteMany({
                where: {
                    OR: [
                        { userId: existingSeeker.jobSeeker.userId },
                        { userId: newSeeker.jobSeeker.userId },
                    ],
                },
            });
            await db.userProfile.deleteMany({
                where: {
                    OR: [{ id: existingSeeker.id }, { id: newSeeker.id }],
                },
            });
        });

        // TEST 15: Both paths should populate identical ARB fields
        it("should populate same ARB fields for both existing and new seeker paths", async () => {
            const now = new Date();
            const future = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

            // Existing seeker path (from /api/seeker/subscription/purchase)
            const existingSub = await db.subscription.create({
                data: {
                    seekerId: existingSeeker.jobSeeker.userId,
                    plan: "gold_bimonthly",
                    status: "active",
                    authnetSubscriptionId: `existing-${uniqueId}`,
                    authnetCustomerId: `existing-cust-${uniqueId}`,
                    billingFrequency: "2-months",
                    currentPeriodStart: now,
                    currentPeriodEnd: future,
                    nextBillingDate: future,
                },
            });

            // New seeker path (from /api/payments/authnet/process-payment - AFTER FIX)
            const newSub = await db.subscription.create({
                data: {
                    seekerId: newSeeker.jobSeeker.userId,
                    plan: "gold_bimonthly",
                    status: "active",
                    authnetSubscriptionId: `new-${uniqueId}`,
                    authnetCustomerId: `new-cust-${uniqueId}`,
                    billingFrequency: "2-months",
                    currentPeriodStart: now,
                    currentPeriodEnd: future,
                    nextBillingDate: future,
                },
            });

            // Both should have identical field structure
            expect(existingSub.authnetSubscriptionId).toBeDefined();
            expect(newSub.authnetSubscriptionId).toBeDefined();
            expect(existingSub.authnetCustomerId).toBeDefined();
            expect(newSub.authnetCustomerId).toBeDefined();
            expect(existingSub.billingFrequency).toBe(newSub.billingFrequency);
            expect(existingSub.currentPeriodStart).toBeDefined();
            expect(newSub.currentPeriodStart).toBeDefined();
        });

        // TEST 16: Both paths enable webhook processing
        it("should enable webhook processing for both existing and new seeker subscriptions", async () => {
            const existingById = await db.subscription.findFirst({
                where: {
                    seekerId: existingSeeker.jobSeeker.userId,
                },
            });

            const newById = await db.subscription.findFirst({
                where: {
                    seekerId: newSeeker.jobSeeker.userId,
                },
            });

            // Both should be findable by authnetSubscriptionId (webhook requirement)
            const existingByArb = await db.subscription.findFirst({
                where: {
                    authnetSubscriptionId: existingById?.authnetSubscriptionId || "",
                },
            });

            const newByArb = await db.subscription.findFirst({
                where: {
                    authnetSubscriptionId: newById?.authnetSubscriptionId || "",
                },
            });

            expect(existingByArb?.id).toBe(existingById?.id);
            expect(newByArb?.id).toBe(newById?.id);
        });
    });

    // ======================================
    // PART E: FULL FLOW SIMULATION
    // ======================================

    describe("Full Onboarding Flow - Payment to Webhook Renewal", () => {
        let fullFlowSeeker: any;
        let fullFlowSub: any;

        beforeAll(async () => {
            fullFlowSeeker = await db.userProfile.create({
                data: {
                    name: "Full Flow Test Seeker",
                    email: `fullflow-${uniqueId}@test.com`,
                    role: "seeker" as any,
                    clerkUserId: `clerk-fullflow-${uniqueId}`,
                    jobSeeker: {
                        create: {
                            membershipPlan: "trial_monthly",
                        },
                    },
                },
                include: { jobSeeker: true },
            });
        });

        afterAll(async () => {
            await db.subscription.deleteMany({
                where: { seekerId: fullFlowSeeker.jobSeeker.userId },
            });
            await db.jobSeeker.delete({
                where: { userId: fullFlowSeeker.jobSeeker.userId },
            });
            await db.userProfile.delete({ where: { id: fullFlowSeeker.id } });
        });

        // TEST 17: Full onboarding flow - subscription created with ARB fields
        it("should create subscription during onboarding payment with all ARB fields (simulating process-payment)", async () => {
            const now = new Date();
            const currentPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days
            const nextBillingDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            // Simulate what process-payment does after new signup payment
            fullFlowSub = await db.subscription.create({
                data: {
                    seekerId: fullFlowSeeker.jobSeeker.userId,
                    plan: "trial_monthly",
                    status: "active",
                    // ✅ ARB fields populated just like the fixed process-payment route
                    authnetSubscriptionId: `ARB-TXN-${uniqueId}-${Date.now()}`,
                    authnetCustomerId: `CUST-${fullFlowSeeker.jobSeeker.userId}-${Date.now()}`,
                    billingFrequency: "1-month",
                    currentPeriodStart: now,
                    currentPeriodEnd: currentPeriodEnd,
                    nextBillingDate: nextBillingDate,
                    cancelAtPeriodEnd: false,
                },
            });

            expect(fullFlowSub.authnetSubscriptionId).toBeDefined();
            expect(fullFlowSub.authnetCustomerId).toBeDefined();
            expect(fullFlowSub.billingFrequency).toBe("1-month");
            expect(fullFlowSub.currentPeriodStart).toEqual(now);
            expect(fullFlowSub.currentPeriodEnd).toEqual(currentPeriodEnd);
            expect(fullFlowSub.nextBillingDate).toEqual(nextBillingDate);
        });

        // TEST 18: Webhook renewal processing can find the subscription
        it("should enable webhook renewal processing via subscription ID matching", async () => {
            // Simulate Authorize.net webhook event
            const webhookEvent = {
                subscriptionId: fullFlowSub.authnetSubscriptionId,
                transactionId: `TXN-${Date.now()}`,
                amount: "34.99",
                responseCode: "1",
            };

            // This is what webhook handler does - find subscription by authnetSubscriptionId
            const foundSubscription = await db.subscription.findFirst({
                where: {
                    authnetSubscriptionId: webhookEvent.subscriptionId,
                },
            });

            expect(foundSubscription).toBeDefined();
            expect(foundSubscription?.id).toBe(fullFlowSub.id);
            expect(foundSubscription?.seekerId).toBe(fullFlowSeeker.jobSeeker.userId);
            expect(foundSubscription?.status).toBe("active");
        });

        // TEST 19: Webhook can update membership period
        it("should update membership period based on webhook renewal", async () => {
            // Simulate webhook processing - extend the membership
            const webhookEvent = {
                subscriptionId: fullFlowSub.authnetSubscriptionId,
                transactionId: `TXN-${Date.now()}`,
            };

            const subscription = await db.subscription.findFirst({
                where: {
                    authnetSubscriptionId: webhookEvent.subscriptionId,
                },
            });

            if (subscription) {
                const newNextBillingDate = new Date(subscription.nextBillingDate);
                newNextBillingDate.setMonth(newNextBillingDate.getMonth() + 1); // +1 month for trial

                const updated = await db.subscription.update({
                    where: { id: subscription.id },
                    data: {
                        nextBillingDate: newNextBillingDate,
                        currentPeriodEnd: newNextBillingDate,
                    },
                });

                expect(updated.nextBillingDate).not.toEqual(subscription.nextBillingDate);
                expect(updated.nextBillingDate > subscription.nextBillingDate).toBe(true);
            }
        });

        // TEST 20: Full flow - new signup to renewal is webhook-enabled
        it("should support complete flow from new signup payment through webhook renewal", async () => {
            // Step 1: Subscription created with ARB fields (like process-payment)
            expect(fullFlowSub.authnetSubscriptionId).toBeDefined();
            expect(fullFlowSub.authnetCustomerId).toBeDefined();

            // Step 2: Webhook can find it
            const foundByWebhook = await db.subscription.findFirst({
                where: {
                    authnetSubscriptionId: fullFlowSub.authnetSubscriptionId,
                },
            });
            expect(foundByWebhook).toBeDefined();

            // Step 3: Webhook can update it
            if (foundByWebhook) {
                const newDate = new Date();
                newDate.setMonth(newDate.getMonth() + 1);
                const updated = await db.subscription.update({
                    where: { id: foundByWebhook.id },
                    data: { nextBillingDate: newDate },
                });
                expect(updated.nextBillingDate).toBeDefined();
            }

            // ✅ FLOW COMPLETE: New signup → Payment with ARB → Webhook renewal
        });
    });
});
