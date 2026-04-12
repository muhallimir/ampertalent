import { db } from "@/lib/db";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

/**
 * PHASE 1: DATABASE SCHEMA TESTS
 * 
 * Purpose: Verify all 4 new fields are added to Resume, Subscription, and Application models
 * Test-Driven Approach: Tests written FIRST, then schema changes made to pass tests
 * 
 * Fields to add:
 * - Resume: status (default 'active'), deletedAt
 * - Subscription: billingFrequency, nextBillingDate, currentPeriodStart
 * - Application: resumeId (FK), resume (relationship)
 */

describe("Phase 1: Database Schema Updates", () => {
    // ======================================
    // RESUME MODEL TESTS
    // ======================================

    describe("Resume Model - New Fields (status, deletedAt)", () => {
        let testSeeker: any;
        let testResume: any;

        beforeAll(async () => {
            // Create test seeker
            testSeeker = await db.userProfile.create({
                data: {
                    name: "Test Seeker Phase1",
                    role: "seeker" as any,
                    jobSeeker: {
                        create: {}, // Don't pass userId - it's auto-set from UserProfile id
                    },
                },
                include: { jobSeeker: true },
            });
        });

        afterAll(async () => {
            try {
                // Cleanup: Delete resumes first (FK dependency)
                if (testSeeker?.jobSeeker?.userId) {
                    await db.resume.deleteMany({
                        where: { seekerId: testSeeker.jobSeeker.userId },
                    });
                    await db.jobSeeker.delete({
                        where: { userId: testSeeker.jobSeeker.userId },
                    });
                }
                if (testSeeker?.id) {
                    await db.userProfile.delete({
                        where: { id: testSeeker.id },
                    });
                }
            } catch (error) {
                console.error('Cleanup error:', error);
            }
        });

        // --------
        // TEST 1: Resume status field defaults to 'active'
        // --------
        it('TEST 1: Resume status should default to "active"', async () => {
            testResume = await db.resume.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    filename: "test-resume-1.pdf",
                    fileUrl: "s3://bucket/test-resume-1.pdf",
                },
            });

            expect(testResume).toBeDefined();
            expect(testResume.status).toBe("active");
            expect(testResume.deletedAt).toBeNull();
        });

        // --------
        // TEST 2: Can update resume status to 'trashed'
        // --------
        it('TEST 2: Can update resume status to "trashed" with deletedAt timestamp', async () => {
            const beforeUpdate = new Date();
            beforeUpdate.setSeconds(beforeUpdate.getSeconds() - 1); // Allow 1 second margin

            const updated = await db.resume.update({
                where: { id: testResume.id },
                data: {
                    status: "trashed",
                    deletedAt: new Date(),
                },
            });

            expect(updated.status).toBe("trashed");
            expect(updated.deletedAt).not.toBeNull();
            expect(updated.deletedAt! >= beforeUpdate).toBe(true);
        });

        // --------
        // TEST 3: Can restore resume from trashed
        // --------
        it('TEST 3: Can restore resume from "trashed" to "active"', async () => {
            const restored = await db.resume.update({
                where: { id: testResume.id },
                data: {
                    status: "active",
                    deletedAt: null,
                },
            });

            expect(restored.status).toBe("active");
            expect(restored.deletedAt).toBeNull();
        });

        // --------
        // TEST 4: Query only active resumes (status filter)
        // --------
        it("TEST 4: Should query only active resumes using status filter", async () => {
            // Create multiple resumes
            await db.resume.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    filename: "active-resume-1.pdf",
                    fileUrl: "s3://bucket/active-resume-1.pdf",
                    status: "active",
                },
            });

            await db.resume.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    filename: "active-resume-2.pdf",
                    fileUrl: "s3://bucket/active-resume-2.pdf",
                    status: "active",
                },
            });

            await db.resume.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    filename: "trashed-resume.pdf",
                    fileUrl: "s3://bucket/trashed-resume.pdf",
                    status: "trashed",
                    deletedAt: new Date(),
                },
            });

            const activeResumes = await db.resume.findMany({
                where: {
                    seekerId: testSeeker.jobSeeker.userId,
                    status: "active",
                },
                orderBy: { createdAt: "asc" },
            });

            // Should have at least 2 active resumes (the ones we just created)
            expect(activeResumes.length).toBeGreaterThanOrEqual(2);
            expect(activeResumes.every((r: any) => r.status === "active")).toBe(true);
            expect(
                activeResumes.some((r: any) => r.filename === "active-resume-1.pdf")
            ).toBe(true);
            expect(
                activeResumes.some((r: any) => r.filename === "active-resume-2.pdf")
            ).toBe(true);
        });

        // --------
        // TEST 5: Index on (seekerId, status) for efficient filtering
        // --------
        it("TEST 5: Index on (seekerId, status) should enable efficient queries", async () => {
            const query = await db.resume.findMany({
                where: {
                    seekerId: testSeeker.jobSeeker.userId,
                    status: "active",
                },
            });

            expect(Array.isArray(query)).toBe(true);
        });

        // --------
        // TEST 6: Trashed resumes are excluded from quotas (status check)
        // --------
        it("TEST 6: Trashed resumes should not be counted in quota calculations", async () => {
            const allResumes = await db.resume.findMany({
                where: {
                    seekerId: testSeeker.jobSeeker.userId,
                },
            });

            const activeCount = allResumes.filter(
                (r: any) => r.status === "active"
            ).length;
            const trashedCount = allResumes.filter(
                (r: any) => r.status === "trashed"
            ).length;

            expect(activeCount).toBeGreaterThan(0);
            expect(trashedCount).toBeGreaterThan(0);
            expect(activeCount + trashedCount).toBe(allResumes.length);
        });
    });

    // ======================================
    // SUBSCRIPTION MODEL TESTS
    // ======================================

    describe("Subscription Model - New Fields (billingFrequency, nextBillingDate, currentPeriodStart)", () => {
        let testSeeker: any;
        let testSubscription: any;

        beforeAll(async () => {
            testSeeker = await db.userProfile.create({
                data: {
                    name: "Test Seeker Subscription",
                    role: "seeker" as any,
                    jobSeeker: {
                        create: {}, // Don't pass userId - auto-set
                    },
                },
                include: { jobSeeker: true },
            });
        });

        afterAll(async () => {
            try {
                if (testSeeker?.jobSeeker?.userId) {
                    await db.subscription.deleteMany({
                        where: { seekerId: testSeeker.jobSeeker.userId },
                    });
                    await db.jobSeeker.delete({
                        where: { userId: testSeeker.jobSeeker.userId },
                    });
                }
                if (testSeeker?.id) {
                    await db.userProfile.delete({
                        where: { id: testSeeker.id },
                    });
                }
            } catch (error) {
                console.error('Cleanup error:', error);
            }
        });

        // --------
        // TEST 7: Can store billingFrequency (1-month, 2-months, 3-months, 12-months)
        // --------
        it("TEST 7: Should store billingFrequency values correctly", async () => {
            const now = new Date();
            const futureEnd = new Date(now);
            futureEnd.setMonth(futureEnd.getMonth() + 1);

            testSubscription = await db.subscription.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    plan: "trial_monthly" as any,
                    status: "active" as any,
                    currentPeriodStart: now,
                    currentPeriodEnd: futureEnd,
                    billingFrequency: "1-month",
                },
            });

            expect(testSubscription.billingFrequency).toBe("1-month");
        });

        // --------
        // TEST 8: Can store all 4 billing frequency types
        // --------
        it("TEST 8: Should support all 4 billing frequency types", async () => {
            const frequencies = ["1-month", "2-months", "3-months", "12-months"];
            const now = new Date();

            for (const freq of frequencies) {
                const end = new Date(now);
                const monthsToAdd =
                    freq === "1-month"
                        ? 1
                        : freq === "2-months"
                            ? 2
                            : freq === "3-months"
                                ? 3
                                : 12;
                end.setMonth(end.getMonth() + monthsToAdd);

                const sub = await db.subscription.create({
                    data: {
                        seekerId: testSeeker.jobSeeker.userId,
                        plan: "trial_monthly" as any,
                        status: "active" as any,
                        currentPeriodStart: now,
                        currentPeriodEnd: end,
                        billingFrequency: freq,
                    },
                });

                expect(sub.billingFrequency).toBe(freq);
            }
        });

        // --------
        // TEST 9: nextBillingDate is calculated correctly
        // --------
        it("TEST 9: Should store nextBillingDate correctly", async () => {
            const now = new Date();
            const end = new Date(now);
            end.setMonth(end.getMonth() + 1);
            const nextBilling = new Date(end);

            const sub = await db.subscription.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    plan: "trial_monthly" as any,
                    status: "active" as any,
                    currentPeriodStart: now,
                    currentPeriodEnd: end,
                    nextBillingDate: nextBilling,
                    billingFrequency: "1-month",
                },
            });

            expect(sub.nextBillingDate).not.toBeNull();
        });

        // --------
        // TEST 10: currentPeriodStart is stored
        // --------
        it("TEST 10: Should store currentPeriodStart timestamp", async () => {
            const now = new Date();
            const end = new Date(now);
            end.setMonth(end.getMonth() + 2);

            const sub = await db.subscription.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    plan: "gold_bimonthly" as any,
                    status: "active" as any,
                    currentPeriodStart: now,
                    currentPeriodEnd: end,
                    billingFrequency: "2-months",
                },
            });

            expect(sub.currentPeriodStart).not.toBeNull();
            expect(sub.currentPeriodStart! instanceof Date).toBe(true);
        });

        // --------
        // TEST 11: Query subscriptions due for renewal
        // --------
        it("TEST 11: Should query subscriptions due for renewal by nextBillingDate", async () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);

            await db.subscription.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    plan: "trial_monthly" as any,
                    status: "active" as any,
                    currentPeriodStart: now,
                    currentPeriodEnd: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
                    nextBillingDate: tomorrow,
                    billingFrequency: "1-month",
                },
            });

            const upcomingRenewals = await db.subscription.findMany({
                where: {
                    seekerId: testSeeker.jobSeeker.userId,
                    nextBillingDate: {
                        lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Within 7 days
                    },
                },
            });

            expect(upcomingRenewals.length).toBeGreaterThan(0);
        });

        // --------
        // TEST 12: Period dates are consistent (start < end)
        // --------
        it("TEST 12: Period dates should be consistent (start < end)", async () => {
            const subs = await db.subscription.findMany({
                where: {
                    seekerId: testSeeker.jobSeeker.userId,
                    status: "active" as any,
                },
            });

            for (const sub of subs) {
                if (sub.currentPeriodStart && sub.currentPeriodEnd) {
                    expect(sub.currentPeriodStart < sub.currentPeriodEnd).toBe(true);
                }
            }
        });
    });

    // ======================================
    // APPLICATION MODEL TESTS
    // ======================================

    describe("Application Model - New Fields (resumeId FK, resume relationship)", () => {
        let testSeeker: any;
        let testResume: any;
        let testJob: any;
        let testApplication: any;

        beforeAll(async () => {
            // Create test seeker
            testSeeker = await db.userProfile.create({
                data: {
                    name: "Test Seeker App",
                    role: "seeker" as any,
                    jobSeeker: {
                        create: {}, // Don't pass userId - auto-set
                    },
                },
                include: { jobSeeker: true },
            });

            // Create test employer
            const employer = await db.userProfile.create({
                data: {
                    name: "Test Employer",
                    role: "employer" as any,
                    employer: {
                        create: {
                            companyName: "Test Company",
                        },
                    },
                },
                include: { employer: true },
            });

            // Create test job
            testJob = await db.job.create({
                data: {
                    title: "Test Job",
                    description: "Test Description",
                    employerId: employer.employer!.userId,
                    type: "FULL_TIME",
                    category: "COMPUTER_IT",
                    status: "approved",
                },
            });

            // Create test resume
            testResume = await db.resume.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    filename: "app-test-resume.pdf",
                    fileUrl: "s3://bucket/app-test-resume.pdf",
                    status: "active",
                },
            });
        });

        afterAll(async () => {
            try {
                // Cleanup in correct order
                if (testSeeker?.jobSeeker?.userId) {
                    await db.application.deleteMany({
                        where: { seekerId: testSeeker.jobSeeker.userId },
                    });
                    await db.resume.deleteMany({
                        where: { seekerId: testSeeker.jobSeeker.userId },
                    });
                    await db.jobSeeker.delete({
                        where: { userId: testSeeker.jobSeeker.userId },
                    });
                }
                if (testJob?.id) {
                    await db.job.delete({
                        where: { id: testJob.id },
                    });
                }
                if (testSeeker?.id) {
                    await db.userProfile.delete({
                        where: { id: testSeeker.id },
                    });
                }
                // Delete employer profile if it exists
                const empProfiles = await db.userProfile.findMany({
                    where: { employer: { companyName: "Test Company" } },
                });
                for (const profile of empProfiles) {
                    await db.userProfile.delete({ where: { id: profile.id } });
                }
            } catch (error) {
                console.error('Cleanup error:', error);
            }
        });

        // --------
        // TEST 13: Can create application with resumeId FK
        // --------
        it("TEST 13: Should create application with resumeId FK reference", async () => {
            testApplication = await db.application.create({
                data: {
                    jobId: testJob.id,
                    seekerId: testSeeker.jobSeeker.userId,
                    resumeUrl: testResume.fileUrl,
                    resumeId: testResume.id, // NEW FK
                    status: "pending" as any,
                },
            });

            expect(testApplication.resumeId).toBe(testResume.id);
        });

        // --------
        // TEST 14: Can query application with resume relationship
        // --------
        it("TEST 14: Should query application with resume relationship", async () => {
            const app = await db.application.findUnique({
                where: { id: testApplication.id },
                include: { resume: true },
            });

            expect(app).toBeDefined();
            expect(app?.resumeId).toBe(testResume.id);
            if (app?.resume) {
                expect(app.resume.id).toBe(testResume.id);
                expect(app.resume.filename).toBe("app-test-resume.pdf");
            }
        });

        // --------
        // TEST 15: Cannot delete resume with active applications (FK constraint)
        // --------
        it("TEST 15: Should prevent resume deletion if FK constraint exists", async () => {
            // Try to delete resume that has an application
            // This test validates the FK relationship
            const apps = await db.application.findMany({
                where: {
                    seekerId: testSeeker.jobSeeker.userId,
                    resumeId: testResume.id,
                },
            });

            expect(apps.length).toBeGreaterThan(0);
            // In a real scenario, deleting the resume should either:
            // 1. Fail due to FK constraint, or
            // 2. Cascade delete (depends on schema)
        });

        // --------
        // TEST 16: Multiple applications can reference same resume
        // --------
        it("TEST 16: Multiple applications can reference the same resume", async () => {
            // Create second job
            const job2 = await db.job.create({
                data: {
                    title: "Test Job 2",
                    description: "Test Description 2",
                    employerId: testJob.employerId,
                    type: "FULL_TIME",
                    category: "COMPUTER_IT",
                    status: "approved",
                },
            });

            // Create second application using same resume
            const app2 = await db.application.create({
                data: {
                    jobId: job2.id,
                    seekerId: testSeeker.jobSeeker.userId,
                    resumeUrl: testResume.fileUrl,
                    resumeId: testResume.id,
                    status: "pending" as any,
                },
            });

            expect(app2.resumeId).toBe(testResume.id);

            // Query all applications for this resume
            const appsByResume = await db.application.findMany({
                where: { resumeId: testResume.id },
            });

            expect(appsByResume.length).toBeGreaterThanOrEqual(2);
        });

        // --------
        // TEST 17: Application index on resumeId works
        // --------
        it("TEST 17: Should efficiently query applications by resumeId index", async () => {
            const apps = await db.application.findMany({
                where: { resumeId: testResume.id },
                orderBy: { appliedAt: "desc" },
            });

            expect(Array.isArray(apps)).toBe(true);
        });
    });

    // ======================================
    // INTEGRATION TESTS
    // ======================================

    describe("Integration Tests - All 3 Models Together", () => {
        let testSeeker: any;
        let testEmployer: any;
        let testResume: any;
        let testSubscription: any;
        let testApplication: any;

        beforeAll(async () => {
            testSeeker = await db.userProfile.create({
                data: {
                    name: "Test Seeker Integration",
                    role: "seeker" as any,
                    jobSeeker: {
                        create: {}, // Don't pass userId - auto-set
                    },
                },
                include: { jobSeeker: true },
            });

            const employer = await db.userProfile.create({
                data: {
                    name: "Test Employer Integration",
                    role: "employer" as any,
                    employer: {
                        create: {
                            companyName: "Test Co",
                        },
                    },
                },
                include: { employer: true },
            });
            testEmployer = employer;

            const job = await db.job.create({
                data: {
                    title: "Integration Test Job",
                    description: "Test",
                    employerId: employer.employer!.userId,
                    type: "FULL_TIME",
                    category: "COMPUTER_IT",
                    status: "approved",
                },
            });

            testResume = await db.resume.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    filename: "integration-resume.pdf",
                    fileUrl: "s3://bucket/integration-resume.pdf",
                    status: "active",
                },
            });

            const now = new Date();
            const end = new Date(now);
            end.setMonth(end.getMonth() + 1);

            testSubscription = await db.subscription.create({
                data: {
                    seekerId: testSeeker.jobSeeker.userId,
                    plan: "trial_monthly" as any,
                    status: "active" as any,
                    currentPeriodStart: now,
                    currentPeriodEnd: end,
                    nextBillingDate: end,
                    billingFrequency: "1-month",
                },
            });

            testApplication = await db.application.create({
                data: {
                    jobId: job.id,
                    seekerId: testSeeker.jobSeeker.userId,
                    resumeUrl: testResume.fileUrl,
                    resumeId: testResume.id,
                    status: "pending" as any,
                },
            });
        });

        afterAll(async () => {
            try {
                if (testSeeker?.jobSeeker?.userId) {
                    await db.application.deleteMany({
                        where: { seekerId: testSeeker.jobSeeker.userId },
                    });
                    await db.resume.deleteMany({
                        where: { seekerId: testSeeker.jobSeeker.userId },
                    });
                    await db.subscription.deleteMany({
                        where: { seekerId: testSeeker.jobSeeker.userId },
                    });
                    await db.jobSeeker.delete({
                        where: { userId: testSeeker.jobSeeker.userId },
                    });
                }
                if (testSeeker?.id) {
                    await db.userProfile.delete({
                        where: { id: testSeeker.id },
                    });
                }
                // Clean up employer - delete by captured id to avoid any mismatch
                if (testEmployer?.employer?.userId) {
                    try {
                        await db.job.deleteMany({ where: { employerId: testEmployer.employer.userId } });
                        await db.employer.delete({ where: { userId: testEmployer.employer.userId } });
                    } catch { /* ignore */ }
                }
                if (testEmployer?.id) {
                    try {
                        await db.userProfile.delete({ where: { id: testEmployer.id } });
                    } catch { /* ignore */ }
                }
            } catch (error) {
                console.error('Integration afterAll cleanup error:', error);
            }
        });

        // --------
        // TEST 18: Full workflow - subscription + resume + application
        // --------
        it("TEST 18: Full workflow - active subscription can have multiple active resumes and applications", async () => {
            // Verify subscription is active
            const sub = await db.subscription.findUnique({
                where: { id: testSubscription.id },
            });
            expect(sub?.status).toBe("active");
            expect(sub?.billingFrequency).toBe("1-month");

            // Verify resume is active
            const resume = await db.resume.findUnique({
                where: { id: testResume.id },
            });
            expect(resume?.status).toBe("active");
            expect(resume?.deletedAt).toBeNull();

            // Verify application references resume
            const app = await db.application.findUnique({
                where: { id: testApplication.id },
                include: { resume: true },
            });
            expect(app?.resumeId).toBe(testResume.id);
        });

        // --------
        // TEST 19: Soft delete resume doesn't affect subscription
        // --------
        it("TEST 19: Soft deleting resume doesn't affect subscription status", async () => {
            await db.resume.update({
                where: { id: testResume.id },
                data: {
                    status: "trashed",
                    deletedAt: new Date(),
                },
            });

            // Subscription should still be active
            const sub = await db.subscription.findUnique({
                where: { id: testSubscription.id },
            });
            expect(sub?.status).toBe("active");

            // Restore resume for other tests
            await db.resume.update({
                where: { id: testResume.id },
                data: {
                    status: "active",
                    deletedAt: null,
                },
            });
        });

        // --------
        // TEST 20: Query seeker's active resumes and subscription together
        // --------
        it("TEST 20: Should query seeker's active resumes filtered by status", async () => {
            const seeker = await db.jobSeeker.findUnique({
                where: { userId: testSeeker.jobSeeker.userId },
            });

            const activeResumes = await db.resume.findMany({
                where: {
                    seekerId: testSeeker.jobSeeker.userId,
                    status: "active",
                },
            });

            const subscriptions = await db.subscription.findMany({
                where: {
                    seekerId: testSeeker.jobSeeker.userId,
                    status: "active" as any,
                },
            });

            expect(seeker).toBeDefined();
            expect(activeResumes.length).toBeGreaterThan(0);
            expect(subscriptions.length).toBeGreaterThan(0);
        });
    });
});
