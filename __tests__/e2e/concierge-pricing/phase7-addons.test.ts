/**
 * Phase 7: Add-ons Compatibility Tests for Concierge Pricing Tier Realignment
 * 
 * These tests verify add-ons work with new pricing structure:
 * - All add-ons available for concierge_level_3
 * - Add-ons configuration updated
 * - Total price calculations correct
 */

import { describe, it, expect } from "@jest/globals";
import {
    EMPLOYER_ADDONS,
    getAddOnById,
    getAddOnsByPackageType,
    getAllActiveAddOns
} from "@/lib/addons-config";

describe('Phase 7: Add-ons Compatibility', () => {
    describe('Add-on Availability for New Tiers', () => {
        it('Rush Service should be available for concierge_level_1', () => {
            const addOns = getAddOnsByPackageType('concierge_level_1');
            const rushService = addOns.find(a => a.id === 'concierge_rush_service');
            expect(rushService).toBeDefined();
        });

        it('Rush Service should be available for concierge_level_2', () => {
            const addOns = getAddOnsByPackageType('concierge_level_2');
            const rushService = addOns.find(a => a.id === 'concierge_rush_service');
            expect(rushService).toBeDefined();
        });

        it('Rush Service should be available for concierge_level_3', () => {
            const addOns = getAddOnsByPackageType('concierge_level_3');
            const rushService = addOns.find(a => a.id === 'concierge_rush_service');
            expect(rushService).toBeDefined();
        });

        it('Onboarding New Hire should be available for concierge_level_3', () => {
            const addOns = getAddOnsByPackageType('concierge_level_3');
            const onboarding = addOns.find(a => a.id === 'onboarding_new_hire');
            expect(onboarding).toBeDefined();
        });

        it('Reference Checks should be available for concierge_level_3', () => {
            const addOns = getAddOnsByPackageType('concierge_level_3');
            const refChecks = addOns.find(a => a.id === 'reference_checks');
            expect(refChecks).toBeDefined();
        });
    });

    describe('Add-on Pricing', () => {
        it('Rush Service should be priced at $349', () => {
            const rushService = getAddOnById('concierge_rush_service');
            expect(rushService?.price).toBe(349);
        });

        it('Onboarding New Hire should be priced at $195', () => {
            const onboarding = getAddOnById('onboarding_new_hire');
            expect(onboarding?.price).toBe(195);
        });

        it('Reference Checks should be priced at $95', () => {
            const refChecks = getAddOnById('reference_checks');
            expect(refChecks?.price).toBe(95);
        });
    });

    describe('Total Price Calculations', () => {
        const PACKAGE_PRICES = {
            concierge_level_1: 1695,
            concierge_level_2: 2695,
            concierge_level_3: 3995,
        };

        it('should calculate correct total for Level I + Rush Service', () => {
            const packagePrice = PACKAGE_PRICES.concierge_level_1;
            const rushService = getAddOnById('concierge_rush_service');
            const total = packagePrice + (rushService?.price || 0);

            expect(total).toBe(1695 + 349);
        });

        it('should calculate correct total for Level II + All Add-ons', () => {
            const packagePrice = PACKAGE_PRICES.concierge_level_2;
            const addOns = getAddOnsByPackageType('concierge_level_2');
            const addOnsTotal = addOns.reduce((sum, addon) => sum + addon.price, 0);
            const total = packagePrice + addOnsTotal;

            expect(total).toBe(2695 + 349 + 195 + 95);
        });

        it('should calculate correct total for Level III + Onboarding', () => {
            const packagePrice = PACKAGE_PRICES.concierge_level_3;
            const onboarding = getAddOnById('onboarding_new_hire');
            const total = packagePrice + (onboarding?.price || 0);

            expect(total).toBe(3995 + 195);
        });
    });

    describe('Add-on Configuration Structure', () => {
        it('all add-ons should have required properties', () => {
            EMPLOYER_ADDONS.forEach(addon => {
                expect(addon).toHaveProperty('id');
                expect(addon).toHaveProperty('name');
                expect(addon).toHaveProperty('price');
                expect(addon).toHaveProperty('availableForPackages');
                expect(addon).toHaveProperty('features');
                expect(addon).toHaveProperty('isActive');
            });
        });

        it('all add-ons should be categorized as concierge_addon', () => {
            EMPLOYER_ADDONS.forEach(addon => {
                expect(addon.category).toBe('concierge_addon');
            });
        });

        it('all add-ons should be for employer user type', () => {
            EMPLOYER_ADDONS.forEach(addon => {
                expect(addon.userType).toBe('employer');
            });
        });
    });

    describe('availableForPackages Array Updates', () => {
        it('all add-ons should include concierge_level_1 in available packages', () => {
            EMPLOYER_ADDONS.forEach(addon => {
                expect(addon.availableForPackages).toContain('concierge_level_1');
            });
        });

        it('all add-ons should include concierge_level_2 in available packages', () => {
            EMPLOYER_ADDONS.forEach(addon => {
                expect(addon.availableForPackages).toContain('concierge_level_2');
            });
        });

        it('all add-ons should include concierge_level_3 in available packages', () => {
            EMPLOYER_ADDONS.forEach(addon => {
                expect(addon.availableForPackages).toContain('concierge_level_3');
            });
        });
    });

    describe('Get All Active Add-ons', () => {
        it('should return all 3 add-ons when getting active add-ons', () => {
            const activeAddOns = getAllActiveAddOns();
            expect(activeAddOns.length).toBe(3);
        });

        it('all returned add-ons should be active', () => {
            const activeAddOns = getAllActiveAddOns();
            activeAddOns.forEach(addon => {
                expect(addon.isActive).toBe(true);
            });
        });
    });

    describe('Backward Compatibility', () => {
        it('add-ons should still work with concierge_lite (for existing packages)', () => {
            const addOns = getAddOnsByPackageType('concierge_lite');
            // Should return add-ons for backward compatibility with existing packages
            expect(addOns.length).toBe(3);
        });
    });
});
