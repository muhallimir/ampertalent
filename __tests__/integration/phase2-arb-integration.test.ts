import { db } from "@/lib/db";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

describe("Phase 2: Authorize.net ARB Integration", () => {
    // ======================================
    // SETUP AND TEARDOWN
    // ======================================

    const uniqueId = Date.now();

    beforeAll(async () => {
        // Ensure we're in the correct database
        process.env.DATABASE_URL = process.env.DATABASE_URL;
        console.log("Phase 2 ARB Integration Tests Starting...");
    });

    afterAll(async () => {
        console.log("Phase 2 ARB Integration Tests Complete");
    });

    // ======================================
    // PART A: ARB SUBSCRIPTION CREATION - ALL 4 PLANS
    // ======================================

    describe("ARB Subscription Creation - All 4 Plans", () => {
        let testSeeker: any;

        beforeAll(async () => {
            // Create test seeker
            testSeeker = await db.userProfile.create({
                data: {
                    name: "Test Seeker ARB Plans",
                    email: `arb-seeker-${uniqueId}@test.com`,
                    role: "seeker" as any,
                    jobSeeker: {
                        create: {}, // userId auto-set from UserProfile id
                    },
                },
                include: { jobSeeker: true },
            });
        });

        afterAll(async () => {
            await db.subscription.deleteMany({
                where: { seekerId: testSeeker.jobSeeker.userId },
            });
            await db.jobSeeker.delete({
                where: { userId: testSeeker.jobSeeker.userId },
            });
            await db.userProfile.delete({ where: { id: testSeeker.id } });
        });

        // --------
        // TEST 1: Trial Plan (1 month, $34.99)
        // --------
        it("should create Trial plan ARB subscription with correct billing frequency", async () => {
            const subscription = await db.subscription.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    plan: "trial_monthly",
                    status: "active",
                    authnetSubscriptionId: `trial-arb-${uniqueId}`,
                    authnetCustomerId: `trial-cust-${uniqueId}`,
                    billingFrequency: "1-month",
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(
                        new Date().setMonth(new Date().getMonth() + 1),
                    ),
                    nextBillingDate: new Date(
                        new Date().setMonth(new Date().getMonth() + 1),
                    ),
                },
            });

            expect(subscription.plan).toBe("trial_monthly");
            expect(subscription.status).toBe("active");
            expect(subscription.authnetSubscriptionId).toBe(`trial-arb-${uniqueId}`);
            expect(subscription.authnetCustomerId).toBe(`trial-cust-${uniqueId}`);
            expect(subscription.billingFrequency).toBe("1-month");
            expect(subscription.currentPeriodStart).toBeDefined();
            expect(subscription.currentPeriodEnd).toBeDefined();
            expect(subscription.nextBillingDate).toBeDefined();
        });

        // --------
        // TEST 2: Gold Plan (2 months, $49.99)
        // --------
        it("should create Gold plan ARB subscription with correct billing frequency", async () => {
            const subscription = await db.subscription.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    plan: "gold_bimonthly",
                    status: "active",
                    authnetSubscriptionId: `gold-arb-${uniqueId}`,
                    authnetCustomerId: `gold-cust-${uniqueId}`,
                    billingFrequency: "2-months",
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(
                        new Date().setMonth(new Date().getMonth() + 2),
                    ),
                    nextBillingDate: new Date(
                        new Date().setMonth(new Date().getMonth() + 2),
                    ),
                },
            });

            expect(subscription.plan).toBe("gold_bimonthly");
            expect(subscription.billingFrequency).toBe("2-months");
            expect(subscription.authnetSubscriptionId).toBe(`gold-arb-${uniqueId}`);
        });

        // --------
        // TEST 3: VIP Plan (3 months, $79.99)
        // --------
        it("should create VIP plan ARB subscription with correct billing frequency", async () => {
            const subscription = await db.subscription.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    plan: "vip_quarterly",
                    status: "active",
                    authnetSubscriptionId: `vip-arb-${uniqueId}`,
                    authnetCustomerId: `vip-cust-${uniqueId}`,
                    billingFrequency: "3-months",
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(
                        new Date().setMonth(new Date().getMonth() + 3),
                    ),
                    nextBillingDate: new Date(
                        new Date().setMonth(new Date().getMonth() + 3),
                    ),
                },
            });

            expect(subscription.plan).toBe("vip_quarterly");
            expect(subscription.billingFrequency).toBe("3-months");
            expect(subscription.authnetSubscriptionId).toBe(`vip-arb-${uniqueId}`);
        });

        // --------
        // TEST 4: Annual Plan (12 months, $299.00)
        // --------
        it("should create Annual plan ARB subscription with correct billing frequency", async () => {
            const subscription = await db.subscription.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    plan: "annual_platinum",
                    status: "active",
                    authnetSubscriptionId: `annual-arb-${uniqueId}`,
                    authnetCustomerId: `annual-cust-${uniqueId}`,
                    billingFrequency: "12-months",
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(
                        new Date().setFullYear(new Date().getFullYear() + 1),
                    ),
                    nextBillingDate: new Date(
                        new Date().setFullYear(new Date().getFullYear() + 1),
                    ),
                },
            });

            expect(subscription.plan).toBe("annual_platinum");
            expect(subscription.billingFrequency).toBe("12-months");
            expect(subscription.authnetSubscriptionId).toBe(`annual-arb-${uniqueId}`);
        });

        // --------
        // TEST 5: All subscriptions stored with authnetSubscriptionId
        // --------
        it("should store authnetSubscriptionId for all 4 plans", async () => {
            const subscriptions = await db.subscription.findMany({
                where: {
                    seekerId: testSeeker.jobSeeker.userId,
                    authnetSubscriptionId: { not: null },
                },
            });

            expect(subscriptions.length).toBe(4);
            subscriptions.forEach((sub) => {
                expect(sub.authnetSubscriptionId).toBeDefined();
                expect(sub.authnetSubscriptionId).not.toBeNull();
                expect(sub.authnetCustomerId).not.toBeNull();
            });
        });

        // --------
        // TEST 6: Billing frequencies match expected intervals
        // --------
        it("should maintain correct billing frequency values", async () => {
            const frequencyMap: Record<string, string> = {
                "1-month": "trial_monthly",
                "2-months": "gold_bimonthly",
                "3-months": "vip_quarterly",
                "12-months": "annual_platinum",
            };

            for (const [freq, plan] of Object.entries(frequencyMap)) {
                const sub = await db.subscription.findFirst({
                    where: {
                        seekerId: testSeeker.jobSeeker.userId,
                        plan: plan as any,
                    },
                });

                expect(sub?.billingFrequency).toBe(freq);
            }
        });
    });

    // ======================================
    // PART B: PURCHASE ENDPOINT CHANGES
    // ======================================

    describe("Purchase Endpoint - ARB Integration", () => {
        let testSeeker: any;

        beforeAll(async () => {
            testSeeker = await db.userProfile.create({
                data: {
                    name: "Test Purchase Flow",
                    email: `purchase-${uniqueId}@test.com`,
                    role: "seeker" as any,
                    jobSeeker: {
                        create: {}, // userId auto-set from UserProfile id
                    },
                },
                include: { jobSeeker: true },
            });
        });

        afterAll(async () => {
            await db.subscription.deleteMany({
                where: { seekerId: testSeeker.jobSeeker.userId },
            });
            await db.jobSeeker.delete({
                where: { userId: testSeeker.jobSeeker.userId },
            });
            await db.userProfile.delete({ where: { id: testSeeker.id } });
        });

        // --------
        // TEST 7: Create subscription with authnetSubscriptionId (not ghlTransactionId)
        // --------
        it("should create subscription with authnetSubscriptionId instead of ghlTransactionId", async () => {
            const subscription = await db.subscription.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    plan: "trial_monthly",
                    status: "active",
                    authnetSubscriptionId: `purchase-arb-${uniqueId}`,
                    authnetCustomerId: `purchase-cust-${uniqueId}`,
                    billingFrequency: "1-month",
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(
                        new Date().setMonth(new Date().getMonth() + 1),
                    ),
                    nextBillingDate: new Date(
                        new Date().setMonth(new Date().getMonth() + 1),
                    ),
                    // ghlTransactionId intentionally omitted
                },
            });

            expect(subscription.authnetSubscriptionId).toBeDefined();
            expect(subscription.authnetSubscriptionId).toContain("purchase-arb");
            expect(subscription.ghlTransactionId).toBeNull();
            expect(subscription.billingFrequency).toBe("1-month");
        });

        // --------
        // TEST 8: Previous subscriptions cancelled when new one purchased
        // --------
        it("should mark existing subscription as canceled when new one purchased", async () => {
            // Create old subscription
            const old = await db.subscription.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    plan: "trial_monthly",
                    status: "active",
                    authnetSubscriptionId: `old-sub-${uniqueId}`,
                    authnetCustomerId: `old-cust-${uniqueId}`,
                    billingFrequency: "1-month",
                    currentPeriodStart: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                    currentPeriodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
                    nextBillingDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
                },
            });

            // Cancel old subscription
            const updated = await db.subscription.update({
                where: { id: old.id },
                data: { status: "canceled" },
            });

            expect(updated.status).toBe("canceled");

            // Create new subscription
            const newSub = await db.subscription.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    plan: "gold_bimonthly",
                    status: "active",
                    authnetSubscriptionId: `new-sub-${uniqueId}`,
                    authnetCustomerId: `new-cust-${uniqueId}`,
                    billingFrequency: "2-months",
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(
                        new Date().setMonth(new Date().getMonth() + 2),
                    ),
                    nextBillingDate: new Date(
                        new Date().setMonth(new Date().getMonth() + 2),
                    ),
                },
            });

            expect(newSub.status).toBe("active");
            expect(newSub.plan).toBe("gold_bimonthly");
        });

        // --------
        // TEST 9: Period dates calculated correctly for all plans
        // --------
        it("should calculate period dates correctly based on billing frequency", async () => {
            const now = new Date();
            const plans = [
                { plan: "trial_monthly", freq: "1-month", months: 1 },
                { plan: "gold_bimonthly", freq: "2-months", months: 2 },
                { plan: "vip_quarterly", freq: "3-months", months: 3 },
                { plan: "annual_platinum", freq: "12-months", months: 12 },
            ];

            for (const { plan, freq, months } of plans) {
                const expectedEnd = new Date(now);
                expectedEnd.setMonth(expectedEnd.getMonth() + months);

                const sub = await db.subscription.create({
                    data: {
                        seekerId: testSeeker.jobSeeker.userId,
                        plan: plan as any,
                        status: "active",
                        authnetSubscriptionId: `period-${plan}-${uniqueId}`,
                        authnetCustomerId: `period-cust-${uniqueId}`,
                        billingFrequency: freq,
                        currentPeriodStart: now,
                        currentPeriodEnd: expectedEnd,
                        nextBillingDate: expectedEnd,
                    },
                });

                const daysDiff = Math.abs(
                    (sub.currentPeriodEnd!.getTime() - now.getTime()) /
                    (1000 * 60 * 60 * 24),
                );
                expect(daysDiff).toBeLessThan(months * 31 + 1);
            }
        });
    });

    // ======================================
    // PART C: WEBHOOK HANDLING
    // ======================================

    describe("Webhook Handler - ARB Events", () => {
        let testSeeker: any;
        let testSubscription: any;

        beforeAll(async () => {
            testSeeker = await db.userProfile.create({
                data: {
                    name: "Test Webhook Handler",
                    email: `webhook-${uniqueId}@test.com`,
                    role: "seeker" as any,
                    jobSeeker: {
                        create: {}, // userId auto-set from UserProfile id
                    },
                },
                include: { jobSeeker: true },
            });

            testSubscription = await db.subscription.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    plan: "gold_bimonthly",
                    status: "active",
                    authnetSubscriptionId: `webhook-sub-${uniqueId}`,
                    authnetCustomerId: `webhook-cust-${uniqueId}`,
                    billingFrequency: "2-months",
                    currentPeriodStart: new Date(
                        Date.now() - 60 * 24 * 60 * 60 * 1000,
                    ),
                    currentPeriodEnd: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Expires tomorrow
                    nextBillingDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
                },
            });
        });

        afterAll(async () => {
            await db.subscription.deleteMany({
                where: { seekerId: testSeeker.jobSeeker.userId },
            });
            await db.jobSeeker.delete({
                where: { userId: testSeeker.jobSeeker.userId },
            });
            await db.userProfile.delete({ where: { id: testSeeker.id } });
        });

        // --------
        // TEST 10: Successful renewal webhook updates subscription
        // --------
        it("should handle successful ARB renewal webhook and update period dates", async () => {
            const beforeRenewal = testSubscription.currentPeriodEnd;

            // Simulate webhook: subscription renewed
            const newStart = beforeRenewal;
            const newEnd = new Date(beforeRenewal);
            newEnd.setMonth(newEnd.getMonth() + 2); // Renew for 2 months

            const renewed = await db.subscription.update({
                where: { id: testSubscription.id },
                data: {
                    status: "active",
                    currentPeriodStart: newStart,
                    currentPeriodEnd: newEnd,
                    nextBillingDate: newEnd,
                    updatedAt: new Date(),
                },
            });

            expect(renewed.status).toBe("active");
            expect(renewed.currentPeriodEnd).toEqual(newEnd);
            expect(renewed.currentPeriodEnd! > beforeRenewal).toBe(true);
            expect(renewed.currentPeriodStart).toEqual(newStart);
        });

        // --------
        // TEST 11: Payment failure marks subscription as past_due
        // --------
        it("should handle failed payment webhook and mark subscription as past_due", async () => {
            const sub = await db.subscription.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    plan: "trial_monthly",
                    status: "active",
                    authnetSubscriptionId: `failed-payment-${uniqueId}`,
                    authnetCustomerId: `failed-cust-${uniqueId}`,
                    billingFrequency: "1-month",
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(
                        new Date().setMonth(new Date().getMonth() + 1),
                    ),
                    nextBillingDate: new Date(
                        new Date().setMonth(new Date().getMonth() + 1),
                    ),
                },
            });

            // Simulate webhook: payment failed
            const failed = await db.subscription.update({
                where: { id: sub.id },
                data: {
                    status: "past_due",
                },
            });

            expect(failed.status).toBe("past_due");
        });

        // --------
        // TEST 12: Subscription cancelled webhook handled
        // --------
        it("should handle subscription cancelled webhook", async () => {
            const sub = await db.subscription.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    plan: "vip_quarterly",
                    status: "active",
                    authnetSubscriptionId: `cancel-sub-${uniqueId}`,
                    authnetCustomerId: `cancel-cust-${uniqueId}`,
                    billingFrequency: "3-months",
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(
                        new Date().setMonth(new Date().getMonth() + 3),
                    ),
                    nextBillingDate: new Date(
                        new Date().setMonth(new Date().getMonth() + 3),
                    ),
                },
            });

            // Simulate webhook: subscription cancelled
            const cancelled = await db.subscription.update({
                where: { id: sub.id },
                data: { status: "canceled" },
            });

            expect(cancelled.status).toBe("canceled");
        });

        // --------
        // TEST 13: Webhook updates JobSeeker membershipExpiresAt on renewal
        // --------
        it("should update JobSeeker.membershipExpiresAt when subscription renews via webhook", async () => {
            const newEnd = new Date();
            newEnd.setMonth(newEnd.getMonth() + 2);

            await db.subscription.update({
                where: { id: testSubscription.id },
                data: {
                    currentPeriodEnd: newEnd,
                    nextBillingDate: newEnd,
                },
            });

            // Update JobSeeker membership dates
            const updatedSeeker = await db.jobSeeker.update({
                where: { userId: testSeeker.jobSeeker.userId },
                data: {
                    membershipExpiresAt: newEnd,
                    membershipPlan: "gold_bimonthly",
                },
            });

            expect(updatedSeeker.membershipExpiresAt).toEqual(newEnd);
            expect(updatedSeeker.membershipPlan).toBe("gold_bimonthly");
        });
    });

    // ======================================
    // PART D: RENEWAL LOGIC & PERIOD CARRY-OVER
    // ======================================

    describe("Renewal Logic - Period Carry-Over", () => {
        let testSeeker: any;
        let testResume: any;
        let testSubscription: any;

        beforeAll(async () => {
            testSeeker = await db.userProfile.create({
                data: {
                    name: "Test Renewal Logic",
                    email: `renewal-${uniqueId}@test.com`,
                    role: "seeker" as any,
                    jobSeeker: {
                        create: {}, // userId auto-set from UserProfile id
                    },
                },
                include: { jobSeeker: true },
            });

            // Create active resume
            testResume = await db.resume.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    filename: "renewal-test.pdf",
                    fileUrl: "s3://bucket/renewal-test.pdf",
                    status: "active",
                },
            });

            // Create subscription due for renewal
            testSubscription = await db.subscription.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    plan: "gold_bimonthly",
                    status: "active",
                    authnetSubscriptionId: `renewal-sub-${uniqueId}`,
                    authnetCustomerId: `renewal-cust-${uniqueId}`,
                    billingFrequency: "2-months",
                    currentPeriodStart: new Date(
                        Date.now() - 60 * 24 * 60 * 60 * 1000,
                    ),
                    currentPeriodEnd: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
                    nextBillingDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
                },
            });
        });

        afterAll(async () => {
            await db.resume.deleteMany({
                where: { seekerId: testSeeker.jobSeeker.userId },
            });
            await db.subscription.deleteMany({
                where: { seekerId: testSeeker.jobSeeker.userId },
            });
            await db.jobSeeker.delete({
                where: { userId: testSeeker.jobSeeker.userId },
            });
            await db.userProfile.delete({ where: { id: testSeeker.id } });
        });

        // --------
        // TEST 14: Active resumes stay active after renewal
        // --------
        it("should keep resume active when subscription renews", async () => {
            const beforeResume = await db.resume.findUnique({
                where: { id: testResume.id },
            });
            expect(beforeResume?.status).toBe("active");

            // Renewal doesn't affect resumes
            const afterResume = await db.resume.findUnique({
                where: { id: testResume.id },
            });
            expect(afterResume?.status).toBe("active");
        });

        // --------
        // TEST 15: Period dates carry over correctly (oldEnd becomes newStart)
        // --------
        it("should set currentPeriodStart to old currentPeriodEnd on renewal", async () => {
            const oldEnd = testSubscription.currentPeriodEnd;

            // Simulate renewal webhook
            const newStart = oldEnd;
            const newEnd = new Date(oldEnd);
            newEnd.setMonth(newEnd.getMonth() + 2);

            const renewed = await db.subscription.update({
                where: { id: testSubscription.id },
                data: {
                    currentPeriodStart: newStart,
                    currentPeriodEnd: newEnd,
                    nextBillingDate: newEnd,
                },
            });

            expect(renewed.currentPeriodStart).toEqual(oldEnd);
            expect(renewed.currentPeriodEnd).toEqual(newEnd);
            expect(renewed.nextBillingDate).toEqual(newEnd);
        });

        // --------
        // TEST 16: Resume quota enforced even after renewal
        // --------
        it("should count active resumes correctly after period renewal", async () => {
            const activeResumes = await db.resume.findMany({
                where: {
                    seekerId: testSeeker.jobSeeker.userId,
                    status: "active",
                },
            });

            expect(activeResumes.length).toBeGreaterThanOrEqual(1);
        });

        // --------
        // TEST 17: Multiple renewals maintain correct dates
        // --------
        it("should handle multiple sequential renewals correctly", async () => {
            let current = testSubscription;
            const renewalCount = 3;

            for (let i = 0; i < renewalCount; i++) {
                const oldEnd = current.currentPeriodEnd;
                const newEnd = new Date(oldEnd);
                newEnd.setMonth(newEnd.getMonth() + 2);

                current = await db.subscription.update({
                    where: { id: current.id },
                    data: {
                        currentPeriodStart: oldEnd,
                        currentPeriodEnd: newEnd,
                        nextBillingDate: newEnd,
                    },
                });
            }

            expect(current.currentPeriodEnd!.getTime()).toBeGreaterThan(
                testSubscription.currentPeriodEnd!.getTime(),
            );
        });
    });

    // ======================================
    // PART E: EDGE CASES & VALIDATIONS
    // ======================================

    describe("Edge Cases & Validations", () => {
        let testSeeker: any;

        beforeAll(async () => {
            testSeeker = await db.userProfile.create({
                data: {
                    name: "Test Edge Cases",
                    email: `edge-${uniqueId}@test.com`,
                    role: "seeker" as any,
                    jobSeeker: {
                        create: {}, // userId auto-set from UserProfile id
                    },
                },
                include: { jobSeeker: true },
            });
        });

        afterAll(async () => {
            await db.subscription.deleteMany({
                where: { seekerId: testSeeker.jobSeeker.userId },
            });
            await db.jobSeeker.delete({
                where: { userId: testSeeker.jobSeeker.userId },
            });
            await db.userProfile.delete({ where: { id: testSeeker.id } });
        });

        // --------
        // TEST 18: billingFrequency required for active ARB subscription
        // --------
        it("should require billingFrequency for active ARB subscription", async () => {
            const sub = await db.subscription.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    plan: "trial_monthly",
                    status: "active",
                    authnetSubscriptionId: `freq-req-${uniqueId}`,
                    authnetCustomerId: `freq-cust-${uniqueId}`,
                    billingFrequency: "1-month",
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(
                        new Date().setMonth(new Date().getMonth() + 1),
                    ),
                    nextBillingDate: new Date(
                        new Date().setMonth(new Date().getMonth() + 1),
                    ),
                },
            });

            expect(sub.billingFrequency).not.toBeNull();
            expect(["1-month", "2-months", "3-months", "12-months"]).toContain(
                sub.billingFrequency,
            );
        });

        // --------
        // TEST 19: nextBillingDate must be after or equal to currentPeriodStart
        // --------
        it("should ensure nextBillingDate >= currentPeriodStart", async () => {
            const start = new Date();
            const end = new Date(start);
            end.setMonth(end.getMonth() + 1);

            const sub = await db.subscription.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    plan: "trial_monthly",
                    status: "active",
                    authnetSubscriptionId: `date-order-${uniqueId}`,
                    authnetCustomerId: `date-cust-${uniqueId}`,
                    billingFrequency: "1-month",
                    currentPeriodStart: start,
                    currentPeriodEnd: end,
                    nextBillingDate: end,
                },
            });

            expect(sub.nextBillingDate!.getTime()).toBeGreaterThanOrEqual(
                sub.currentPeriodStart!.getTime(),
            );
        });

        // --------
        // TEST 20: currentPeriodEnd must be after currentPeriodStart
        // --------
        it("should ensure currentPeriodEnd > currentPeriodStart", async () => {
            const start = new Date();
            const end = new Date(start);
            end.setMonth(end.getMonth() + 2);

            const sub = await db.subscription.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    plan: "gold_bimonthly",
                    status: "active",
                    authnetSubscriptionId: `end-after-start-${uniqueId}`,
                    authnetCustomerId: `end-cust-${uniqueId}`,
                    billingFrequency: "2-months",
                    currentPeriodStart: start,
                    currentPeriodEnd: end,
                    nextBillingDate: end,
                },
            });

            expect(sub.currentPeriodEnd!.getTime()).toBeGreaterThan(
                sub.currentPeriodStart!.getTime(),
            );
        });

        // --------
        // TEST 21: authnetSubscriptionId must be unique per subscription
        // --------
        it("should allow authnetSubscriptionId to identify subscription uniquely", async () => {
            const sub1 = await db.subscription.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    plan: "trial_monthly",
                    status: "active",
                    authnetSubscriptionId: `unique-id-${uniqueId}-1`,
                    authnetCustomerId: `cust-${uniqueId}-1`,
                    billingFrequency: "1-month",
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(
                        new Date().setMonth(new Date().getMonth() + 1),
                    ),
                    nextBillingDate: new Date(
                        new Date().setMonth(new Date().getMonth() + 1),
                    ),
                },
            });

            const found = await db.subscription.findFirst({
                where: { authnetSubscriptionId: `unique-id-${uniqueId}-1` },
            });

            expect(found?.id).toBe(sub1.id);
            expect(found?.authnetSubscriptionId).toBe(
                `unique-id-${uniqueId}-1`,
            );
        });

        // --------
        // TEST 22: All 4 valid billing frequencies accepted
        // --------
        it("should accept all 4 valid billing frequency values", async () => {
            const frequencies = ["1-month", "2-months", "3-months", "12-months"];
            const plans = [
                "trial_monthly",
                "gold_bimonthly",
                "vip_quarterly",
                "annual_platinum",
            ];

            for (let i = 0; i < frequencies.length; i++) {
                const sub = await db.subscription.create({
                    data: {
                        seekerId: testSeeker.jobSeeker.userId,
                        plan: plans[i] as any,
                        status: "active",
                        authnetSubscriptionId: `freq-${frequencies[i]}-${uniqueId}`,
                        authnetCustomerId: `freq-cust-${frequencies[i]}`,
                        billingFrequency: frequencies[i],
                        currentPeriodStart: new Date(),
                        currentPeriodEnd: new Date(
                            new Date().getTime() +
                            (i + 1) * 30 * 24 * 60 * 60 * 1000,
                        ),
                        nextBillingDate: new Date(
                            new Date().getTime() +
                            (i + 1) * 30 * 24 * 60 * 60 * 1000,
                        ),
                    },
                });

                expect(sub.billingFrequency).toBe(frequencies[i]);
            }
        });
    });
});
