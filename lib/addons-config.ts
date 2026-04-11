/**
 * Hardcoded Employer Add-On Services Configuration
 * 
 * These are static product offerings that don't change without code deployment.
 * Add-ons are available for concierge packages and provide additional services
 * like reference checks, onboarding assistance, and rush service.
 */

export interface EmployerAddOnConfig {
    id: string // Semantic identifier (e.g., 'reference_checks', 'onboarding_new_hire')
    name: string
    shortDescription: string
    description: string
    price: number
    category: 'concierge_addon'
    userType: 'employer'
    isActive: boolean
    features: string[]
    icon: string
    availableForPackages: string[] // Which package types can add this (e.g., ['concierge_lite', 'concierge_level_1', 'concierge_level_2', 'concierge_level_3'])
}

export const EMPLOYER_ADDONS: EmployerAddOnConfig[] = [
    {
        id: 'concierge_rush_service',
        name: 'Concierge Rush Service',
        shortDescription: '$349.00',
        description: `If you need your project completed within two weeks, you can select our RUSH service.`,
        price: 349,
        category: 'concierge_addon',
        userType: 'employer',
        isActive: true,
        features: [
            '2-week project completion',
            'Priority handling of your concierge request',
            'Expedited candidate screening and shortlisting',
            'Dedicated rush service coordinator',
        ],
        icon: 'Employer-concierge-rush-service.png',
        availableForPackages: ['concierge_lite', 'concierge_level_1', 'concierge_level_2', 'concierge_level_3'],
    },
    {
        id: 'onboarding_new_hire',
        name: 'Onboarding Your New Hire',
        shortDescription: '$195.00',
        description: `Allow our HR Specialist to help you onboard your new hire. Service includes:`,
        price: 195,
        category: 'concierge_addon',
        userType: 'employer',
        isActive: true,
        features: [
            'Reference checks – reach out to references for feedback on candidate',
            'Draft an offer letter',
            'Have candidate complete and sign contracts, agreements and/or tax and payroll forms provided by the client',
            'Create next steps for your new hire',
            'Help create first 30 day goals and expectations for your new hire',
        ],
        icon: 'Employer-onboarding-new-hire.png',
        availableForPackages: ['concierge_lite', 'concierge_level_1', 'concierge_level_2', 'concierge_level_3'],
    },
    {
        id: 'reference_checks',
        name: 'Reference Checks',
        shortDescription: '$95.00',
        description: `Check this off your busy to-do list!\nAllow our HR Specialist to check references for you!`,
        price: 95,
        category: 'concierge_addon',
        userType: 'employer',
        isActive: true,
        features: [
            'HR Specialist checks references for you',
            'Professional reference interviews',
            'Verification of candidate background',
            'Save time on reference checking process',
        ],
        icon: 'Employer-reference-checks.png',
        availableForPackages: ['concierge_lite', 'concierge_level_1', 'concierge_level_2', 'concierge_level_3'],
    },
]

/**
 * Get a specific add-on by ID
 */
export function getAddOnById(id: string): EmployerAddOnConfig | undefined {
    return EMPLOYER_ADDONS.find(addon => addon.id === id)
}

/**
 * Get all active add-ons available for a specific package type
 */
export function getAddOnsByPackageType(packageType: string): EmployerAddOnConfig[] {
    return EMPLOYER_ADDONS.filter(addon =>
        addon.availableForPackages.includes(packageType) && addon.isActive
    )
}

/**
 * Get all active add-ons
 */
export function getAllActiveAddOns(): EmployerAddOnConfig[] {
    return EMPLOYER_ADDONS.filter(addon => addon.isActive)
}

/**
 * Validate that an add-on ID is valid
 */
export function isValidAddOnId(id: string): boolean {
    return EMPLOYER_ADDONS.some(addon => addon.id === id && addon.isActive)
}

/**
 * Validate that an add-on is available for a specific package type
 */
export function isAddOnAvailableForPackage(addOnId: string, packageType: string): boolean {
    const addOn = getAddOnById(addOnId)
    return addOn ? addOn.availableForPackages.includes(packageType) && addOn.isActive : false
}
