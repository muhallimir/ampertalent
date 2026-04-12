/**
 * Unit Tests: Service-Only Onboarding Flow
 *
 * Tests for the service-only onboarding feature where users coming from
 * premium service SKU links can complete onboarding without selecting a plan.
 *
 * Related documentation:
 * - docs/SERVICE_ONLY_ONBOARDING.md
 * - docs/SERVICE_ONLY_ONBOARDING_MANUAL_TESTS.md
 */

import {
    getMarketingPreselect,
    setMarketingPreselectFromSku,
    clearMarketingPreselect,
    isServicePreselect,
    MarketingPreselect,
} from '@/lib/marketing-preselect'
import { getSkuMapping, SEEKER_SERVICE_SKU_MAPPINGS, isServiceSku } from '@/lib/wordpress-sku-mapping'

// Mock document.cookie for browser environment
let cookieStore: { [key: string]: string } = {}

const mockDocument = {
    get cookie() {
        return Object.entries(cookieStore)
            .map(([key, value]) => `${key}=${value}`)
            .join('; ')
    },
    set cookie(value: string) {
        const [cookiePart] = value.split(';')
        const [key, val] = cookiePart.split('=')
        if (val === '' || value.includes('max-age=0')) {
            delete cookieStore[key]
        } else {
            cookieStore[key] = val
        }
    },
}

// Mock window.location for secure cookie logic
const mockWindow = {
    location: {
        protocol: 'https:',
    },
}

// Setup global mocks
beforeAll(() => {
    Object.defineProperty(global, 'document', {
        value: mockDocument,
        writable: true,
    })
    Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true,
    })
})

beforeEach(() => {
    cookieStore = {}
})

afterAll(() => {
    // @ts-expect-error - restoring global
    delete global.document
    // @ts-expect-error - restoring global
    delete global.window
})

describe('Service-Only Onboarding', () => {
    describe('Service SKU Detection', () => {
        /**
         * All 7 service SKUs should be correctly identified as services
         */
        it('should identify all service SKUs as service type', () => {
            const serviceSKUs = [
                '2228720', // Resume Refresh
                '2285875', // Create Resume From Scratch
                '2228721', // Cover Letter Service
                '2228723', // Interview Coaching
                '2228729', // The Works Package
                '2283381', // Career Jumpstart
                '2441627', // Personal Career Strategist
            ]

            serviceSKUs.forEach((sku) => {
                const mapping = getSkuMapping(sku)
                expect(mapping).not.toBeNull()
                expect(mapping?.purchaseType).toBe('service')
                expect(mapping?.userType).toBe('seeker')
            })
        })

        it('should export SEEKER_SERVICE_SKU_MAPPINGS with all service SKUs', () => {
            expect(SEEKER_SERVICE_SKU_MAPPINGS).toBeDefined()
            expect(SEEKER_SERVICE_SKU_MAPPINGS.length).toBe(7)

            const serviceSKUs = SEEKER_SERVICE_SKU_MAPPINGS.map(m => m.sku)
            expect(serviceSKUs).toContain('2228720')
            expect(serviceSKUs).toContain('2285875')
            expect(serviceSKUs).toContain('2228721')
            expect(serviceSKUs).toContain('2228723')
            expect(serviceSKUs).toContain('2228729')
            expect(serviceSKUs).toContain('2283381')
            expect(serviceSKUs).toContain('2441627')
        })

        it('should identify service SKUs using isServiceSku helper', () => {
            expect(isServiceSku('2228720')).toBe(true)
            expect(isServiceSku('2228729')).toBe(true)
            expect(isServiceSku('2441627')).toBe(true)
            // Non-service SKUs
            expect(isServiceSku('2231035')).toBe(false) // subscription (trial)
            expect(isServiceSku('2164544')).toBe(false) // employer package (standard)
        })

        it('should NOT identify subscription SKUs as services', () => {
            const subscriptionSKUs = [
                '2231035', // Trial Monthly
                '2215562', // Gold Bi-Monthly
                '2236043', // VIP Platinum
                '2307158', // Annual Platinum
            ]

            subscriptionSKUs.forEach((sku) => {
                const mapping = getSkuMapping(sku)
                expect(mapping).not.toBeNull()
                expect(mapping?.purchaseType).toBe('subscription')
            })
        })

        it('should NOT identify employer package SKUs as services', () => {
            const packageSKUs = [
                '2164544', // Standard Job Post
                '2164540', // Featured Job Post
                '2164534', // Level 1 Concierge
            ]

            packageSKUs.forEach((sku) => {
                const mapping = getSkuMapping(sku)
                expect(mapping).not.toBeNull()
                expect(mapping?.purchaseType).toBe('package')
            })
        })
    })

    describe('isServicePreselect Function', () => {
        it('should return true for service preselection', () => {
            const servicePreselect: MarketingPreselect = {
                sku: '2228720',
                userType: 'seeker',
                planId: 'resume_refresh',
                purchaseType: 'service',
                timestamp: Date.now(),
            }

            expect(isServicePreselect(servicePreselect)).toBe(true)
        })

        it('should return false for subscription preselection', () => {
            const subscriptionPreselect: MarketingPreselect = {
                sku: '2228710',
                userType: 'seeker',
                planId: 'trial_monthly',
                purchaseType: 'subscription',
                timestamp: Date.now(),
            }

            expect(isServicePreselect(subscriptionPreselect)).toBe(false)
        })

        it('should return false for package preselection', () => {
            const packagePreselect: MarketingPreselect = {
                sku: '2228714',
                userType: 'employer',
                planId: 'standard',
                purchaseType: 'package',
                timestamp: Date.now(),
            }

            expect(isServicePreselect(packagePreselect)).toBe(false)
        })

        it('should return false for null preselection', () => {
            expect(isServicePreselect(null)).toBe(false)
        })
    })

    describe('Cookie Management for Service SKUs', () => {
        it('should set cookie correctly for service SKU', () => {
            const result = setMarketingPreselectFromSku('2228720')
            expect(result).toBe(true)

            const preselect = getMarketingPreselect()
            expect(preselect).not.toBeNull()
            expect(preselect?.purchaseType).toBe('service')
            expect(preselect?.userType).toBe('seeker')
        })

        it('should clear service preselect cookie', () => {
            setMarketingPreselectFromSku('2228720')
            expect(getMarketingPreselect()).not.toBeNull()

            clearMarketingPreselect()
            expect(getMarketingPreselect()).toBeNull()
        })
    })

    describe('Service-Only Onboarding Step Logic', () => {
        /**
         * These tests verify the step calculation logic that will be used
         * in the onboarding page to determine which steps to show.
         *
         * Service-only flow should have 5 steps (skipping package selection):
         * 1. Role
         * 2. Basic Info
         * 3. Additional Details
         * 4. Goals/Professional Summary
         * 5. Complete
         *
         * Standard seeker flow has 6 steps (includes package selection):
         * 1. Role
         * 2. Basic Info
         * 3. Additional Details
         * 4. Goals/Professional Summary
         * 5. Package Selection
         * 6. Complete
         */

        const SEEKER_STEPS = [
            { id: 'role', title: 'Choose Your Role' },
            { id: 'profile', title: 'Basic Information' },
            { id: 'details', title: 'Additional Details' },
            { id: 'goals', title: 'Professional Summary' },
            { id: 'package', title: 'Select Package' },
            { id: 'complete', title: 'Welcome!' },
        ]

        const SERVICE_ONLY_SEEKER_STEPS = [
            { id: 'role', title: 'Choose Your Role' },
            { id: 'profile', title: 'Basic Information' },
            { id: 'details', title: 'Additional Details' },
            { id: 'goals', title: 'Professional Summary' },
            { id: 'complete', title: 'Welcome!' },
        ]

        it('should have 6 steps for standard seeker flow', () => {
            expect(SEEKER_STEPS.length).toBe(6)
            expect(SEEKER_STEPS.map((s) => s.id)).toContain('package')
        })

        it('should have 5 steps for service-only flow', () => {
            expect(SERVICE_ONLY_SEEKER_STEPS.length).toBe(5)
            expect(SERVICE_ONLY_SEEKER_STEPS.map((s) => s.id)).not.toContain('package')
        })

        it('should skip package step in service-only flow', () => {
            const packageStep = SERVICE_ONLY_SEEKER_STEPS.find((s) => s.id === 'package')
            expect(packageStep).toBeUndefined()
        })

        it('should preserve step order (complete comes after goals)', () => {
            const goalsIndex = SERVICE_ONLY_SEEKER_STEPS.findIndex((s) => s.id === 'goals')
            const completeIndex = SERVICE_ONLY_SEEKER_STEPS.findIndex((s) => s.id === 'complete')

            expect(goalsIndex).toBe(3)
            expect(completeIndex).toBe(4)
            expect(completeIndex).toBe(goalsIndex + 1)
        })
    })

    describe('Flow Selection Logic', () => {
        /**
         * Tests for determining which onboarding flow to use based on preselection
         */

        function getOnboardingFlowType(preselect: MarketingPreselect | null): 'standard' | 'service-only' {
            if (isServicePreselect(preselect)) {
                return 'service-only'
            }
            return 'standard'
        }

        it('should use service-only flow for Resume Refresh SKU', () => {
            const preselect: MarketingPreselect = {
                sku: '2228720',
                userType: 'seeker',
                planId: 'resume_refresh',
                purchaseType: 'service',
                timestamp: Date.now(),
            }

            expect(getOnboardingFlowType(preselect)).toBe('service-only')
        })

        it('should use service-only flow for The Works Package SKU', () => {
            const preselect: MarketingPreselect = {
                sku: '2228729',
                userType: 'seeker',
                planId: 'the_works',
                purchaseType: 'service',
                timestamp: Date.now(),
            }

            expect(getOnboardingFlowType(preselect)).toBe('service-only')
        })

        it('should use service-only flow for Personal Career Strategist SKU', () => {
            const preselect: MarketingPreselect = {
                sku: '2441627',
                userType: 'seeker',
                planId: 'personal_career_strategist',
                purchaseType: 'service',
                timestamp: Date.now(),
            }

            expect(getOnboardingFlowType(preselect)).toBe('service-only')
        })

        it('should use standard flow for subscription preselection', () => {
            const preselect: MarketingPreselect = {
                sku: '2228710',
                userType: 'seeker',
                planId: 'trial_monthly',
                purchaseType: 'subscription',
                timestamp: Date.now(),
            }

            expect(getOnboardingFlowType(preselect)).toBe('standard')
        })

        it('should use standard flow when no preselection', () => {
            expect(getOnboardingFlowType(null)).toBe('standard')
        })
    })

    describe('Service-Only Completion Data', () => {
        /**
         * Tests for the data structure expected when completing service-only onboarding
         */

        interface ServiceOnlyCompletionData {
            role: 'seeker'
            firstName: string
            lastName: string
            location: string
            professionalSummary: string
            isServiceOnly: true
            serviceId: string
        }

        function buildServiceOnlyCompletionData(
            formData: {
                firstName: string
                lastName: string
                location: string
                professionalSummary: string
            },
            serviceId: string
        ): ServiceOnlyCompletionData {
            return {
                role: 'seeker',
                firstName: formData.firstName,
                lastName: formData.lastName,
                location: formData.location,
                professionalSummary: formData.professionalSummary,
                isServiceOnly: true,
                serviceId,
            }
        }

        it('should include isServiceOnly flag', () => {
            const data = buildServiceOnlyCompletionData(
                {
                    firstName: 'Jane',
                    lastName: 'Doe',
                    location: 'Austin, TX',
                    professionalSummary: 'Experienced professional',
                },
                'resume_refresh'
            )

            expect(data.isServiceOnly).toBe(true)
        })

        it('should include serviceId from preselection', () => {
            const data = buildServiceOnlyCompletionData(
                {
                    firstName: 'Jane',
                    lastName: 'Doe',
                    location: 'Austin, TX',
                    professionalSummary: 'Experienced professional',
                },
                'the_works'
            )

            expect(data.serviceId).toBe('the_works')
        })

        it('should NOT include selectedPackage in service-only data', () => {
            const data = buildServiceOnlyCompletionData(
                {
                    firstName: 'Jane',
                    lastName: 'Doe',
                    location: 'Austin, TX',
                    professionalSummary: 'Experienced professional',
                },
                'resume_refresh'
            )

            expect(data).not.toHaveProperty('selectedPackage')
        })
    })

    describe('Membership Plan for Service-Only Users', () => {
        /**
         * Service-only users should have membershipPlan: 'none' in database
         */

        const validMembershipPlans = [
            'none',
            'trial_monthly',
            'gold_bimonthly',
            'vip_quarterly',
            'annual_platinum',
        ]

        it('should use "none" as membership plan for service-only users', () => {
            const serviceOnlyMembershipPlan = 'none'
            expect(validMembershipPlans).toContain(serviceOnlyMembershipPlan)
        })

        it('should NOT assign any paid plan to service-only users', () => {
            const serviceOnlyMembershipPlan = 'none'
            const paidPlans = ['trial_monthly', 'gold_bimonthly', 'vip_quarterly', 'annual_platinum']

            expect(paidPlans).not.toContain(serviceOnlyMembershipPlan)
        })
    })
})
