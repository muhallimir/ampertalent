/**
 * Phase 2: Pricing Configuration Tests for Concierge Pricing Tier Realignment
 * 
 * These tests verify the pricing configuration updates:
 * - CONCIERGE_PACKAGES constant reflects new pricing
 * - concierge_lite is removed from available packages
 * - New prices: Level I $1,695, Level II $2,695, Level III $3,995
 * - Feature lists match the Google Sheet specification
 */

import { describe, it, expect } from "@jest/globals";
import { CONCIERGE_PACKAGES, JOB_PACKAGES } from "@/components/payments/PackageCard";

describe('Phase 2: Pricing Configuration', () => {
    describe('CONCIERGE_PACKAGES constant', () => {
        it('should have exactly 3 concierge packages', () => {
            expect(CONCIERGE_PACKAGES.length).toBe(3);
        });

        it('should NOT include concierge_lite package', () => {
            const conciereLite = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_lite');
            expect(conciereLite).toBeUndefined();
        });

        it('should have concierge_level_1 priced at $1,695', () => {
            const level1 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_1');
            expect(level1).toBeDefined();
            expect(level1?.price).toBe(1695);
        });

        it('should have concierge_level_2 priced at $2,695', () => {
            const level2 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_2');
            expect(level2).toBeDefined();
            expect(level2?.price).toBe(2695);
        });

        it('should have concierge_level_3 priced at $3,995', () => {
            const level3 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_3');
            expect(level3).toBeDefined();
            expect(level3?.price).toBe(3995);
        });

        it('should have concierge_level_2 with Popular tag', () => {
            const level2 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_2');
            expect(level2?.popular).toBe(true);
        });

        it('should have concierge_level_3 with Recommended tag', () => {
            const level3 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_3');
            expect(level3?.recommended).toBe(true);
        });

        it('should have concierge_level_1 without Popular or Recommended tags', () => {
            const level1 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_1');
            expect(level1?.popular).toBeFalsy();
            expect(level1?.recommended).toBeFalsy();
        });
    });

    describe('Concierge Level I Features', () => {
        it('should include Discovery Call feature', () => {
            const level1 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_1');
            expect(level1?.features.some(f => f.includes('Discovery Call'))).toBe(true);
        });

        it('should include Pro Job Post feature', () => {
            const level1 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_1');
            expect(level1?.features.some(f => f.includes('Pro Job Post'))).toBe(true);
        });

        it('should include Targeted Posting feature', () => {
            const level1 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_1');
            expect(level1?.features.some(f => f.includes('Targeted Posting'))).toBe(true);
        });

        it('should include Expert Screening feature', () => {
            const level1 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_1');
            expect(level1?.features.some(f => f.includes('Expert Screening'))).toBe(true);
        });

        it('should include Custom Interviews feature', () => {
            const level1 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_1');
            expect(level1?.features.some(f => f.includes('Custom Interviews'))).toBe(true);
        });

        it('should include Candidate Presentation feature', () => {
            const level1 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_1');
            expect(level1?.features.some(f => f.includes('Candidate Presentation'))).toBe(true);
        });

        it('should include Final Touches feature', () => {
            const level1 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_1');
            expect(level1?.features.some(f => f.includes('Final Touches'))).toBe(true);
        });
    });

    describe('Concierge Level II Features', () => {
        it('should include Expanded Candidate Reach feature', () => {
            const level2 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_2');
            expect(level2?.features.some(f => f.includes('Expanded Candidate Reach'))).toBe(true);
        });

        it('should include Test Projects/Assessments monitoring feature', () => {
            const level2 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_2');
            expect(level2?.features.some(f => f.includes('Test Projects') || f.includes('Assessments'))).toBe(true);
        });

        it('should include Attend Second Interviews feature', () => {
            const level2 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_2');
            expect(level2?.features.some(f => f.includes('Second Interviews'))).toBe(true);
        });

        it('should include Check References feature', () => {
            const level2 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_2');
            expect(level2?.features.some(f => f.includes('References'))).toBe(true);
        });
    });

    describe('Concierge Level III Features', () => {
        it('should include In-depth role requirement consultation feature', () => {
            const level3 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_3');
            expect(level3?.features.some(f => f.includes('role requirement') || f.includes('company culture'))).toBe(true);
        });

        it('should include social media/LinkedIn outreach feature', () => {
            const level3 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_3');
            expect(level3?.features.some(f => f.includes('LinkedIn') || f.includes('social media'))).toBe(true);
        });

        it('should include Onboarding Services feature', () => {
            const level3 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_3');
            expect(level3?.features.some(f => f.includes('Onboarding'))).toBe(true);
        });

        it('should include Continuous support feature', () => {
            const level3 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_3');
            expect(level3?.features.some(f => f.includes('Continuous support') || f.includes('support throughout'))).toBe(true);
        });
    });

    describe('About Descriptions (Target Roles)', () => {
        it('Level 1 should target entry-level roles', () => {
            const level1 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_1');
            const desc = level1?.description?.toLowerCase() || '';

            // Check that description mentions entry-level role types
            const hasAdministrative = desc.includes('administrative') || desc.includes('admin');
            const hasSupport = desc.includes('support');
            const hasCustomerService = desc.includes('customer service');
            const hasEntryLevel = desc.includes('entry-level') || desc.includes('entry level');

            expect(hasEntryLevel || hasAdministrative || hasSupport || hasCustomerService).toBe(true);
        });

        it('Level 2 should target mid-level roles', () => {
            const level2 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_2');
            const desc = level2?.description?.toLowerCase() || '';

            // Check that description mentions mid-level role types
            const hasMidLevel = desc.includes('mid-level') || desc.includes('mid level');
            const hasBookkeeper = desc.includes('bookkeeper');
            const hasCoordinator = desc.includes('coordinator');
            const hasAccountManager = desc.includes('account manager');
            const hasSocialMedia = desc.includes('social media');
            const hasWriter = desc.includes('writer') || desc.includes('editor');

            expect(hasMidLevel || hasBookkeeper || hasCoordinator || hasAccountManager || hasSocialMedia || hasWriter).toBe(true);
        });

        it('Level 3 should target mid-to-upper-level roles', () => {
            const level3 = CONCIERGE_PACKAGES.find(pkg => pkg.id === 'concierge_level_3');
            const desc = level3?.description?.toLowerCase() || '';

            // Check that description mentions upper-level role types
            const hasUpperLevel = desc.includes('upper-level') || desc.includes('executive') || desc.includes('manager');
            const hasTechnology = desc.includes('technology');
            const hasSpecialty = desc.includes('specialty');

            expect(hasUpperLevel || hasTechnology || hasSpecialty).toBe(true);
        });
    });

    describe('Package Structure Validation', () => {
        it('all concierge packages should have 1 job posting', () => {
            CONCIERGE_PACKAGES.forEach(pkg => {
                expect(pkg.jobPostings).toBe(1);
            });
        });

        it('all concierge packages should have 30-day duration', () => {
            CONCIERGE_PACKAGES.forEach(pkg => {
                expect(pkg.duration).toBe(30);
            });
        });

        it('all concierge packages should have 0 featured listings', () => {
            CONCIERGE_PACKAGES.forEach(pkg => {
                expect(pkg.featuredListings).toBe(0);
            });
        });

        it('package IDs should follow correct naming convention', () => {
            const expectedIds = ['concierge_level_1', 'concierge_level_2', 'concierge_level_3'];
            const actualIds = CONCIERGE_PACKAGES.map(pkg => pkg.id);

            expectedIds.forEach(id => {
                expect(actualIds).toContain(id);
            });
        });
    });

    describe('Regular Job Packages remain unchanged', () => {
        it('should still have standard package at $97', () => {
            const standard = JOB_PACKAGES.find(pkg => pkg.id === 'standard');
            expect(standard?.price).toBe(97);
        });

        it('should still have featured package at $127', () => {
            const featured = JOB_PACKAGES.find(pkg => pkg.id === 'featured');
            expect(featured?.price).toBe(127);
        });

        it('should still have email_blast package at $249', () => {
            const emailBlast = JOB_PACKAGES.find(pkg => pkg.id === 'email_blast');
            expect(emailBlast?.price).toBe(249);
        });
    });
});
