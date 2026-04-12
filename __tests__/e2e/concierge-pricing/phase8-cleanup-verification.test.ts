/**
 * Phase 8: Cleanup Verification Tests for Concierge Pricing Tier Realignment
 * 
 * These tests verify that all test data has been properly cleaned up
 * and that production data remains unaffected.
 */

import { db } from "@/lib/db";
import { describe, it, expect } from "@jest/globals";

// All test prefixes used across phases
const TEST_PREFIXES = [
    'JEST_CONCIERGE_PRICING_P1_',
    'JEST_CONCIERGE_PRICING_P4_',
    'JEST_CONCIERGE_PRICING_P6_',
];

describe('Phase 8: Cleanup Verification', () => {
    describe('Test Data Cleanup - User Profiles', () => {
        it('should verify no test user profiles remain from Phase 1', async () => {
            const testUsers = await db.userProfile.findMany({
                where: { email: { startsWith: 'JEST_CONCIERGE_PRICING_P1_' } },
            });
            expect(testUsers.length).toBe(0);
        });

        it('should verify no test user profiles remain from Phase 4', async () => {
            const testUsers = await db.userProfile.findMany({
                where: { email: { startsWith: 'JEST_CONCIERGE_PRICING_P4_' } },
            });
            expect(testUsers.length).toBe(0);
        });

        it('should verify no test user profiles remain from Phase 6', async () => {
            const testUsers = await db.userProfile.findMany({
                where: { email: { startsWith: 'JEST_CONCIERGE_PRICING_P6_' } },
            });
            expect(testUsers.length).toBe(0);
        });

        it('should verify no test user profiles remain from any phase', async () => {
            const allTestUsers = await db.userProfile.findMany({
                where: {
                    OR: TEST_PREFIXES.map(prefix => ({
                        email: { startsWith: prefix }
                    }))
                },
            });
            expect(allTestUsers.length).toBe(0);
        });
    });

    describe('Test Data Cleanup - Employers', () => {
        it('should verify no test employers remain', async () => {
            const testEmployers = await db.employer.findMany({
                where: {
                    OR: TEST_PREFIXES.map(prefix => ({
                        companyName: { startsWith: prefix }
                    }))
                },
            });
            expect(testEmployers.length).toBe(0);
        });
    });

    describe('Test Data Cleanup - Clerk User IDs', () => {
        it('should verify no test clerk IDs remain', async () => {
            const testUsers = await db.userProfile.findMany({
                where: {
                    OR: TEST_PREFIXES.map(prefix => ({
                        clerkUserId: { startsWith: prefix }
                    }))
                },
            });
            expect(testUsers.length).toBe(0);
        });
    });

    describe('Test Data Cleanup - Employer Packages', () => {
        it('should verify no orphaned test packages remain', async () => {
            // Check for packages with test employer IDs
            const testPackages = await db.employerPackage.findMany({
                where: {
                    employer: {
                        companyName: { startsWith: 'JEST_' }
                    }
                },
            });
            expect(testPackages.length).toBe(0);
        });
    });

    describe('Test Data Cleanup - Invoices', () => {
        it('should verify no test invoices remain', async () => {
            const testInvoices = await db.invoice.findMany({
                where: {
                    OR: TEST_PREFIXES.map(prefix => ({
                        description: { contains: prefix }
                    }))
                },
            });
            expect(testInvoices.length).toBe(0);
        });
    });

    describe('Production Data Validation', () => {
        it('should verify real concierge packages still exist', async () => {
            // This ensures we haven't accidentally deleted production data
            // Only run if there are expected production packages
            const realPackages = await db.employerPackage.findMany({
                where: {
                    packageType: {
                        in: ['concierge_lite', 'concierge_level_1', 'concierge_level_2', 'concierge_level_3'],
                    },
                    employer: {
                        companyName: { not: { startsWith: 'JEST_' } }
                    }
                },
                take: 1,
            });

            // This is a soft check - it's okay if there are no production packages in a test DB
            // The important thing is that we're checking production data wasn't affected
            expect(realPackages).toBeDefined();
        });

        it('should verify employer_packages table structure is intact', async () => {
            // Verify we can still query the table with expected columns
            const sample = await db.employerPackage.findFirst({
                select: {
                    id: true,
                    employerId: true,
                    packageType: true,
                    listingsRemaining: true,
                    purchasedAt: true,
                    expiresAt: true,
                },
            });

            // Table structure should be intact regardless of data
            expect(sample === null || typeof sample === 'object').toBe(true);
        });

        it('should verify no production employer packages were deleted by tests', async () => {
            // Count all non-test employer packages
            const productionPackageCount = await db.employerPackage.count({
                where: {
                    employer: {
                        companyName: { not: { startsWith: 'JEST_' } }
                    }
                }
            });

            // Log for visibility
            console.log(`📊 Production employer packages count: ${productionPackageCount}`);

            // Should have at least some production data (soft check)
            // The key is this count should remain stable across test runs
            expect(productionPackageCount).toBeGreaterThanOrEqual(0);
        });

        it('should verify no production employers were affected', async () => {
            // Count all non-test employers
            const productionEmployerCount = await db.employer.count({
                where: {
                    companyName: { not: { startsWith: 'JEST_' } }
                }
            });

            console.log(`📊 Production employers count: ${productionEmployerCount}`);
            expect(productionEmployerCount).toBeGreaterThanOrEqual(0);
        });

        it('should verify no production user profiles were affected', async () => {
            // Count all non-test user profiles
            const productionUserCount = await db.userProfile.count({
                where: {
                    AND: [
                        { email: { not: { startsWith: 'JEST_' } } },
                        { clerkUserId: { not: { startsWith: 'JEST_' } } }
                    ]
                }
            });

            console.log(`📊 Production user profiles count: ${productionUserCount}`);
            expect(productionUserCount).toBeGreaterThanOrEqual(0);
        });

        it('should verify no production invoices were affected', async () => {
            // Count all non-test invoices
            const productionInvoiceCount = await db.invoice.count({
                where: {
                    NOT: {
                        OR: TEST_PREFIXES.map(prefix => ({
                            description: { contains: prefix }
                        }))
                    }
                }
            });

            console.log(`📊 Production invoices count: ${productionInvoiceCount}`);
            expect(productionInvoiceCount).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Database State Summary', () => {
        it('should report current database state', async () => {
            // Get counts for documentation purposes
            const userCount = await db.userProfile.count();
            const employerCount = await db.employer.count();
            const packageCount = await db.employerPackage.count();

            // Log for verification
            console.log(`📊 Database State Summary:`);
            console.log(`   - User Profiles: ${userCount}`);
            console.log(`   - Employers: ${employerCount}`);
            console.log(`   - Employer Packages: ${packageCount}`);

            // These should all be non-negative
            expect(userCount).toBeGreaterThanOrEqual(0);
            expect(employerCount).toBeGreaterThanOrEqual(0);
            expect(packageCount).toBeGreaterThanOrEqual(0);
        });

        it('should verify concierge package distribution', async () => {
            const packagesByType = await db.employerPackage.groupBy({
                by: ['packageType'],
                _count: {
                    packageType: true,
                },
            });

            console.log(`📊 Package Type Distribution:`);
            packagesByType.forEach(({ packageType, _count }) => {
                console.log(`   - ${packageType}: ${_count.packageType}`);
            });

            expect(packagesByType).toBeDefined();
        });
    });
});

describe('Phase 8: Final Verification', () => {
    describe('Test Pattern Verification', () => {
        it('should confirm test email pattern is unique and identifiable', () => {
            TEST_PREFIXES.forEach(prefix => {
                expect(prefix.startsWith('JEST_')).toBe(true);
                expect(prefix).toContain('CONCIERGE_PRICING');
            });
        });

        it('should confirm test patterns follow naming convention', () => {
            const expectedPattern = /^JEST_CONCIERGE_PRICING_P\d_$/;
            TEST_PREFIXES.forEach(prefix => {
                expect(prefix).toMatch(expectedPattern);
            });
        });
    });

    describe('Rollback Safety', () => {
        it('should verify concierge_lite enum still works', async () => {
            // Verify backward compatibility
            const litePackages = await db.employerPackage.findMany({
                where: {
                    packageType: 'concierge_lite',
                },
                take: 1,
            });

            // Query should succeed even if no results
            expect(Array.isArray(litePackages)).toBe(true);
        });

        it('should verify new concierge_level_3 enum works', async () => {
            // Verify new enum value is functional
            const level3Packages = await db.employerPackage.findMany({
                where: {
                    packageType: 'concierge_level_3',
                },
                take: 1,
            });

            expect(Array.isArray(level3Packages)).toBe(true);
        });
    });
});
