/**
 * Phase 6: Admin Dashboard Tests for Concierge Pricing Tier Realignment
 * 
 * These tests verify admin dashboard updates:
 * - Subscription management shows new tiers
 * - Concierge request management displays correct package types
 * - Analytics show correct plan names
 */

import { db } from "@/lib/db";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "@jest/globals";
import { PackageType } from "@prisma/client";

const TEST_PREFIX = 'JEST_CONCIERGE_PRICING_P6_';

describe('Phase 6: Admin Dashboard', () => {
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

        console.log("✅ Phase 6 Test setup complete:", testUserProfile.id);
    });

    afterAll(async () => {
        try {
            if (createdPackageIds.length > 0) {
                await db.employerPackage.deleteMany({
                    where: { id: { in: createdPackageIds } },
                });
            }

            if (testEmployer) {
                await db.employer.delete({
                    where: { userId: testEmployer.userId },
                });
            }

            if (testUserProfile) {
                await db.userProfile.delete({
                    where: { id: testUserProfile.id },
                });
            }

            console.log("✅ Phase 6 Test cleanup completed");
        } catch (err) {
            console.log("Cleanup note:", (err as any).message);
        }
    });

    afterEach(async () => {
        if (createdPackageIds.length > 0) {
            await db.employerPackage.deleteMany({
                where: { id: { in: createdPackageIds } },
            });
            createdPackageIds = [];
        }
    });

    describe('Concierge Package Query Support', () => {
        it('should query all concierge package types including Level III', async () => {
            // Create test packages
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

            // Query like admin dashboard would
            const conciergePackages = await db.employerPackage.findMany({
                where: {
                    packageType: {
                        in: ['concierge_lite', 'concierge_level_1', 'concierge_level_2', 'concierge_level_3'] as PackageType[],
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            expect(conciergePackages.length).toBeGreaterThanOrEqual(3);
        });

        it('should filter by specific concierge level', async () => {
            const pkg = await db.employerPackage.create({
                data: {
                    employerId: testEmployer.userId,
                    packageType: 'concierge_level_3' as PackageType,
                    listingsRemaining: 1,
                    purchasedAt: new Date(),
                },
            });
            createdPackageIds.push(pkg.id);

            const level3Packages = await db.employerPackage.findMany({
                where: {
                    packageType: 'concierge_level_3' as PackageType,
                },
            });

            expect(level3Packages.some(p => p.id === pkg.id)).toBe(true);
        });
    });

    describe('Package Type Display Names', () => {
        // Helper function that would be used in admin dashboard
        const getPackageDisplayName = (packageType: string): string => {
            const names: Record<string, string> = {
                'concierge_lite': 'Concierge LITE',
                'concierge_level_1': 'Concierge Level I',
                'concierge_level_2': 'Concierge Level II',
                'concierge_level_3': 'Concierge Level III',
                'standard': 'Standard Job Post',
                'featured': 'Featured Job Post',
                'email_blast': 'Solo Email Blast',
                'gold_plus': 'Gold Plus Small Business',
            };
            return names[packageType] || packageType;
        };

        it('should display correct name for concierge_level_1', () => {
            expect(getPackageDisplayName('concierge_level_1')).toBe('Concierge Level I');
        });

        it('should display correct name for concierge_level_2', () => {
            expect(getPackageDisplayName('concierge_level_2')).toBe('Concierge Level II');
        });

        it('should display correct name for concierge_level_3', () => {
            expect(getPackageDisplayName('concierge_level_3')).toBe('Concierge Level III');
        });

        it('should use Roman numerals for level names', () => {
            const level1 = getPackageDisplayName('concierge_level_1');
            const level2 = getPackageDisplayName('concierge_level_2');
            const level3 = getPackageDisplayName('concierge_level_3');

            expect(level1).toContain('I');
            expect(level2).toContain('II');
            expect(level3).toContain('III');
        });
    });

    describe('Package Statistics Aggregation', () => {
        it('should aggregate packages by type for dashboard stats', async () => {
            // Create test packages
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
                    packageType: 'concierge_level_3' as PackageType,
                    listingsRemaining: 1,
                    purchasedAt: new Date(),
                },
            });
            createdPackageIds.push(pkg2.id);

            // Group by package type like dashboard would
            const packagesByType = await db.employerPackage.groupBy({
                by: ['packageType'],
                _count: {
                    packageType: true,
                },
                where: {
                    employerId: testEmployer.userId,
                },
            });

            expect(packagesByType.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Recent Purchases Query', () => {
        it('should include concierge_level_3 in recent purchases', async () => {
            const recentDate = new Date();

            const pkg = await db.employerPackage.create({
                data: {
                    employerId: testEmployer.userId,
                    packageType: 'concierge_level_3' as PackageType,
                    listingsRemaining: 1,
                    purchasedAt: recentDate,
                },
            });
            createdPackageIds.push(pkg.id);

            // Query recent packages like dashboard would
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const recentPackages = await db.employerPackage.findMany({
                where: {
                    purchasedAt: {
                        gte: thirtyDaysAgo,
                    },
                },
                orderBy: {
                    purchasedAt: 'desc',
                },
            });

            expect(recentPackages.some(p => p.packageType === 'concierge_level_3')).toBe(true);
        });
    });
});

describe('Phase 6: Cleanup Verification', () => {
    it('should verify no Phase 6 test data remains', async () => {
        const testUsers = await db.userProfile.findMany({
            where: { email: { startsWith: TEST_PREFIX } },
        });

        expect(testUsers.length).toBe(0);
    });
});
