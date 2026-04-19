/**
 * marketing SKU Mapping Unit Tests
 *
 * These are PURE UNIT TESTS - no database, no API calls, no side effects.
 * Tests only pure functions that map SKU strings to plan configuration objects.
 *
 * NO DATABASE CLEANUP REQUIRED - these tests don't interact with any external systems.
 */

import {
    getSkuMapping,
    isValidSku,
    getUserTypeFromSku,
    getPlanIdFromSku,
    getValidSeekerSkus,
    getValidEmployerSkus,
    getValidSeekerServiceSkus,
    isServiceSku,
    isSubscriptionSku,
    isPackageSku,
    getPurchaseTypeFromSku,
    getServiceIdFromSku,
    ALL_SKU_MAPPINGS,
} from '@/lib/marketing-sku-mapping'

describe('marketing SKU Mapping', () => {
    // No setup needed - pure functions with no state

    afterAll(() => {
        // Verification: These tests create no database records
        // Nothing to clean up - pure function tests only
    })

    describe('getSkuMapping', () => {
        // ==========================================================================
        // SEEKER SKU TESTS
        // ==========================================================================
        describe('Seeker SKUs', () => {
            it('should return correct mapping for SKU 2231035 (3 Day Free Trial)', () => {
                const result = getSkuMapping('2231035')
                expect(result).toEqual({
                    sku: '2231035',
                    userType: 'seeker',
                    planId: 'trial',
                    name: '3 Day Free Trial Subscription',
                    price: 34.99,
                    priceDescription: '$34.99/month with a 3-day free trial',
                    purchaseType: 'subscription',
                })
            })

            it('should return correct mapping for SKU 2215562 (Gold Mom Professional)', () => {
                const result = getSkuMapping('2215562')
                expect(result).toEqual({
                    sku: '2215562',
                    userType: 'seeker',
                    planId: 'gold',
                    name: 'Gold Mom Professional',
                    price: 49.99,
                    priceDescription: '$49.99 every 2 months',
                    purchaseType: 'subscription',
                })
            })

            it('should return correct mapping for SKU 2236043 (VIP Platinum)', () => {
                const result = getSkuMapping('2236043')
                expect(result).toEqual({
                    sku: '2236043',
                    userType: 'seeker',
                    planId: 'vip-platinum',
                    name: 'VIP Platinum Mom Professional',
                    price: 79.99,
                    priceDescription: '$79.99 every 3 months',
                    purchaseType: 'subscription',
                })
            })

            it('should return correct mapping for SKU 2307158 (Annual Platinum)', () => {
                const result = getSkuMapping('2307158')
                expect(result).toEqual({
                    sku: '2307158',
                    userType: 'seeker',
                    planId: 'annual-platinum',
                    name: 'Annual Platinum Mom Professional',
                    price: 299.0,
                    priceDescription: '$299.00/year',
                    purchaseType: 'subscription',
                })
            })
        })

        // ==========================================================================
        // EMPLOYER JOB PACKAGE SKU TESTS
        // ==========================================================================
        describe('Employer Job Package SKUs', () => {
            it('should return correct mapping for SKU 2164544 (Standard Job Post)', () => {
                const result = getSkuMapping('2164544')
                expect(result).toEqual({
                    sku: '2164544',
                    userType: 'employer',
                    planId: 'standard',
                    name: 'Standard Job Post',
                    price: 97.0,
                    priceDescription: '$97.00',
                    purchaseType: 'package',
                })
            })

            it('should return correct mapping for SKU 2164540 (Featured Job Post)', () => {
                const result = getSkuMapping('2164540')
                expect(result).toEqual({
                    sku: '2164540',
                    userType: 'employer',
                    planId: 'featured',
                    name: 'Featured Job Post',
                    price: 127.0,
                    priceDescription: '$127.00',
                    purchaseType: 'package',
                })
            })

            it('should return correct mapping for SKU 2283656 (Solo Email Blast)', () => {
                const result = getSkuMapping('2283656')
                expect(result).toEqual({
                    sku: '2283656',
                    userType: 'employer',
                    planId: 'email_blast',
                    name: 'Solo Email Blast',
                    price: 249.0,
                    priceDescription: '$249.00',
                    purchaseType: 'package',
                })
            })

            it('should return correct mapping for SKU 2307643 (Solo Email Blast - Order variant)', () => {
                const result = getSkuMapping('2307643')
                expect(result?.planId).toBe('email_blast') // Same planId as 2283656
                expect(result?.userType).toBe('employer')
                expect(result?.price).toBe(249.0)
                expect(result?.purchaseType).toBe('package')
            })
        })

        // ==========================================================================
        // EMPLOYER CONCIERGE PACKAGE SKU TESTS
        // ==========================================================================
        describe('Employer Concierge Package SKUs', () => {
            it('should return correct mapping for SKU 2164534 (Level 1 Concierge)', () => {
                const result = getSkuMapping('2164534')
                expect(result).toEqual({
                    sku: '2164534',
                    userType: 'employer',
                    planId: 'concierge_level_1',
                    name: 'Level 1 Concierge',
                    price: 1695.0,
                    priceDescription: '$1,695.00',
                    purchaseType: 'package',
                })
            })

            it('should return correct mapping for SKU 2285877 (Level II Concierge)', () => {
                const result = getSkuMapping('2285877')
                expect(result).toEqual({
                    sku: '2285877',
                    userType: 'employer',
                    planId: 'concierge_level_2',
                    name: 'Level II Concierge',
                    price: 2695.0,
                    priceDescription: '$2,695.00',
                    purchaseType: 'package',
                })
            })

            it('should return correct mapping for SKU 2488598 (Level III Concierge)', () => {
                const result = getSkuMapping('2488598')
                expect(result).toEqual({
                    sku: '2488598',
                    userType: 'employer',
                    planId: 'concierge_level_3',
                    name: 'Level III Concierge',
                    price: 3995.0,
                    priceDescription: '$3,995.00',
                    purchaseType: 'package',
                })
            })
        })

        // ==========================================================================
        // INVALID SKU TESTS
        // ==========================================================================
        describe('Invalid SKUs', () => {
            it('should return null for non-existent SKU', () => {
                expect(getSkuMapping('9999999')).toBeNull()
            })

            it('should return null for empty string', () => {
                expect(getSkuMapping('')).toBeNull()
            })

            it('should return null for non-numeric string', () => {
                expect(getSkuMapping('invalid')).toBeNull()
            })

            it('should return null for out-of-scope SKU (add-ons)', () => {
                // Reference Checks SKU - out of scope
                expect(getSkuMapping('2287955')).toBeNull()
            })
        })
    })

    describe('isValidSku', () => {
        it('should return true for all valid seeker SKUs', () => {
            expect(isValidSku('2231035')).toBe(true) // Trial
            expect(isValidSku('2215562')).toBe(true) // Gold
            expect(isValidSku('2236043')).toBe(true) // VIP Platinum
            expect(isValidSku('2307158')).toBe(true) // Annual Platinum
        })

        it('should return true for all valid employer job package SKUs', () => {
            expect(isValidSku('2164544')).toBe(true) // Standard
            expect(isValidSku('2164540')).toBe(true) // Featured
            expect(isValidSku('2283656')).toBe(true) // Email Blast
            expect(isValidSku('2307643')).toBe(true) // Email Blast (Order)
        })

        it('should return true for all valid employer concierge SKUs', () => {
            expect(isValidSku('2164534')).toBe(true) // Level 1
            expect(isValidSku('2285877')).toBe(true) // Level 2
            expect(isValidSku('2488598')).toBe(true) // Level 3
        })

        it('should return false for invalid SKUs', () => {
            expect(isValidSku('0000000')).toBe(false)
            expect(isValidSku('fake')).toBe(false)
            expect(isValidSku('')).toBe(false)
        })
    })

    describe('getUserTypeFromSku', () => {
        it('should return seeker for all seeker SKUs', () => {
            expect(getUserTypeFromSku('2231035')).toBe('seeker')
            expect(getUserTypeFromSku('2215562')).toBe('seeker')
            expect(getUserTypeFromSku('2236043')).toBe('seeker')
            expect(getUserTypeFromSku('2307158')).toBe('seeker')
        })

        it('should return employer for all employer SKUs', () => {
            // Job packages
            expect(getUserTypeFromSku('2164544')).toBe('employer')
            expect(getUserTypeFromSku('2164540')).toBe('employer')
            expect(getUserTypeFromSku('2283656')).toBe('employer')
            expect(getUserTypeFromSku('2307643')).toBe('employer')
            // Concierge
            expect(getUserTypeFromSku('2164534')).toBe('employer')
            expect(getUserTypeFromSku('2285877')).toBe('employer')
            expect(getUserTypeFromSku('2488598')).toBe('employer')
        })

        it('should return null for invalid SKUs', () => {
            expect(getUserTypeFromSku('invalid')).toBeNull()
            expect(getUserTypeFromSku('')).toBeNull()
        })
    })

    describe('getPlanIdFromSku', () => {
        it('should return correct planId for seeker SKUs', () => {
            expect(getPlanIdFromSku('2231035')).toBe('trial')
            expect(getPlanIdFromSku('2215562')).toBe('gold')
            expect(getPlanIdFromSku('2236043')).toBe('vip-platinum')
            expect(getPlanIdFromSku('2307158')).toBe('annual-platinum')
        })

        it('should return correct planId for employer job package SKUs', () => {
            expect(getPlanIdFromSku('2164544')).toBe('standard')
            expect(getPlanIdFromSku('2164540')).toBe('featured')
            expect(getPlanIdFromSku('2283656')).toBe('email_blast')
            expect(getPlanIdFromSku('2307643')).toBe('email_blast') // Same as 2283656
        })

        it('should return correct planId for employer concierge SKUs', () => {
            expect(getPlanIdFromSku('2164534')).toBe('concierge_level_1')
            expect(getPlanIdFromSku('2285877')).toBe('concierge_level_2')
            expect(getPlanIdFromSku('2488598')).toBe('concierge_level_3')
        })

        it('should return null for invalid SKUs', () => {
            expect(getPlanIdFromSku('invalid')).toBeNull()
        })
    })

    describe('getValidSeekerSkus', () => {
        it('should return all 4 seeker subscription SKUs', () => {
            const skus = getValidSeekerSkus()
            expect(skus).toHaveLength(4)
            expect(skus).toContain('2231035')
            expect(skus).toContain('2215562')
            expect(skus).toContain('2236043')
            expect(skus).toContain('2307158')
        })
    })

    describe('getValidSeekerServiceSkus', () => {
        it('should return all 7 seeker service SKUs', () => {
            const skus = getValidSeekerServiceSkus()
            expect(skus).toHaveLength(7)
            expect(skus).toContain('2228720') // Resume Refresh
            expect(skus).toContain('2285875') // Create New Resume
            expect(skus).toContain('2228721') // Cover Letter Enhancement
            expect(skus).toContain('2228723') // Interview Success Training
            expect(skus).toContain('2228729') // The Works Bundle
            expect(skus).toContain('2283381') // Career Jumpstart
            expect(skus).toContain('2441627') // Personal Career Strategist
        })
    })

    describe('getValidEmployerSkus', () => {
        it('should return all 7 employer SKUs', () => {
            const skus = getValidEmployerSkus()
            expect(skus).toHaveLength(7)
            // Job packages
            expect(skus).toContain('2164544')
            expect(skus).toContain('2164540')
            expect(skus).toContain('2283656')
            expect(skus).toContain('2307643')
            // Concierge
            expect(skus).toContain('2164534')
            expect(skus).toContain('2285877')
            expect(skus).toContain('2488598')
        })
    })

    describe('ALL_SKU_MAPPINGS', () => {
        it('should contain 18 total mappings (4 seeker + 7 services + 7 employer)', () => {
            expect(ALL_SKU_MAPPINGS).toHaveLength(18)
        })

        it('should have unique SKUs', () => {
            const skus = ALL_SKU_MAPPINGS.map((m) => m.sku)
            const uniqueSkus = new Set(skus)
            expect(uniqueSkus.size).toBe(skus.length)
        })
    })

    // ==========================================================================
    // SERVICE SKU TESTS
    // ==========================================================================
    describe('Service SKU Functions', () => {
        describe('isServiceSku', () => {
            it('should return true for service SKUs', () => {
                expect(isServiceSku('2228720')).toBe(true) // Resume Refresh
                expect(isServiceSku('2285875')).toBe(true) // Create New Resume
                expect(isServiceSku('2228721')).toBe(true) // Cover Letter
                expect(isServiceSku('2228723')).toBe(true) // Interview Training
                expect(isServiceSku('2228729')).toBe(true) // The Works
                expect(isServiceSku('2283381')).toBe(true) // Career Jumpstart
                expect(isServiceSku('2441627')).toBe(true) // Career Strategist
            })

            it('should return false for subscription SKUs', () => {
                expect(isServiceSku('2231035')).toBe(false) // Trial
                expect(isServiceSku('2215562')).toBe(false) // Gold
            })

            it('should return false for package SKUs', () => {
                expect(isServiceSku('2164544')).toBe(false) // Standard
                expect(isServiceSku('2164534')).toBe(false) // Concierge
            })

            it('should return false for invalid SKUs', () => {
                expect(isServiceSku('invalid')).toBe(false)
                expect(isServiceSku('')).toBe(false)
            })
        })

        describe('isSubscriptionSku', () => {
            it('should return true for subscription SKUs', () => {
                expect(isSubscriptionSku('2231035')).toBe(true)
                expect(isSubscriptionSku('2215562')).toBe(true)
                expect(isSubscriptionSku('2236043')).toBe(true)
                expect(isSubscriptionSku('2307158')).toBe(true)
            })

            it('should return false for service SKUs', () => {
                expect(isSubscriptionSku('2228720')).toBe(false)
            })

            it('should return false for package SKUs', () => {
                expect(isSubscriptionSku('2164544')).toBe(false)
            })
        })

        describe('isPackageSku', () => {
            it('should return true for employer package SKUs', () => {
                expect(isPackageSku('2164544')).toBe(true) // Standard
                expect(isPackageSku('2164540')).toBe(true) // Featured
                expect(isPackageSku('2164534')).toBe(true) // Concierge L1
            })

            it('should return false for subscription SKUs', () => {
                expect(isPackageSku('2231035')).toBe(false)
            })

            it('should return false for service SKUs', () => {
                expect(isPackageSku('2228720')).toBe(false)
            })
        })

        describe('getPurchaseTypeFromSku', () => {
            it('should return subscription for seeker subscription SKUs', () => {
                expect(getPurchaseTypeFromSku('2231035')).toBe('subscription')
                expect(getPurchaseTypeFromSku('2215562')).toBe('subscription')
            })

            it('should return service for seeker service SKUs', () => {
                expect(getPurchaseTypeFromSku('2228720')).toBe('service')
                expect(getPurchaseTypeFromSku('2285875')).toBe('service')
            })

            it('should return package for employer SKUs', () => {
                expect(getPurchaseTypeFromSku('2164544')).toBe('package')
                expect(getPurchaseTypeFromSku('2164534')).toBe('package')
            })

            it('should return null for invalid SKUs', () => {
                expect(getPurchaseTypeFromSku('invalid')).toBeNull()
            })
        })

        describe('getServiceIdFromSku', () => {
            it('should return the service ID for valid service SKUs', () => {
                expect(getServiceIdFromSku('2228720')).toBe('resume_refresh')
                expect(getServiceIdFromSku('2285875')).toBe('create_new_resume')
                expect(getServiceIdFromSku('2228721')).toBe('cover_letter_service')
                expect(getServiceIdFromSku('2228723')).toBe('interview_success_training')
                expect(getServiceIdFromSku('2228729')).toBe('the_works')
                expect(getServiceIdFromSku('2283381')).toBe('career_jumpstart')
                expect(getServiceIdFromSku('2441627')).toBe('personal_career_strategist')
            })

            it('should return null for subscription SKUs', () => {
                expect(getServiceIdFromSku('2231035')).toBeNull() // Trial subscription
                expect(getServiceIdFromSku('2215562')).toBeNull() // Gold subscription
            })

            it('should return null for employer package SKUs', () => {
                expect(getServiceIdFromSku('2164544')).toBeNull() // Standard job
                expect(getServiceIdFromSku('2164534')).toBeNull() // Concierge
            })

            it('should return null for invalid SKUs', () => {
                expect(getServiceIdFromSku('invalid')).toBeNull()
                expect(getServiceIdFromSku('')).toBeNull()
                expect(getServiceIdFromSku('0000000')).toBeNull()
            })
        })
    })
})
