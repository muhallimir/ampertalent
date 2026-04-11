/**
 * Marketing Pre-Selection Cookie Utility
 *
 * Manages the persistence of marketing site pre-selections across the
 * sign-up/sign-in flow using cookies.
 */

import { getSkuMapping, PurchaseType } from './wordpress-sku-mapping'

export interface MarketingPreselect {
    sku: string // Original WordPress SKU
    userType: 'seeker' | 'employer'
    planId: string // Internal plan ID (resolved from SKU) - for services, this is the serviceId
    purchaseType: PurchaseType // 'subscription', 'package', or 'service'
    timestamp: number // For expiry management
}

const COOKIE_NAME = 'hmm_preselect'
const COOKIE_MAX_AGE = 60 * 60 * 24 // 24 hours in seconds

/**
 * Set marketing preselection cookie from SKU
 * @param sku WordPress product SKU
 * @returns true if valid SKU and cookie was set, false otherwise
 */
export function setMarketingPreselectFromSku(sku: string): boolean {
    if (typeof document === 'undefined') return false

    const mapping = getSkuMapping(sku)
    if (!mapping) {
        console.warn(`[MarketingPreselect] Invalid SKU: ${sku}`)
        return false
    }

    const data: MarketingPreselect = {
        sku: mapping.sku,
        userType: mapping.userType,
        planId: mapping.planId,
        purchaseType: mapping.purchaseType,
        timestamp: Date.now(),
    }

    const isSecure = window.location.protocol === 'https:'
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(data))}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${isSecure ? '; Secure' : ''}`

    console.log(`[MarketingPreselect] Cookie set:`, data)
    return true
}

/**
 * Get marketing preselection from cookie
 * @returns MarketingPreselect or null if not found/expired
 */
export function getMarketingPreselect(): MarketingPreselect | null {
    if (typeof document === 'undefined') return null

    const cookies = document.cookie.split(';')
    const cookie = cookies.find((c) => c.trim().startsWith(`${COOKIE_NAME}=`))

    if (!cookie) return null

    try {
        const value = decodeURIComponent(cookie.split('=')[1])
        const data: MarketingPreselect = JSON.parse(value)

        // Check expiry (24 hours)
        const expiryMs = COOKIE_MAX_AGE * 1000
        if (Date.now() - data.timestamp > expiryMs) {
            console.log(`[MarketingPreselect] Cookie expired, clearing`)
            clearMarketingPreselect()
            return null
        }

        return data
    } catch (error) {
        console.error(`[MarketingPreselect] Error parsing cookie:`, error)
        return null
    }
}

/**
 * Clear marketing preselection cookie
 */
export function clearMarketingPreselect(): void {
    if (typeof document === 'undefined') return
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`
    console.log(`[MarketingPreselect] Cookie cleared`)
}

/**
 * Check if there's a valid marketing preselection
 */
export function hasMarketingPreselect(): boolean {
    return getMarketingPreselect() !== null
}

/**
 * Extract SKU from URL search params and set cookie if valid
 * Call this on sign-up/sign-in pages
 * @param searchParams URL search params (can be string or URLSearchParams)
 * @returns The MarketingPreselect data if SKU was valid, null otherwise
 */
export function processMarketingSkuFromUrl(
    searchParams: URLSearchParams | string
): MarketingPreselect | null {
    const params =
        typeof searchParams === 'string' ? new URLSearchParams(searchParams) : searchParams

    const sku = params.get('sku')
    if (!sku) return null

    const success = setMarketingPreselectFromSku(sku)
    if (success) {
        return getMarketingPreselect()
    }

    return null
}

/**
 * Check if the preselection is for a premium service (one-time purchase)
 */
export function isServicePreselect(preselect: MarketingPreselect | null): boolean {
    return preselect?.purchaseType === 'service'
}

/**
 * Check if the preselection is for a subscription (recurring)
 */
export function isSubscriptionPreselect(preselect: MarketingPreselect | null): boolean {
    return preselect?.purchaseType === 'subscription'
}

/**
 * Check if the preselection is for an employer package
 */
export function isPackagePreselect(preselect: MarketingPreselect | null): boolean {
    return preselect?.purchaseType === 'package'
}

/**
 * Get the redirect URL for an already-signed-in user based on preselection
 * For services: /seeker/services?service=<serviceId>&autoOpen=true
 * For subscriptions: /seeker/subscription?plan=<planId>&upgrade=true
 * For packages: /employer/billing?plan=<planId>&autoOpen=true
 */
export function getSignedInRedirectUrl(preselect: MarketingPreselect): string {
    if (preselect.purchaseType === 'service') {
        return `/seeker/services?service=${preselect.planId}&autoOpen=true`
    }
    if (preselect.purchaseType === 'subscription') {
        return `/seeker/subscription?plan=${preselect.planId}&upgrade=true`
    }
    // Package (employer)
    return `/employer/billing?plan=${preselect.planId}&autoOpen=true`
}
