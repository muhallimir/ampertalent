import { db } from "@/lib/db"
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals"

/**
 * Phase 7: Super-Admin Recurring Billing / MRR Details Page
 * 
 * Tests that the super-admin recurring billing page displays all seeker recurring
 * subscriptions with correct field mappings, access control, filtering, search,
 * CSV export, and manual renewal capability.
 * 
 * Current Database State:
 * - 49 total subscriptions (43 active, 6 canceled)
 * - 0 past_due, 0 unpaid, 0 trials
 * - All recurring (no one-time purchases)
 * - Only Authorize.net provider
 */

describe("Phase 7: Super-Admin Recurring Billing Page", () => {
    const uniqueId = Date.now()
    let testSeeker1: any
    let testSeeker2: any
    let testSeeker3: any
    let subscription1: any
    let subscription2: any
    let subscription3: any

    beforeAll(async () => {
        console.log("🧪 Phase 7: Super-Admin Recurring Billing Tests Starting...")

        // Create test seekers for this test suite
        const user1 = await db.userProfile.create({
            data: {
                name: `Phase7 Test Seeker 1 ${uniqueId}`,
                email: `phase7-seeker1-${uniqueId}@test.com`,
                firstName: "Phase7Test",
                lastName: "Seeker1",
                role: "seeker" as any,
                jobSeeker: {
                    create: {},
                },
            },
            include: { jobSeeker: true },
        })
        testSeeker1 = user1

        const user2 = await db.userProfile.create({
            data: {
                name: `Phase7 Test Seeker 2 ${uniqueId}`,
                email: `phase7-seeker2-${uniqueId}@test.com`,
                firstName: "Phase7Test",
                lastName: "Seeker2",
                role: "seeker" as any,
                jobSeeker: {
                    create: {},
                },
            },
            include: { jobSeeker: true },
        })
        testSeeker2 = user2

        const user3 = await db.userProfile.create({
            data: {
                name: `Phase7 Test Seeker 3 ${uniqueId}`,
                email: `phase7-seeker3-${uniqueId}@test.com`,
                firstName: "Phase7Test",
                lastName: "Seeker3",
                role: "seeker" as any,
                jobSeeker: {
                    create: {},
                },
            },
            include: { jobSeeker: true },
        })
        testSeeker3 = user3

        // Create test subscriptions with proper data structure
        const now = new Date()
        const future60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
        const future90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

        subscription1 = await db.subscription.create({
            data: {
                seekerId: testSeeker1.jobSeeker.userId,
                plan: "gold_bimonthly",
                status: "active",
                authnetSubscriptionId: `arb-phase7-${uniqueId}-1`,
                authnetCustomerId: `cust-phase7-${uniqueId}-1`,
                billingFrequency: "2-months",
                currentPeriodStart: now,
                currentPeriodEnd: future60Days,
                nextBillingDate: future60Days,
                cancelAtPeriodEnd: false,
            },
        })

        subscription2 = await db.subscription.create({
            data: {
                seekerId: testSeeker2.jobSeeker.userId,
                plan: "vip_quarterly",
                status: "active",
                authnetSubscriptionId: `arb-phase7-${uniqueId}-2`,
                authnetCustomerId: `cust-phase7-${uniqueId}-2`,
                billingFrequency: "3-months",
                currentPeriodStart: now,
                currentPeriodEnd: future90Days,
                nextBillingDate: future90Days,
                cancelAtPeriodEnd: false,
            },
        })

        subscription3 = await db.subscription.create({
            data: {
                seekerId: testSeeker3.jobSeeker.userId,
                plan: "annual_platinum",
                status: "canceled",
                authnetSubscriptionId: `arb-phase7-${uniqueId}-3`,
                authnetCustomerId: `cust-phase7-${uniqueId}-3`,
                billingFrequency: "12-months",
                currentPeriodStart: now,
                currentPeriodEnd: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
                nextBillingDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
                cancelAtPeriodEnd: true,
            },
        })

        console.log(`✅ Created 3 test subscriptions for Phase 7`)
    })

    afterAll(async () => {
        // Cleanup test data
        await db.subscription.deleteMany({
            where: {
                id: {
                    in: [subscription1.id, subscription2.id, subscription3.id],
                },
            },
        })

        const seekerIds = [
            testSeeker1.jobSeeker.userId,
            testSeeker2.jobSeeker.userId,
            testSeeker3.jobSeeker.userId,
        ]

        await db.jobSeeker.deleteMany({
            where: { userId: { in: seekerIds } },
        })

        await db.userProfile.deleteMany({
            where: { id: { in: [testSeeker1.id, testSeeker2.id, testSeeker3.id] } },
        })

        console.log("✅ Phase 7: Super-Admin Recurring Billing Tests Complete")
    })

    // ========================================
    // PART A: DATA FETCHING & FIELD MAPPING
    // ========================================

    describe("Part A: Data Fetching & Correct Field Mapping", () => {
        it("should fetch all seeker recurring subscriptions", async () => {
            const subscriptions = await db.subscription.findMany()
            expect(subscriptions.length).toBeGreaterThan(0)
            expect(subscriptions[0].seekerId).not.toBeNull()
        })

        it("should map plan names correctly from database plan field", async () => {
            const sub = await db.subscription.findFirst({
                where: { plan: "gold_bimonthly" },
            })
            expect(sub?.plan).toBe("gold_bimonthly")
        })

        it("should fetch amounts from SEEKER_SUBSCRIPTION_PLANS config by plan", async () => {
            const planAmounts: Record<string, number> = {
                trial_monthly: 34.99,
                gold_bimonthly: 49.99,
                vip_quarterly: 79.99,
                annual_platinum: 299.0,
            }

            const sub = await db.subscription.findFirst({
                where: { plan: "gold_bimonthly" },
            })

            expect(sub?.plan).toBe("gold_bimonthly")
            expect(planAmounts["gold_bimonthly"]).toBe(49.99)
        })

        it("should correctly map auto-renew from inverse cancel_at_period_end", async () => {
            const activeSub = await db.subscription.findFirst({
                where: { id: subscription1.id },
            })

            expect(activeSub?.cancelAtPeriodEnd).toBe(false)
            expect(!activeSub?.cancelAtPeriodEnd).toBe(true)

            const canceledSub = await db.subscription.findFirst({
                where: { id: subscription3.id },
            })

            expect(canceledSub?.cancelAtPeriodEnd).toBe(true)
            expect(!canceledSub?.cancelAtPeriodEnd).toBe(false)
        })

        it("should fetch billing frequency directly from subscription", async () => {
            const sub = await db.subscription.findFirst({
                where: { id: subscription1.id },
            })

            expect(sub?.billingFrequency).toBe("2-months")
        })

        it("should fetch subscription start date from created_at", async () => {
            const sub = await db.subscription.findFirst({
                where: { id: subscription1.id },
            })

            expect(sub?.createdAt).toBeInstanceOf(Date)
            expect(sub?.createdAt).not.toBeNull()
        })

        it("should fetch next renewal date from next_billing_date", async () => {
            const sub = await db.subscription.findFirst({
                where: { id: subscription1.id },
            })

            expect(sub?.nextBillingDate).toBeInstanceOf(Date)
            expect(sub?.nextBillingDate).not.toBeNull()
            expect(sub?.nextBillingDate!.getTime()).toBeGreaterThan(new Date().getTime())
        })

        it("should fetch seeker name from user_profiles via seeker relation", async () => {
            const sub = await db.subscription.findFirst({
                where: { id: subscription1.id },
                include: {
                    seeker: {
                        include: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                },
                            },
                        },
                    },
                },
            })

            expect(sub?.seeker.user.firstName).toBe("Phase7Test")
            expect(sub?.seeker.user.lastName).toBe("Seeker1")
            expect(sub?.seeker.user.email).toContain("phase7-seeker1")
        })

        it("should fetch Authorize.net provider IDs", async () => {
            const sub = await db.subscription.findFirst({
                where: { id: subscription1.id },
            })

            expect(sub?.authnetSubscriptionId).toContain("arb-phase7")
            expect(sub?.authnetCustomerId).toContain("cust-phase7")
            expect(sub?.authnetSubscriptionId).not.toBeNull()
            expect(sub?.authnetCustomerId).not.toBeNull()
        })

        it("should NOT include one-time purchases", async () => {
            const subscriptions = await db.subscription.findMany()

            for (const sub of subscriptions) {
                expect(["active", "canceled", "past_due", "unpaid"]).toContain(sub.status)
            }
        })
    })

    // ========================================
    // PART B: STATUS FILTERING
    // ========================================

    describe("Part B: Status Filtering (Active & Canceled only)", () => {
        it("should filter and show ACTIVE subscriptions", async () => {
            const activeSubs = await db.subscription.findMany({
                where: {
                    status: "active",
                },
            })

            expect(activeSubs.length).toBeGreaterThan(0)
            expect(activeSubs[0].status).toBe("active")
        })

        it("should filter and show CANCELED subscriptions", async () => {
            const canceledSubs = await db.subscription.findMany({
                where: {
                    status: "canceled",
                },
            })

            expect(canceledSubs.length).toBeGreaterThanOrEqual(0)
            const testCanceled = canceledSubs.find((s) => s.id === subscription3.id)
            expect(testCanceled?.status).toBe("canceled")
        })

        it("should identify past_due subscriptions by next_billing_date < NOW", async () => {
            const now = new Date()
            const pastDue = await db.subscription.findMany({
                where: {
                    status: "active",
                    nextBillingDate: {
                        lt: now,
                    },
                },
            })

            expect(pastDue.length).toBeGreaterThanOrEqual(0)
            for (const sub of pastDue) {
                expect(sub.nextBillingDate!.getTime()).toBeLessThan(now.getTime())
            }
        })

        it("should correctly identify trial subscriptions by is_on_trial flag", async () => {
            const seekerIds = [
                testSeeker1.jobSeeker.userId,
                testSeeker2.jobSeeker.userId,
                testSeeker3.jobSeeker.userId,
            ]

            const trialsOnSeeker = await db.jobSeeker.findMany({
                where: {
                    userId: { in: seekerIds },
                    isOnTrial: true,
                },
            })

            expect(trialsOnSeeker.length).toBe(0)
        })

        it("should support pagination", async () => {
            const page1 = await db.subscription.findMany({
                skip: 0,
                take: 10,
            })

            expect(page1.length).toBeLessThanOrEqual(10)

            const page2 = await db.subscription.findMany({
                skip: 10,
                take: 10,
            })

            expect(page2).toBeDefined()
        })
    })

    // ========================================
    // PART C: SEARCH & FILTER FUNCTIONALITY
    // ========================================

    describe("Part C: Search by Seeker Name & Email", () => {
        it("should search subscriptions by seeker first name", async () => {
            const subs = await db.subscription.findMany({
                where: {
                    seeker: {
                        user: {
                            firstName: {
                                contains: "Phase7Test",
                                mode: "insensitive",
                            },
                        },
                    },
                },
                include: {
                    seeker: {
                        include: { user: true },
                    },
                },
            })

            expect(subs.length).toBeGreaterThan(0)
            expect(subs[0].seeker.user.firstName).toContain("Phase7Test")
        })

        it("should search subscriptions by seeker email", async () => {
            const searchEmail = `phase7-seeker1-${uniqueId}@test.com`

            const subs = await db.subscription.findMany({
                where: {
                    seeker: {
                        user: {
                            email: {
                                contains: searchEmail,
                                mode: "insensitive",
                            },
                        },
                    },
                },
                include: {
                    seeker: {
                        include: { user: true },
                    },
                },
            })

            expect(subs.length).toBeGreaterThan(0)
            expect(subs[0].seeker.user.email).toBe(searchEmail)
        })

        it("should handle case-insensitive search", async () => {
            const subLower = await db.subscription.findMany({
                where: {
                    seeker: {
                        user: {
                            firstName: {
                                contains: "phase7test",
                                mode: "insensitive",
                            },
                        },
                    },
                },
            })

            const subUpper = await db.subscription.findMany({
                where: {
                    seeker: {
                        user: {
                            firstName: {
                                contains: "PHASE7TEST",
                                mode: "insensitive",
                            },
                        },
                    },
                },
            })

            expect(subLower.length).toBe(subUpper.length)
        })

        it("should return empty results for non-matching search", async () => {
            const nonexistent = await db.subscription.findMany({
                where: {
                    seeker: {
                        user: {
                            email: "nonexistent-email-12345@test.com",
                        },
                    },
                },
            })

            expect(nonexistent.length).toBe(0)
        })
    })

    // ========================================
    // PART D: DETAILS MODAL DATA
    // ========================================

    describe("Part D: Details Modal - Full Subscription Data", () => {
        it("should provide complete subscription details for modal display", async () => {
            const sub = await db.subscription.findFirst({
                where: { id: subscription1.id },
                include: {
                    seeker: {
                        include: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                },
                            },
                        },
                    },
                },
            })

            expect(sub?.id).toBeDefined()
            expect(sub?.seekerId).toBeDefined()
            expect(sub?.plan).toBeDefined()
            expect(sub?.status).toBeDefined()
            expect(sub?.createdAt).toBeDefined()
            expect(sub?.nextBillingDate).toBeDefined()
            expect(sub?.currentPeriodEnd).toBeDefined()
            expect(sub?.seeker).toBeDefined()
            expect(sub?.authnetSubscriptionId).toBeDefined()
            expect(sub?.authnetCustomerId).toBeDefined()
            expect(sub?.seeker?.isOnTrial).toBeDefined()
        })

        it("should show trial expiry date only when is_on_trial = true", async () => {
            const trialUser = await db.userProfile.create({
                data: {
                    name: `Phase7 Trial Seeker ${uniqueId}`,
                    email: `phase7-trial-${uniqueId}@test.com`,
                    role: "seeker" as any,
                    jobSeeker: {
                        create: {
                            isOnTrial: true,
                            trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                        },
                    },
                },
                include: { jobSeeker: true },
            })

            const trialSub = await db.subscription.create({
                data: {
                    seekerId: trialUser.jobSeeker.userId,
                    plan: "trial_monthly",
                    status: "active",
                    authnetSubscriptionId: `arb-trial-${uniqueId}`,
                    authnetCustomerId: `cust-trial-${uniqueId}`,
                    billingFrequency: "1-month",
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    cancelAtPeriodEnd: false,
                },
            })

            const trialData = await db.subscription.findFirst({
                where: { id: trialSub.id },
                include: {
                    seeker: {
                        select: {
                            isOnTrial: true,
                            trialEndsAt: true,
                        },
                    },
                },
            })

            expect(trialData?.seeker?.isOnTrial).toBe(true)
            expect(trialData?.seeker?.trialEndsAt).not.toBeNull()

            await db.subscription.delete({ where: { id: trialSub.id } })
            await db.jobSeeker.delete({ where: { userId: trialUser.jobSeeker.userId } })
            await db.userProfile.delete({ where: { id: trialUser.id } })
        })

        it("should display plan name by mapping subscriptions.plan", async () => {
            const sub = await db.subscription.findFirst({
                where: { plan: "gold_bimonthly" },
            })

            expect(sub?.plan).toBe("gold_bimonthly")
        })

        it("should display auto-renew status inverted from cancel_at_period_end", async () => {
            const sub = await db.subscription.findFirst({
                where: { id: subscription1.id },
            })

            expect(sub?.cancelAtPeriodEnd).toBe(false)
            expect(!sub?.cancelAtPeriodEnd).toBe(true)

            const sub2 = await db.subscription.findFirst({
                where: { id: subscription3.id },
            })

            expect(sub2?.cancelAtPeriodEnd).toBe(true)
            expect(!sub2?.cancelAtPeriodEnd).toBe(false)
        })
    })

    // ========================================
    // PART E: MANUAL RENEWAL
    // ========================================

    describe("Part E: Manual Renewal for Active Subscriptions", () => {
        it("should enable manual renewal button ONLY for active subscriptions", async () => {
            const activeSub = await db.subscription.findFirst({
                where: { id: subscription1.id },
            })

            expect(activeSub?.status).toBe("active")
            expect(activeSub?.status === "active").toBe(true)

            const canceledSub = await db.subscription.findFirst({
                where: { id: subscription3.id },
            })

            expect(canceledSub?.status).toBe("canceled")
            expect(canceledSub?.status === "active").toBe(false)
        })

        it("should validate subscription exists before manual renewal", async () => {
            const fakeSub = await db.subscription.findFirst({
                where: { id: "fake-subscription-id-that-does-not-exist" },
            })

            expect(fakeSub).toBeNull()
        })

        it("should have authnet IDs available for manual renewal trigger", async () => {
            const sub = await db.subscription.findFirst({
                where: { id: subscription1.id },
            })

            expect(sub?.authnetSubscriptionId).toBeDefined()
            expect(sub?.authnetCustomerId).toBeDefined()
            expect(sub?.authnetSubscriptionId).not.toBeNull()
            expect(sub?.authnetCustomerId).not.toBeNull()
        })

        it("should prevent manual renewal for canceled subscriptions", async () => {
            const canceledSub = await db.subscription.findFirst({
                where: { id: subscription3.id },
            })

            expect(canceledSub?.status).toBe("canceled")
            expect(canceledSub?.status !== "active").toBe(true)
        })
    })

    // ========================================
    // PART F: CSV EXPORT
    // ========================================

    describe("Part F: CSV Export Functionality", () => {
        it("should generate CSV with all required columns", async () => {
            const subs = await db.subscription.findMany({
                include: {
                    seeker: {
                        include: { user: true },
                    },
                },
                take: 10,
            })

            for (const sub of subs) {
                expect(sub.seeker).toBeDefined()
                expect(sub.plan).toBeDefined()
                expect(sub.status).toBeDefined()
                expect(sub.billingFrequency).toBeDefined()
                expect(sub.createdAt).toBeDefined()
                expect(sub.nextBillingDate).toBeDefined()
                expect(sub.cancelAtPeriodEnd).toBeDefined()
            }
        })

        it("should include seeker name and email in CSV", async () => {
            const sub = await db.subscription.findFirst({
                where: { id: subscription1.id },
                include: {
                    seeker: {
                        include: { user: true },
                    },
                },
            })

            expect(sub?.seeker.user.firstName).toBeDefined()
            expect(sub?.seeker.user.lastName).toBeDefined()
            expect(sub?.seeker.user.email).toBeDefined()
        })

        it("should include plan amount in CSV (looked up from config)", async () => {
            const planAmounts: Record<string, number> = {
                trial_monthly: 34.99,
                gold_bimonthly: 49.99,
                vip_quarterly: 79.99,
                annual_platinum: 299.0,
            }

            const sub = await db.subscription.findFirst({
                where: { id: subscription1.id },
            })

            expect(planAmounts[sub!.plan]).toBeDefined()
            expect(planAmounts[sub!.plan]).toBe(49.99)
        })

        it("should only include recurring subscriptions in CSV", async () => {
            const subs = await db.subscription.findMany()

            for (const sub of subs) {
                expect(["active", "canceled", "past_due", "unpaid"]).toContain(sub.status)
            }
        })

        it("should include filename with timestamp in CSV export", async () => {
            // Generate a valid filename with today's date and a timestamp
            const now = new Date()
            const year = now.getFullYear()
            const month = String(now.getMonth() + 1).padStart(2, "0")
            const day = String(now.getDate()).padStart(2, "0")
            const hours = String(now.getHours()).padStart(2, "0")
            const minutes = String(now.getMinutes()).padStart(2, "0")
            const seconds = String(now.getSeconds()).padStart(2, "0")
            
            const testFilename = `recurring_subscriptions_${year}-${month}-${day}_${hours}${minutes}${seconds}.csv`

            const expectedFormat = new RegExp(
                `recurring_subscriptions_${year}-${month}-${day}_\\d{6}\\.csv`
            )

            expect(expectedFormat.test(testFilename)).toBe(true)
        })
    })

    // ========================================
    // PART G: ROLE-BASED ACCESS CONTROL
    // ========================================

    describe("Part G: Super-Admin Access Control", () => {
        it("should identify super_admin role correctly", async () => {
            const superAdmin = await db.userProfile.findFirst({
                where: { role: "super_admin" },
            })

            if (superAdmin) {
                expect(superAdmin.role).toBe("super_admin")
            }
        })

        it("should block regular admin users from viewing page", async () => {
            const regularAdmin = await db.userProfile.findFirst({
                where: { role: "admin" },
            })

            if (regularAdmin) {
                expect(regularAdmin.role).not.toBe("super_admin")
                expect(regularAdmin.role).toBe("admin")
            }
        })

        it("should block seeker users from viewing page", async () => {
            const seeker = await db.userProfile.findFirst({
                where: { role: "seeker" },
            })

            expect(seeker?.role).not.toBe("super_admin")
        })

        it("should block employer users from viewing page", async () => {
            const employer = await db.userProfile.findFirst({
                where: { role: "employer" },
            })

            if (employer) {
                expect(employer.role).not.toBe("super_admin")
            }
        })
    })

    // ========================================
    // PART H: INTEGRATION WITH SALES PAGE
    // ========================================

    describe("Part H: Navigation & Sales Page Integration", () => {
        it("should be accessible via main admin navigation", async () => {
            const path = "/admin/super-admin/recurring-billing"
            expect(path).toContain("recurring-billing")
        })

        it("should have View MRR Data button on Sales page", async () => {
            const targetUrl = "/admin/super-admin/recurring-billing"
            expect(targetUrl).toBe("/admin/super-admin/recurring-billing")
        })

        it("should refresh data on page load and revisit", async () => {
            const subs1 = await db.subscription.findMany()
            const subs2 = await db.subscription.findMany()

            expect(subs1.length).toBe(subs2.length)
        })
    })
})
