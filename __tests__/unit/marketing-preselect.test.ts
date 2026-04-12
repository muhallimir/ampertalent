/**
 * Marketing Preselect Cookie Utility Tests
 *
 * Uses MOCKED document.cookie for testing in Node environment.
 *
 * NO DATABASE CLEANUP REQUIRED - these tests:
 * - Don't interact with any database
 * - Don't call any API endpoints
 * - Only test cookie utility functions with a mocked cookie store
 * - The mock is reset before each test via beforeEach
 */

import {
    setMarketingPreselectFromSku,
    getMarketingPreselect,
    clearMarketingPreselect,
    hasMarketingPreselect,
    processMarketingSkuFromUrl,
    isServicePreselect,
    isSubscriptionPreselect,
    isPackagePreselect,
    getSignedInRedirectUrl,
} from '@/lib/marketing-preselect'

// Mock document.cookie - this is an in-memory store, NOT real browser cookies
let cookieStore: { [key: string]: string } = {}

const mockDocument = {
    get cookie() {
        return Object.entries(cookieStore)
            .map(([key, value]) => `${key}=${value}`)
            .join('; ')
    },
    set cookie(value: string) {
        const parts = value.split(';')
        const [keyValue] = parts
        const [key, val] = keyValue.split('=')

        // Check for max-age=0 (delete)
        if (value.includes('max-age=0')) {
            delete cookieStore[key.trim()]
        } else if (val !== undefined) {
            cookieStore[key.trim()] = val
        }
    },
}

// Apply mock
Object.defineProperty(global, 'document', {
    value: mockDocument,
    writable: true,
})

// Mock window.location.protocol
Object.defineProperty(global, 'window', {
    value: {
        location: {
            protocol: 'https:',
        },
    },
    writable: true,
})

describe('Marketing Preselect Cookie Utility', () => {
    beforeEach(() => {
        // Clear mock cookie store before each test - ensures test isolation
        cookieStore = {}
    })

    afterEach(() => {
        // Verify cleanup: cookie store should be empty or contain only test data
        // Clear any leftover cookies from the test
        cookieStore = {}
    })

    afterAll(() => {
        // Verification: These tests create no database records
        // The cookieStore is just an in-memory mock object
        // Nothing external to clean up
        cookieStore = {}
    })

    describe('setMarketingPreselectFromSku', () => {
        // ==========================================================================
        // SEEKER SKU TESTS
        // ==========================================================================
        describe('Seeker SKUs', () => {
            it('should set cookie for valid SKU 2231035 (Trial)', () => {
                const result = setMarketingPreselectFromSku('2231035')
                expect(result).toBe(true)

                const preselect = getMarketingPreselect()
                expect(preselect?.sku).toBe('2231035')
                expect(preselect?.userType).toBe('seeker')
                expect(preselect?.planId).toBe('trial')
            })

            it('should set cookie for valid SKU 2215562 (Gold)', () => {
                const result = setMarketingPreselectFromSku('2215562')
                expect(result).toBe(true)

                const preselect = getMarketingPreselect()
                expect(preselect?.sku).toBe('2215562')
                expect(preselect?.userType).toBe('seeker')
                expect(preselect?.planId).toBe('gold')
            })

            it('should set cookie for valid SKU 2236043 (VIP Platinum)', () => {
                const result = setMarketingPreselectFromSku('2236043')
                expect(result).toBe(true)

                const preselect = getMarketingPreselect()
                expect(preselect?.planId).toBe('vip-platinum')
            })

            it('should set cookie for valid SKU 2307158 (Annual Platinum)', () => {
                const result = setMarketingPreselectFromSku('2307158')
                expect(result).toBe(true)

                const preselect = getMarketingPreselect()
                expect(preselect?.planId).toBe('annual-platinum')
            })
        })

        // ==========================================================================
        // EMPLOYER JOB PACKAGE SKU TESTS
        // ==========================================================================
        describe('Employer Job Package SKUs', () => {
            it('should set cookie for valid SKU 2164544 (Standard)', () => {
                const result = setMarketingPreselectFromSku('2164544')
                expect(result).toBe(true)

                const preselect = getMarketingPreselect()
                expect(preselect?.userType).toBe('employer')
                expect(preselect?.planId).toBe('standard')
            })

            it('should set cookie for valid SKU 2164540 (Featured)', () => {
                const result = setMarketingPreselectFromSku('2164540')
                expect(result).toBe(true)

                const preselect = getMarketingPreselect()
                expect(preselect?.userType).toBe('employer')
                expect(preselect?.planId).toBe('featured')
            })

            it('should set cookie for valid SKU 2283656 (Email Blast)', () => {
                const result = setMarketingPreselectFromSku('2283656')
                expect(result).toBe(true)

                const preselect = getMarketingPreselect()
                expect(preselect?.planId).toBe('email_blast')
            })

            it('should set cookie for valid SKU 2307643 (Email Blast Order variant)', () => {
                const result = setMarketingPreselectFromSku('2307643')
                expect(result).toBe(true)

                const preselect = getMarketingPreselect()
                expect(preselect?.planId).toBe('email_blast') // Same as 2283656
            })
        })

        // ==========================================================================
        // EMPLOYER CONCIERGE PACKAGE SKU TESTS
        // ==========================================================================
        describe('Employer Concierge Package SKUs', () => {
            it('should set cookie for valid SKU 2164534 (Concierge Level 1)', () => {
                const result = setMarketingPreselectFromSku('2164534')
                expect(result).toBe(true)

                const preselect = getMarketingPreselect()
                expect(preselect?.userType).toBe('employer')
                expect(preselect?.planId).toBe('concierge_level_1')
            })

            it('should set cookie for valid SKU 2285877 (Concierge Level 2)', () => {
                const result = setMarketingPreselectFromSku('2285877')
                expect(result).toBe(true)

                const preselect = getMarketingPreselect()
                expect(preselect?.planId).toBe('concierge_level_2')
            })

            it('should set cookie for valid SKU 2488598 (Concierge Level 3)', () => {
                const result = setMarketingPreselectFromSku('2488598')
                expect(result).toBe(true)

                const preselect = getMarketingPreselect()
                expect(preselect?.planId).toBe('concierge_level_3')
            })
        })

        // ==========================================================================
        // INVALID SKU TESTS
        // ==========================================================================
        describe('Invalid SKUs', () => {
            it('should return false and not set cookie for invalid SKU', () => {
                const result = setMarketingPreselectFromSku('9999999')
                expect(result).toBe(false)
                expect(getMarketingPreselect()).toBeNull()
            })

            it('should return false for empty string', () => {
                const result = setMarketingPreselectFromSku('')
                expect(result).toBe(false)
                expect(getMarketingPreselect()).toBeNull()
            })

            it('should return false for out-of-scope SKU (add-on)', () => {
                const result = setMarketingPreselectFromSku('2287955') // Reference Checks
                expect(result).toBe(false)
                expect(getMarketingPreselect()).toBeNull()
            })
        })
    })

    describe('getMarketingPreselect', () => {
        it('should return null when no cookie exists', () => {
            expect(getMarketingPreselect()).toBeNull()
        })

        it('should return parsed data when cookie exists', () => {
            setMarketingPreselectFromSku('2231035')
            const result = getMarketingPreselect()
            expect(result?.sku).toBe('2231035')
            expect(result?.planId).toBe('trial')
            expect(result?.userType).toBe('seeker')
            expect(result?.timestamp).toBeDefined()
        })

        it('should return null when cookie is expired (>24h)', () => {
            // Manually set expired cookie
            const expiredData = {
                sku: '2231035',
                userType: 'seeker',
                planId: 'trial',
                timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
            }
            cookieStore['hmm_preselect'] = encodeURIComponent(JSON.stringify(expiredData))

            expect(getMarketingPreselect()).toBeNull()
        })

        it('should return data when cookie is not yet expired (<24h)', () => {
            // Manually set non-expired cookie
            const validData = {
                sku: '2215562',
                userType: 'seeker',
                planId: 'gold',
                timestamp: Date.now() - 12 * 60 * 60 * 1000, // 12 hours ago
            }
            cookieStore['hmm_preselect'] = encodeURIComponent(JSON.stringify(validData))

            const result = getMarketingPreselect()
            expect(result?.planId).toBe('gold')
        })

        it('should return null for malformed cookie data', () => {
            cookieStore['hmm_preselect'] = 'invalid-json-data'
            expect(getMarketingPreselect()).toBeNull()
        })
    })

    describe('clearMarketingPreselect', () => {
        it('should remove the cookie', () => {
            setMarketingPreselectFromSku('2215562')
            expect(getMarketingPreselect()).not.toBeNull()

            clearMarketingPreselect()
            expect(getMarketingPreselect()).toBeNull()
        })

        it('should not throw when no cookie exists', () => {
            expect(() => clearMarketingPreselect()).not.toThrow()
        })
    })

    describe('hasMarketingPreselect', () => {
        it('should return false when no cookie exists', () => {
            expect(hasMarketingPreselect()).toBe(false)
        })

        it('should return true when valid cookie exists', () => {
            setMarketingPreselectFromSku('2215562')
            expect(hasMarketingPreselect()).toBe(true)
        })

        it('should return false after cookie is cleared', () => {
            setMarketingPreselectFromSku('2215562')
            clearMarketingPreselect()
            expect(hasMarketingPreselect()).toBe(false)
        })
    })

    describe('processMarketingSkuFromUrl', () => {
        it('should process SKU from URLSearchParams and return preselect data', () => {
            const params = new URLSearchParams('?sku=2215562')
            const result = processMarketingSkuFromUrl(params)

            expect(result?.sku).toBe('2215562')
            expect(result?.userType).toBe('seeker')
            expect(result?.planId).toBe('gold')
        })

        it('should process SKU from string and return preselect data', () => {
            const result = processMarketingSkuFromUrl('?sku=2164540')

            expect(result?.sku).toBe('2164540')
            expect(result?.userType).toBe('employer')
            expect(result?.planId).toBe('featured')
        })

        it('should return null when no SKU param present', () => {
            const params = new URLSearchParams('?other=value')
            const result = processMarketingSkuFromUrl(params)
            expect(result).toBeNull()
        })

        it('should return null for invalid SKU param', () => {
            const params = new URLSearchParams('?sku=invalid')
            const result = processMarketingSkuFromUrl(params)
            expect(result).toBeNull()
        })

        it('should set cookie when processing valid SKU', () => {
            clearMarketingPreselect()
            const params = new URLSearchParams('?sku=2236043')
            processMarketingSkuFromUrl(params)

            const cookie = getMarketingPreselect()
            expect(cookie?.planId).toBe('vip-platinum')
        })
    })

    // ==========================================================================
    // SERVICE SKU TESTS (Phase 2: Premium Services Pre-Selection)
    // ==========================================================================
    describe('Seeker Service SKUs', () => {
        describe('setMarketingPreselectFromSku - Service SKUs', () => {
            it('should set cookie for SKU 2228720 (Resume Refresh & Update)', () => {
                const result = setMarketingPreselectFromSku('2228720')
                expect(result).toBe(true)

                const preselect = getMarketingPreselect()
                expect(preselect?.sku).toBe('2228720')
                expect(preselect?.userType).toBe('seeker')
                expect(preselect?.planId).toBe('resume_refresh')
                expect(preselect?.purchaseType).toBe('service')
                // For services, planId IS the serviceId
            })

            it('should set cookie for SKU 2285875 (Create New Resume)', () => {
                const result = setMarketingPreselectFromSku('2285875')
                expect(result).toBe(true)

                const preselect = getMarketingPreselect()
                expect(preselect?.planId).toBe('create_new_resume')
                expect(preselect?.purchaseType).toBe('service')
            })

            it('should set cookie for SKU 2228721 (Cover Letter Enhancement)', () => {
                const result = setMarketingPreselectFromSku('2228721')
                expect(result).toBe(true)

                const preselect = getMarketingPreselect()
                expect(preselect?.planId).toBe('cover_letter_service')
                expect(preselect?.purchaseType).toBe('service')
            })

            it('should set cookie for SKU 2228723 (Interview Success Training)', () => {
                const result = setMarketingPreselectFromSku('2228723')
                expect(result).toBe(true)

                const preselect = getMarketingPreselect()
                expect(preselect?.planId).toBe('interview_success_training')
                expect(preselect?.purchaseType).toBe('service')
            })

            it('should set cookie for SKU 2228729 (The Works Bundle)', () => {
                const result = setMarketingPreselectFromSku('2228729')
                expect(result).toBe(true)

                const preselect = getMarketingPreselect()
                expect(preselect?.planId).toBe('the_works')
                expect(preselect?.purchaseType).toBe('service')
            })

            it('should set cookie for SKU 2283381 (Career Jumpstart Session)', () => {
                const result = setMarketingPreselectFromSku('2283381')
                expect(result).toBe(true)

                const preselect = getMarketingPreselect()
                expect(preselect?.planId).toBe('career_jumpstart')
                expect(preselect?.purchaseType).toBe('service')
            })

            it('should set cookie for SKU 2441627 (Personal Career Strategist)', () => {
                const result = setMarketingPreselectFromSku('2441627')
                expect(result).toBe(true)

                const preselect = getMarketingPreselect()
                expect(preselect?.planId).toBe('personal_career_strategist')
                expect(preselect?.purchaseType).toBe('service')
            })
        })

        describe('isServicePreselect', () => {
            it('should return true for service preselect', () => {
                setMarketingPreselectFromSku('2228720')
                const preselect = getMarketingPreselect()
                expect(isServicePreselect(preselect)).toBe(true)
            })

            it('should return false for subscription preselect', () => {
                setMarketingPreselectFromSku('2231035') // Trial subscription
                const preselect = getMarketingPreselect()
                expect(isServicePreselect(preselect)).toBe(false)
            })

            it('should return false for package preselect', () => {
                setMarketingPreselectFromSku('2164544') // Standard employer package
                const preselect = getMarketingPreselect()
                expect(isServicePreselect(preselect)).toBe(false)
            })

            it('should return false for null', () => {
                expect(isServicePreselect(null)).toBe(false)
            })
        })

        describe('isSubscriptionPreselect', () => {
            it('should return true for subscription preselect', () => {
                setMarketingPreselectFromSku('2231035') // Trial
                const preselect = getMarketingPreselect()
                expect(isSubscriptionPreselect(preselect)).toBe(true)
            })

            it('should return false for service preselect', () => {
                setMarketingPreselectFromSku('2228720')
                const preselect = getMarketingPreselect()
                expect(isSubscriptionPreselect(preselect)).toBe(false)
            })

            it('should return false for null', () => {
                expect(isSubscriptionPreselect(null)).toBe(false)
            })
        })

        describe('isPackagePreselect', () => {
            it('should return true for package preselect', () => {
                setMarketingPreselectFromSku('2164544') // Standard employer package
                const preselect = getMarketingPreselect()
                expect(isPackagePreselect(preselect)).toBe(true)
            })

            it('should return false for service preselect', () => {
                setMarketingPreselectFromSku('2228720')
                const preselect = getMarketingPreselect()
                expect(isPackagePreselect(preselect)).toBe(false)
            })

            it('should return false for null', () => {
                expect(isPackagePreselect(null)).toBe(false)
            })
        })

        describe('getSignedInRedirectUrl', () => {
            it('should return services page URL with autoOpen for service SKU', () => {
                setMarketingPreselectFromSku('2228720')
                const preselect = getMarketingPreselect()!
                const url = getSignedInRedirectUrl(preselect)
                expect(url).toBe('/seeker/services?service=resume_refresh&autoOpen=true')
            })

            it('should return subscription page URL with upgrade for subscription SKU', () => {
                setMarketingPreselectFromSku('2215562') // Gold
                const preselect = getMarketingPreselect()!
                const url = getSignedInRedirectUrl(preselect)
                expect(url).toBe('/seeker/subscription?plan=gold&upgrade=true')
            })

            it('should return employer billing page URL for package SKU', () => {
                setMarketingPreselectFromSku('2164544') // Standard
                const preselect = getMarketingPreselect()!
                const url = getSignedInRedirectUrl(preselect)
                expect(url).toBe('/employer/billing?plan=standard&autoOpen=true')
            })

            it('should handle all 7 service SKUs correctly', () => {
                const serviceSkus = [
                    { sku: '2228720', expectedService: 'resume_refresh' },
                    { sku: '2285875', expectedService: 'create_new_resume' },
                    { sku: '2228721', expectedService: 'cover_letter_service' },
                    { sku: '2228723', expectedService: 'interview_success_training' },
                    { sku: '2228729', expectedService: 'the_works' },
                    { sku: '2283381', expectedService: 'career_jumpstart' },
                    { sku: '2441627', expectedService: 'personal_career_strategist' },
                ]

                for (const { sku, expectedService } of serviceSkus) {
                    clearMarketingPreselect()
                    setMarketingPreselectFromSku(sku)
                    const preselect = getMarketingPreselect()!
                    const url = getSignedInRedirectUrl(preselect)
                    expect(url).toBe(`/seeker/services?service=${expectedService}&autoOpen=true`)
                }
            })
        })
    })
})
