/**
 * Phase 1: Database Schema Tests for Concierge Pricing Tier Realignment
 * 
 * These tests verify the database schema changes for the new concierge pricing structure:
 * - concierge_level_3 enum value added
 * - concierge_lite maintained for backward compatibility
 * - Existing packages remain functional
 */

import { db } from "@/lib/db";
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "@jest/globals";
import { PackageType } from "@prisma/client";

const TEST_PREFIX = 'JEST_CONCIERGE_PRICING_P1_';

describe('Phase 1: Database Schema Updates', () => {
    let testUserProfile: any;
    let testEmployer: any;
    let createdPackageIds: string[] = [];

    beforeAll(async () => {
        // Create test user with employer profile
        testUserProfile = await db.userProfile.create({
            data: {
                name: `${TEST_PREFIX}Test Employer`,
                email: `${TEST_PREFIX}${Date.now()}@test.com`,
                role: "employer",
                clerkUserId: `${TEST_PREFIX}clerk_${Date.now()}`,
            },
        });

        testEmployer = await db.employer.create({
            data: {
                userId: testUserProfile.id,
                companyName: `${TEST_PREFIX}Test Company`,
            },
        });

        console.log("✅ Phase 1 Test setup complete:", testUserProfile.id);
    });

    afterAll(async () => {
        // Cleanup: Delete all test data
        try {
            // Delete test packages
            if (createdPackageIds.length > 0) {
                await db.employerPackage.deleteMany({
                    where: { id: { in: createdPackageIds } },
                });
            }

            // Delete test employer
            if (testEmployer) {
                await db.employer.delete({
                    where: { userId: testEmployer.userId },
                });
            }

            // Delete test user profile
            if (testUserProfile) {
                await db.userProfile.delete({
                    where: { id: testUserProfile.id },
                });
            }

            console.log("✅ Phase 1 Test cleanup completed");
        } catch (err) {
            console.log("Cleanup note:", (err as any).message);
        }
    });

    afterEach(async () => {
        // Clean up any packages created in individual tests
        if (createdPackageIds.length > 0) {
            await db.employerPackage.deleteMany({
                where: { id: { in: createdPackageIds } },
            });
            createdPackageIds = [];
        }
    });

    describe('PackageType Enum', () => {
        it('should include concierge_level_1 as valid package type', async () => {
            const pkg = await db.employerPackage.create({
                data: {
                    employerId: testEmployer.userId,
                    packageType: 'concierge_level_1' as PackageType,
                    listingsRemaining: 1,
                    purchasedAt: new Date(),
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
            });

            createdPackageIds.push(pkg.id);
            expect(pkg.packageType).toBe('concierge_level_1');
        });

        it('should include concierge_level_2 as valid package type', async () => {
            const pkg = await db.employerPackage.create({
                data: {
                    employerId: testEmployer.userId,
                    packageType: 'concierge_level_2' as PackageType,
                    listingsRemaining: 1,
                    purchasedAt: new Date(),
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
            });

            createdPackageIds.push(pkg.id);
            expect(pkg.packageType).toBe('concierge_level_2');
        });

        it('should include concierge_level_3 as valid package type', async () => {
            const pkg = await db.employerPackage.create({
                data: {
                    employerId: testEmployer.userId,
                    packageType: 'concierge_level_3' as PackageType,
                    listingsRemaining: 1,
                    purchasedAt: new Date(),
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
            });

            createdPackageIds.push(pkg.id);
            expect(pkg.packageType).toBe('concierge_level_3');
        });

        it('should still support concierge_lite for backward compatibility', async () => {
            const pkg = await db.employerPackage.create({
                data: {
                    employerId: testEmployer.userId,
                    packageType: 'concierge_lite' as PackageType,
                    listingsRemaining: 1,
                    purchasedAt: new Date(),
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
            });

            createdPackageIds.push(pkg.id);
            expect(pkg.packageType).toBe('concierge_lite');
        });
    });

    describe('Existing Data Integrity', () => {
        it('should not break existing concierge_lite packages query', async () => {
            // Create a concierge_lite package
            const pkg = await db.employerPackage.create({
                data: {
                    employerId: testEmployer.userId,
                    packageType: 'concierge_lite' as PackageType,
                    listingsRemaining: 1,
                    purchasedAt: new Date(),
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
            });
            createdPackageIds.push(pkg.id);

            // Query it back
            const found = await db.employerPackage.findUnique({
                where: { id: pkg.id },
            });

            expect(found).not.toBeNull();
            expect(found?.packageType).toBe('concierge_lite');
        });

        it('should allow querying all concierge packages together', async () => {
            // Create packages of each type
            const pkg1 = await db.employerPackage.create({
                data: {
                    employerId: testEmployer.userId,
                    packageType: 'concierge_level_1' as PackageType,
                    listingsRemaining: 1,
                    purchasedAt: new Date(),
                },
            });
            createdPackageIds.push(pkg1.id);

            const pkg2 = await db.employerPackage.create({
                data: {
                    employerId: testEmployer.userId,
                    packageType: 'concierge_level_2' as PackageType,
                    listingsRemaining: 1,
                    purchasedAt: new Date(),
                },
            });
            createdPackageIds.push(pkg2.id);

            const pkg3 = await db.employerPackage.create({
                data: {
                    employerId: testEmployer.userId,
                    packageType: 'concierge_level_3' as PackageType,
                    listingsRemaining: 1,
                    purchasedAt: new Date(),
                },
            });
            createdPackageIds.push(pkg3.id);

            // Query all concierge packages
            const allConcierge = await db.employerPackage.findMany({
                where: {
                    employerId: testEmployer.userId,
                    packageType: {
                        in: ['concierge_lite', 'concierge_level_1', 'concierge_level_2', 'concierge_level_3'] as PackageType[],
                    },
                },
            });

            expect(allConcierge.length).toBeGreaterThanOrEqual(3);
        });
    });
});

describe('Phase 1: Cleanup Verification', () => {
    it('should verify no Phase 1 test data remains in database', async () => {
        const testUsers = await db.userProfile.findMany({
            where: { email: { startsWith: TEST_PREFIX } },
        });

        expect(testUsers.length).toBe(0);
    });

    it('should verify no test employers remain', async () => {
        const testEmployers = await db.employer.findMany({
            where: { companyName: { startsWith: TEST_PREFIX } },
        });

        expect(testEmployers.length).toBe(0);
    });
});
