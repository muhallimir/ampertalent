/**
 * Employer Packages Configuration
 *
 * Central configuration for all employer packages and their pricing.
 * Used by PayPal and Authorize.net payment APIs to validate and process
 * employer package purchases.
 */

export interface EmployerPackageConfig {
    id: string; // Package ID (e.g., 'standard', 'featured', 'concierge_level_1')
    name: string; // Display name
    price: number; // Price in USD
    type: 'job_package' | 'concierge'; // Package category
    listings: number; // Number of job postings included
    featuredListings: number; // Number of featured listings included
    duration: number; // Duration in days
    description?: string; // Optional description
}

// ============================================================================
// Job Posting Packages
// ============================================================================

export const JOB_PACKAGES: EmployerPackageConfig[] = [
    {
        id: 'standard',
        name: 'Standard Job Post',
        price: 97.0,
        type: 'job_package',
        listings: 1,
        featuredListings: 0,
        duration: 30,
        description: 'Perfect for single job postings',
    },
    {
        id: 'featured',
        name: 'Featured Job Post',
        price: 127.0,
        type: 'job_package',
        listings: 1,
        featuredListings: 1,
        duration: 30,
        description: 'Get noticed with featured placement',
    },
    {
        id: 'email_blast',
        name: 'Solo Email Blast',
        price: 249.0,
        type: 'job_package',
        listings: 1,
        featuredListings: 0,
        duration: 7,
        description: 'Stand out and get noticed FAST!',
    },
    {
        id: 'gold_plus',
        name: 'Gold Plus Small Business',
        price: 97.0,
        type: 'job_package',
        listings: 1,
        featuredListings: 0,
        duration: 180, // 6 months
        description: 'For roles you are continually hiring for',
    },
];

// ============================================================================
// Concierge Packages
// ============================================================================

export const CONCIERGE_PACKAGES: EmployerPackageConfig[] = [
    {
        id: 'concierge_lite',
        name: 'Concierge Lite',
        price: 795.0,
        type: 'concierge',
        listings: 1,
        featuredListings: 0,
        duration: 30,
        description: 'Legacy concierge service (no longer offered)',
    },
    {
        id: 'concierge_level_1',
        name: 'Concierge Level I',
        price: 1695.0,
        type: 'concierge',
        listings: 1,
        featuredListings: 0,
        duration: 30,
        description: 'For entry-level roles: Administrative, Support Services and Customer Service',
    },
    {
        id: 'concierge_level_2',
        name: 'Concierge Level II',
        price: 2695.0,
        type: 'concierge',
        listings: 1,
        featuredListings: 0,
        duration: 30,
        description: 'For mid-level roles: Bookkeepers, Project Coordinators, Account Managers',
    },
    {
        id: 'concierge_level_3',
        name: 'Concierge Level III',
        price: 3995.0,
        type: 'concierge',
        listings: 1,
        featuredListings: 0,
        duration: 30,
        description: 'For mid-to-upper-level roles: Executives, Managers, Marketing/PR',
    },
];

// ============================================================================
// Legacy Database Package Types (for backward compatibility)
// These are the database PackageType enum values that map to package IDs
// ============================================================================

export const LEGACY_PACKAGE_MAPPING: Record<string, string> = {
    // Legacy enum values → modern package IDs
    'standard_job_post': 'standard',
    'featured_job_post': 'featured',
    'solo_email_blast': 'email_blast',
    'gold_plus_6_month': 'gold_plus',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all employer packages (job + concierge)
 */
export function getAllEmployerPackages(): EmployerPackageConfig[] {
    return [...JOB_PACKAGES, ...CONCIERGE_PACKAGES];
}

/**
 * Get a package by its ID
 * Supports both modern IDs (e.g., 'standard') and legacy database IDs (e.g., 'standard_job_post')
 * Also supports UI prefixed IDs (e.g., 'package_standard')
 */
export function getEmployerPackageById(packageId: string): EmployerPackageConfig | undefined {
    // Normalize the ID:
    // 1. Strip 'package_' prefix if present (UI sends this)
    let normalizedId = packageId.startsWith('package_')
        ? packageId.replace('package_', '')
        : packageId;

    // 2. Check if it's a legacy database ID and map to modern ID
    if (LEGACY_PACKAGE_MAPPING[normalizedId]) {
        normalizedId = LEGACY_PACKAGE_MAPPING[normalizedId];
    }

    return getAllEmployerPackages().find((pkg) => pkg.id === normalizedId);
}

/**
 * Check if a package ID is valid
 */
export function isValidEmployerPackage(packageId: string): boolean {
    return getEmployerPackageById(packageId) !== undefined;
}

/**
 * Get package price by ID
 */
export function getEmployerPackagePrice(packageId: string): number | undefined {
    const pkg = getEmployerPackageById(packageId);
    return pkg?.price;
}

/**
 * Get only job packages (non-concierge)
 */
export function getJobPackages(): EmployerPackageConfig[] {
    return JOB_PACKAGES;
}

/**
 * Get only concierge packages
 */
export function getConciergePackages(): EmployerPackageConfig[] {
    return CONCIERGE_PACKAGES;
}
