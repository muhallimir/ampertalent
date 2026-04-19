/**
 * marketing SKU to Internal Plan Mapping
 *
 * This file maps marketing product SKUs to internal plan IDs and user types.
 * SKUs are the primary identifier used in marketing site URLs.
 */

export type PurchaseType = 'subscription' | 'package' | 'service'

export interface SkuMapping {
    sku: string
    userType: 'seeker' | 'employer'
    planId: string
    name: string
    price: number
    priceDescription: string
    /** Type of purchase: subscription (recurring), package (one-time job/concierge), or service (one-time premium service) */
    purchaseType: PurchaseType
}

// ============================================================================
// SEEKER SUBSCRIPTION SKUs
// ============================================================================
export const SEEKER_SKU_MAPPINGS: SkuMapping[] = [
    {
        sku: '2231035',
        userType: 'seeker',
        planId: 'trial',
        name: '3 Day Free Trial Subscription',
        price: 34.99,
        priceDescription: '$34.99/month with a 3-day free trial',
        purchaseType: 'subscription',
    },
    {
        sku: '2215562',
        userType: 'seeker',
        planId: 'gold',
        name: 'Gold Mom Professional',
        price: 49.99,
        priceDescription: '$49.99 every 2 months',
        purchaseType: 'subscription',
    },
    {
        sku: '2236043',
        userType: 'seeker',
        planId: 'vip-platinum',
        name: 'VIP Platinum Mom Professional',
        price: 79.99,
        priceDescription: '$79.99 every 3 months',
        purchaseType: 'subscription',
    },
    {
        sku: '2307158',
        userType: 'seeker',
        planId: 'annual-platinum',
        name: 'Annual Platinum Mom Professional',
        price: 299.0,
        priceDescription: '$299.00/year',
        purchaseType: 'subscription',
    },
]

// ============================================================================
// SEEKER PREMIUM SERVICE SKUs (One-time purchases)
// ============================================================================
export const SEEKER_SERVICE_SKU_MAPPINGS: SkuMapping[] = [
    {
        sku: '2228720',
        userType: 'seeker',
        planId: 'resume_refresh',
        name: 'Resume Refresh & Update',
        price: 149.0,
        priceDescription: '$149.00',
        purchaseType: 'service',
    },
    {
        sku: '2285875',
        userType: 'seeker',
        planId: 'create_new_resume',
        name: 'Create New Resume',
        price: 249.0,
        priceDescription: '$249.00',
        purchaseType: 'service',
    },
    {
        sku: '2228721',
        userType: 'seeker',
        planId: 'cover_letter_service',
        name: 'Cover Letter Enhancement Service',
        price: 75.0,
        priceDescription: '$75.00',
        purchaseType: 'service',
    },
    {
        sku: '2228723',
        userType: 'seeker',
        planId: 'interview_success_training',
        name: 'Interview Success Training',
        price: 100.0,
        priceDescription: '$100.00',
        purchaseType: 'service',
    },
    {
        sku: '2228729',
        userType: 'seeker',
        planId: 'the_works',
        name: 'The Works: Resume + Cover Letter + Interview',
        price: 349.0,
        priceDescription: '$349.00',
        purchaseType: 'service',
    },
    {
        sku: '2283381',
        userType: 'seeker',
        planId: 'career_jumpstart',
        name: 'Career Jumpstart Session',
        price: 99.0,
        priceDescription: '$99.00',
        purchaseType: 'service',
    },
    {
        sku: '2441627',
        userType: 'seeker',
        planId: 'personal_career_strategist',
        name: 'Personal Career Strategist',
        price: 299.0,
        priceDescription: '$299.00',
        purchaseType: 'service',
    },
]

// ============================================================================
// EMPLOYER JOB PACKAGE SKUs
// ============================================================================
export const EMPLOYER_JOB_SKU_MAPPINGS: SkuMapping[] = [
    {
        sku: '2164544',
        userType: 'employer',
        planId: 'standard',
        name: 'Standard Job Post',
        price: 97.0,
        priceDescription: '$97.00',
        purchaseType: 'package',
    },
    {
        sku: '2164540',
        userType: 'employer',
        planId: 'featured',
        name: 'Featured Job Post',
        price: 127.0,
        priceDescription: '$127.00',
        purchaseType: 'package',
    },
    {
        sku: '2283656',
        userType: 'employer',
        planId: 'email_blast',
        name: 'Solo Email Blast',
        price: 249.0,
        priceDescription: '$249.00',
        purchaseType: 'package',
    },
    {
        sku: '2307643', // Order variant - maps to same plan
        userType: 'employer',
        planId: 'email_blast',
        name: 'Solo Email Blast',
        price: 249.0,
        priceDescription: '$249.00',
        purchaseType: 'package',
    },
]

// ============================================================================
// EMPLOYER CONCIERGE PACKAGE SKUs
// ============================================================================
export const EMPLOYER_CONCIERGE_SKU_MAPPINGS: SkuMapping[] = [
    {
        sku: '2164534',
        userType: 'employer',
        planId: 'concierge_level_1',
        name: 'Level 1 Concierge',
        price: 1695.0,
        priceDescription: '$1,695.00',
        purchaseType: 'package',
    },
    {
        sku: '2285877',
        userType: 'employer',
        planId: 'concierge_level_2',
        name: 'Level II Concierge',
        price: 2695.0,
        priceDescription: '$2,695.00',
        purchaseType: 'package',
    },
    {
        sku: '2488598',
        userType: 'employer',
        planId: 'concierge_level_3',
        name: 'Level III Concierge',
        price: 3995.0,
        priceDescription: '$3,995.00',
        purchaseType: 'package',
    },
]

// ============================================================================
// COMBINED MAPPINGS & LOOKUP FUNCTIONS
// ============================================================================

export const ALL_SKU_MAPPINGS: SkuMapping[] = [
    ...SEEKER_SKU_MAPPINGS,
    ...SEEKER_SERVICE_SKU_MAPPINGS,
    ...EMPLOYER_JOB_SKU_MAPPINGS,
    ...EMPLOYER_CONCIERGE_SKU_MAPPINGS,
]

// Create lookup map for O(1) access
const SKU_LOOKUP_MAP = new Map<string, SkuMapping>(
    ALL_SKU_MAPPINGS.map((mapping) => [mapping.sku, mapping])
)

/**
 * Look up a SKU and return its mapping
 * @param sku marketing product SKU
 * @returns SkuMapping or null if not found
 */
export function getSkuMapping(sku: string): SkuMapping | null {
    return SKU_LOOKUP_MAP.get(sku) || null
}

/**
 * Check if a SKU is valid
 * @param sku marketing product SKU
 */
export function isValidSku(sku: string): boolean {
    return SKU_LOOKUP_MAP.has(sku)
}

/**
 * Get user type from SKU
 * @param sku marketing product SKU
 */
export function getUserTypeFromSku(sku: string): 'seeker' | 'employer' | null {
    const mapping = getSkuMapping(sku)
    return mapping?.userType || null
}

/**
 * Get internal plan ID from SKU
 * @param sku marketing product SKU
 */
export function getPlanIdFromSku(sku: string): string | null {
    const mapping = getSkuMapping(sku)
    return mapping?.planId || null
}

/**
 * Get all valid seeker SKUs
 */
export function getValidSeekerSkus(): string[] {
    return SEEKER_SKU_MAPPINGS.map((m) => m.sku)
}

/**
 * Get all valid employer SKUs
 */
export function getValidEmployerSkus(): string[] {
    return [...EMPLOYER_JOB_SKU_MAPPINGS, ...EMPLOYER_CONCIERGE_SKU_MAPPINGS].map((m) => m.sku)
}

/**
 * Get all valid seeker service SKUs
 */
export function getValidSeekerServiceSkus(): string[] {
    return SEEKER_SERVICE_SKU_MAPPINGS.map((m) => m.sku)
}

/**
 * Check if a SKU is for a premium service (one-time purchase)
 */
export function isServiceSku(sku: string): boolean {
    const mapping = getSkuMapping(sku)
    return mapping?.purchaseType === 'service'
}

/**
 * Check if a SKU is for a subscription (recurring)
 */
export function isSubscriptionSku(sku: string): boolean {
    const mapping = getSkuMapping(sku)
    return mapping?.purchaseType === 'subscription'
}

/**
 * Check if a SKU is for a package (one-time employer purchase)
 */
export function isPackageSku(sku: string): boolean {
    const mapping = getSkuMapping(sku)
    return mapping?.purchaseType === 'package'
}

/**
 * Get the purchase type from a SKU
 */
export function getPurchaseTypeFromSku(sku: string): PurchaseType | null {
    const mapping = getSkuMapping(sku)
    return mapping?.purchaseType || null
}

/**
 * Get service info by service ID (planId for services)
 * Useful for displaying service details in the UI
 */
export function getServiceInfoById(serviceId: string): { name: string; price: number; priceDescription: string } | null {
    const service = SEEKER_SERVICE_SKU_MAPPINGS.find(m => m.planId === serviceId)
    if (!service) return null
    return {
        name: service.name,
        price: service.price,
        priceDescription: service.priceDescription,
    }
}

/**
 * Get the internal service ID from a SKU
 * Used to map SKU → service ID for the services page after PayPal redirect
 * @param sku marketing product SKU
 * @returns The internal service ID (planId) or null if not a service SKU
 */
export function getServiceIdFromSku(sku: string): string | null {
    const mapping = SEEKER_SERVICE_SKU_MAPPINGS.find(m => m.sku === sku)
    return mapping?.planId || null
}
