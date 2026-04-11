/**
 * Abandoned Cart Service - Both Seeker and Employer
 * 
 * Handles fetching, enriching, and calculating metrics for:
 * - Seeker pending signups (subscription abandonments)
 * - Employer pending job posts (job posting checkout abandonments)
 */

export interface AbandonedCart {
    id: string
    email: string
    selectedPlan: string
    createdAt: string
    expiresAt: string
    isExpired: boolean
    daysAgo: number
    timeRemaining: string
    estimatedValue: number
    planStatus: 'trial' | 'paid' | 'none'
    valueExplanation: string // Why this value
    userType: 'seeker' | 'employer' // Type of user
    jobTitle?: string // For employer job posts
    packageType?: string // For employer: standard, featured, email_blast, etc.
}

export interface AbandonedCartStats {
    totalActive: number
    totalExpired: number
    activeValue: number
    expiredValue: number
    totalValue: number
    averageValue: number
    last24hCount: number
    last7dCount: number
    seekers: number // Count of seeker abandonments
    employers: number // Count of employer abandonments
    planBreakdown: Array<{
        planName: string
        count: number
        totalValue: number
        userType: 'seeker' | 'employer'
    }>
}
/**
 * Seeker subscription plans and their values
 * 
 * SEEKER PLANS:
 * - trial / trial_monthly: $34.99/month (potential value after 3-day free trial)
 * - none: No plan selected - Free (value: $0)
 * - gold / gold_bimonthly: $49.99 per 2 months
 * - vip / vip-platinum / vip_quarterly: $79.99 per 3 months
 * - annual / annual-platinum / annual_platinum: $299.00 per year
 * 
 * EMPLOYER PACKAGES:
 * - standard: $97.00 - Basic job posting
 * - featured: $127.00 - Featured job posting (7 days)
 * - email_blast: $249.00 - Solo email blast to all seekers
 * - gold_plus: $97.00 - Featured + Email blast bundle (same as standard)
 * - concierge_lite: $795.00 - Concierge service lite (Legacy - DEPRECATED)
 * - concierge_level_1: $1,695.00 - Concierge Level I
 * - concierge_level_2: $2,695.00 - Concierge Level II
 * - concierge_level_3: $3,995.00 - Concierge Level III
 */
import { planPrice as seekerPlanPrice } from '@/lib/subscription-plans'

const PLAN_PRICES: Record<string, number> = {
    // SEEKER: Trial plans - derived from subscription-plans.ts
    'trial': seekerPlanPrice('trial'),
    'trial_monthly': seekerPlanPrice('trial_monthly'),
    'none': 0,

    // SEEKER: Paid plans - derived from subscription-plans.ts
    'gold': seekerPlanPrice('gold'),
    'gold_bimonthly': seekerPlanPrice('gold_bimonthly'),
    'vip': seekerPlanPrice('vip-platinum'),
    'vip-platinum': seekerPlanPrice('vip-platinum'),
    'vip_quarterly': seekerPlanPrice('vip_quarterly'),
    'annual': seekerPlanPrice('annual-platinum'),
    'annual-platinum': seekerPlanPrice('annual-platinum'),
    'annual_platinum': seekerPlanPrice('annual_platinum'),

    // EMPLOYER: Job posting packages (UPDATED PRICES - Nov 2025)
    'standard': 97.00,
    'featured': 127.00,
    'email_blast': 249.00,
    'gold_plus': 97.00,

    // EMPLOYER: Exclusive recurring plans (Gold Plus Small Business)
    'gold_plus_recurring_6mo': 582.00, // $97/month x 6 months total value

    // EMPLOYER: Concierge packages (UPDATED PRICES - Jan 2026)
    'concierge_lite': 795.00, // Legacy - no longer offered
    'concierge_level_1': 1695.00,
    'concierge_level_2': 2695.00,
    'concierge_level_3': 3995.00,
}

/**
 * Plan status categorization
 */
function getPlanStatus(planName: string): 'trial' | 'paid' | 'none' {
    if (!planName || planName === '' || planName === 'none') return 'none'
    if (planName === 'trial' || planName === 'trial_monthly') return 'trial'
    return 'paid'
}

/**
 * Get package price for a plan
 */
function getPlanPrice(planName: string | null | undefined): number {
    if (!planName) return 0
    const normalized = planName.toLowerCase().trim()
    return PLAN_PRICES[normalized] ?? 0
}

/**
 * Generate explanation for the value
 * Explains whether plan was paid, trial, never started, or cancelled
 */
function getValueExplanation(planName: string | null | undefined): string {
    if (!planName || planName === '' || planName === 'none') {
        return 'No plan selected (never started)'
    }
    if (planName === 'trial' || planName === 'trial_monthly') {
        return 'Trial plan ($34.99/mo potential after 3-day free trial)'
    }
    const price = getPlanPrice(planName)
    if (price > 0) {
        return `Paid plan: $${price.toFixed(2)}`
    }
    return 'Unknown plan'
}

/**
 * Format time remaining
 */
function formatTimeRemaining(ms: number): string {
    if (ms <= 0) return 'Expired'

    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
        const remainingHours = hours % 24
        return `${days}d ${remainingHours}h`
    } else if (hours > 0) {
        const remainingMinutes = minutes % 60
        return `${hours}h ${remainingMinutes}m`
    } else {
        return '<1h'
    }
}

/**
 * Calculate days ago
 */
function getDaysAgo(dateString: string): number {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}



/**
 * Abandoned Cart Service - Both Seeker and Employer
 */
export class AbandonedCartService {
    /**
     * Fetch all abandoned checkouts (seeker signups + employer job posts)
     * 
     * @param limit - Number of records to fetch per page
     * @returns Array of enriched abandoned carts
     */
    static async getAbandonedCarts(limit: number = 100): Promise<AbandonedCart[]> {
        try {
            // Fetch seeker pending signups
            const seekerResponse = await fetch(
                `/api/admin/pending-signups?page=1&limit=${limit}&status=all`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                }
            )

            if (!seekerResponse.ok) {
                throw new Error(`Failed to fetch seeker pending signups: ${seekerResponse.status}`)
            }

            const seekerData = await seekerResponse.json()
            const seekerSignups = seekerData?.pendingSignups || []

            // Fetch employer pending job posts
            const employerResponse = await fetch(
                `/api/admin/pending-job-posts?page=1&limit=${limit}&status=all`,
                {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                }
            )

            let employerJobPosts: any[] = []
            if (employerResponse.ok) {
                const employerData = await employerResponse.json()
                employerJobPosts = employerData?.pendingJobPosts || []
            } else {
                console.warn('Could not fetch employer pending job posts:', employerResponse.status)
            }

            // Enrich seeker signups
            const seekerCarts: AbandonedCart[] = seekerSignups.map((signup: any) => {
                const expiresAt = signup.expiresAt ? new Date(signup.expiresAt) : null
                const now = new Date()
                const isExpired = expiresAt ? expiresAt < now : false
                const timeRemainingMs = expiresAt ? expiresAt.getTime() - now.getTime() : 0
                const planName = signup.selectedPlan || ''

                return {
                    id: signup.id,
                    email: signup.email || 'unknown@email.com',
                    selectedPlan: planName,
                    createdAt: signup.createdAt,
                    expiresAt: signup.expiresAt || '',
                    isExpired,
                    daysAgo: getDaysAgo(signup.createdAt),
                    timeRemaining: formatTimeRemaining(timeRemainingMs),
                    estimatedValue: getPlanPrice(planName),
                    planStatus: getPlanStatus(planName),
                    valueExplanation: getValueExplanation(planName),
                    userType: 'seeker'
                }
            })

            // Enrich employer job posts
            const employerCarts: AbandonedCart[] = employerJobPosts.map((jobPost: any) => {
                const expiresAt = jobPost.expiresAt ? new Date(jobPost.expiresAt) : null
                const now = new Date()
                const isExpired = expiresAt ? expiresAt < now : false
                const timeRemainingMs = expiresAt ? expiresAt.getTime() - now.getTime() : 0
                const packageName = jobPost.selectedPackage || 'standard'

                // Get job title - API already parses it, so use that first
                // If jobData is present (direct DB query), parse it
                let jobTitle = jobPost.jobTitle || 'Untitled Job'
                if (!jobPost.jobTitle && jobPost.jobData) {
                    try {
                        const jobData = typeof jobPost.jobData === 'string'
                            ? JSON.parse(jobPost.jobData)
                            : jobPost.jobData
                        jobTitle = jobData?.title || jobData?.jobTitle || 'Untitled Job'
                    } catch (e) {
                        console.error('Error parsing job data:', e)
                    }
                }

                return {
                    id: jobPost.id,
                    email: jobPost.email || 'unknown@email.com',
                    selectedPlan: packageName,
                    createdAt: jobPost.createdAt,
                    expiresAt: jobPost.expiresAt || '',
                    isExpired,
                    daysAgo: getDaysAgo(jobPost.createdAt),
                    timeRemaining: formatTimeRemaining(timeRemainingMs),
                    estimatedValue: getPlanPrice(packageName),
                    planStatus: 'paid', // All employer packages are paid
                    valueExplanation: `Employer package: $${getPlanPrice(packageName).toFixed(2)}`,
                    userType: 'employer',
                    jobTitle,
                    packageType: packageName
                }
            })

            // Combine and sort by creation date (most recent first)
            const allCarts = [...seekerCarts, ...employerCarts].sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )

            return allCarts
        } catch (error) {
            console.error('Error fetching abandoned carts:', error)
            throw error
        }
    }

    /**
     * Calculate statistics from abandoned carts
     */
    static calculateStats(carts: AbandonedCart[]): AbandonedCartStats {
        if (!carts || carts.length === 0) {
            return {
                totalActive: 0,
                totalExpired: 0,
                activeValue: 0,
                expiredValue: 0,
                totalValue: 0,
                averageValue: 0,
                last24hCount: 0,
                last7dCount: 0,
                seekers: 0,
                employers: 0,
                planBreakdown: []
            }
        }

        const now = new Date()
        const last24hAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        const last7dAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        // Count by status
        const activeCount = carts.filter(c => !c.isExpired).length
        const expiredCount = carts.filter(c => c.isExpired).length

        // Count by user type
        const seekersCount = carts.filter(c => c.userType === 'seeker').length
        const employersCount = carts.filter(c => c.userType === 'employer').length

        // Count by time ranges
        const last24hCount = carts.filter(c => {
            const createdDate = new Date(c.createdAt)
            return createdDate >= last24hAgo
        }).length

        const last7dCount = carts.filter(c => {
            const createdDate = new Date(c.createdAt)
            return createdDate >= last7dAgo
        }).length

        // Calculate values (only paid plans, not trials)
        const activeValue = carts
            .filter(c => !c.isExpired && c.planStatus === 'paid')
            .reduce((sum, c) => sum + c.estimatedValue, 0)

        const expiredValue = carts
            .filter(c => c.isExpired && c.planStatus === 'paid')
            .reduce((sum, c) => sum + c.estimatedValue, 0)

        const totalValue = activeValue + expiredValue

        // Average value per paid cart
        const paidCarts = carts.filter(c => c.planStatus === 'paid')
        const averageValue = paidCarts.length > 0 ? totalValue / paidCarts.length : 0

        // Plan breakdown
        const planMap = new Map<string, { count: number; totalValue: number; userType: 'seeker' | 'employer' }>()

        carts.forEach(cart => {
            const plan = cart.selectedPlan || 'none'
            const existing = planMap.get(plan) || { count: 0, totalValue: 0, userType: cart.userType }
            planMap.set(plan, {
                count: existing.count + 1,
                totalValue: existing.totalValue + cart.estimatedValue,
                userType: cart.userType
            })
        })

        const planBreakdown = Array.from(planMap.entries())
            .map(([planName, { count, totalValue, userType }]) => ({
                planName,
                count,
                totalValue: Math.round(totalValue * 100) / 100,
                userType
            }))
            .sort((a, b) => b.count - a.count)

        return {
            totalActive: activeCount,
            totalExpired: expiredCount,
            activeValue: Math.round(activeValue * 100) / 100,
            expiredValue: Math.round(expiredValue * 100) / 100,
            totalValue: Math.round(totalValue * 100) / 100,
            averageValue: Math.round(averageValue * 100) / 100,
            last24hCount,
            last7dCount,
            seekers: seekersCount,
            employers: employersCount,
            planBreakdown
        }
    }

    /**
     * Group carts by urgency (time remaining)
     */
    static groupByUrgency(carts: AbandonedCart[]): {
        critical: AbandonedCart[] // < 2 hours
        warning: AbandonedCart[] // 2-24 hours
        normal: AbandonedCart[] // > 24 hours
        expired: AbandonedCart[]
    } {
        const critical: AbandonedCart[] = []
        const warning: AbandonedCart[] = []
        const normal: AbandonedCart[] = []
        const expired: AbandonedCart[] = []

        const twoHoursMs = 2 * 60 * 60 * 1000
        const twentyFourHoursMs = 24 * 60 * 60 * 1000

        carts.forEach(cart => {
            if (cart.isExpired) {
                expired.push(cart)
            } else {
                const timeRemainingMs = new Date(cart.expiresAt).getTime() - new Date().getTime()
                if (timeRemainingMs < twoHoursMs) {
                    critical.push(cart)
                } else if (timeRemainingMs < twentyFourHoursMs) {
                    warning.push(cart)
                } else {
                    normal.push(cart)
                }
            }
        })

        return { critical, warning, normal, expired }
    }

    /**
     * Get total recoverable revenue (only paid plans)
     */
    static getRecoverableRevenue(carts: AbandonedCart[]): number {
        return carts
            .filter(c => !c.isExpired && c.planStatus === 'paid')
            .reduce((sum, c) => sum + c.estimatedValue, 0)
    }

    /**
     * Get recent carts from last N days
     */
    static getRecentCarts(carts: AbandonedCart[], days: number = 7): AbandonedCart[] {
        return carts.filter(cart => cart.daysAgo <= days)
    }
}

/**
 * Exclusive Plan Abandoned Cart Interface
 */
export interface ExclusivePlanAbandonedCart {
    employerId: string
    email: string
    companyName: string
    employerName: string
    planType: string
    planName: string
    amountCents: number
    cycles: number
    totalValue: number
    offeredAt: string
    dismissedAt: string
    daysAgo: number
    status: 'dismissed' | 'pending'
}

/**
 * Get dismissed exclusive plan offers for abandoned cart tracking
 * This runs server-side and returns dismissed exclusive plan offers
 */
export async function getDismissedExclusivePlans(): Promise<ExclusivePlanAbandonedCart[]> {
    // This function is meant to be called from an API route, not directly from client
    // It imports db dynamically to avoid client-side bundle issues
    const { db } = await import('@/lib/db')

    try {
        const dismissedPlans = await db.$queryRaw<Array<{
            user_id: string;
            company_name: string;
            email: string | null;
            first_name: string | null;
            last_name: string | null;
            name: string | null;
            exclusive_plan_type: string;
            exclusive_plan_name: string;
            exclusive_plan_amount_cents: number;
            exclusive_plan_cycles: number;
            exclusive_plan_offered_at: Date;
            exclusive_plan_dismissed_at: Date;
        }>>`
            SELECT 
                e.user_id,
                e.company_name,
                up.email,
                up.first_name,
                up.last_name,
                up.name,
                e.exclusive_plan_type,
                e.exclusive_plan_name,
                e.exclusive_plan_amount_cents,
                e.exclusive_plan_cycles,
                e.exclusive_plan_offered_at,
                e.exclusive_plan_dismissed_at
            FROM employers e
            JOIN user_profiles up ON e.user_id = up.id
            WHERE e.exclusive_plan_dismissed_at IS NOT NULL
              AND e.exclusive_plan_activated_at IS NULL
            ORDER BY e.exclusive_plan_dismissed_at DESC
        `

        return dismissedPlans.map(plan => {
            const dismissedDate = new Date(plan.exclusive_plan_dismissed_at)
            const now = new Date()
            const diffMs = now.getTime() - dismissedDate.getTime()
            const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24))

            return {
                employerId: plan.user_id,
                email: plan.email || '',
                companyName: plan.company_name,
                employerName: plan.name ||
                    [plan.first_name, plan.last_name].filter(Boolean).join(' ') ||
                    plan.company_name,
                planType: plan.exclusive_plan_type,
                planName: plan.exclusive_plan_name,
                amountCents: plan.exclusive_plan_amount_cents,
                cycles: plan.exclusive_plan_cycles,
                totalValue: plan.exclusive_plan_amount_cents * plan.exclusive_plan_cycles,
                offeredAt: plan.exclusive_plan_offered_at.toISOString(),
                dismissedAt: plan.exclusive_plan_dismissed_at.toISOString(),
                daysAgo,
                status: 'dismissed' as const
            }
        })
    } catch (error) {
        console.error('Error fetching dismissed exclusive plans:', error)
        return []
    }
}

/**
 * Get pending (not dismissed, not activated) exclusive plan offers
 */
export async function getPendingExclusivePlans(): Promise<ExclusivePlanAbandonedCart[]> {
    const { db } = await import('@/lib/db')

    try {
        const pendingPlans = await db.$queryRaw<Array<{
            user_id: string;
            company_name: string;
            email: string | null;
            first_name: string | null;
            last_name: string | null;
            name: string | null;
            exclusive_plan_type: string;
            exclusive_plan_name: string;
            exclusive_plan_amount_cents: number;
            exclusive_plan_cycles: number;
            exclusive_plan_offered_at: Date;
        }>>`
            SELECT 
                e.user_id,
                e.company_name,
                up.email,
                up.first_name,
                up.last_name,
                up.name,
                e.exclusive_plan_type,
                e.exclusive_plan_name,
                e.exclusive_plan_amount_cents,
                e.exclusive_plan_cycles,
                e.exclusive_plan_offered_at
            FROM employers e
            JOIN user_profiles up ON e.user_id = up.id
            WHERE e.exclusive_plan_type IS NOT NULL
              AND e.exclusive_plan_dismissed_at IS NULL
              AND e.exclusive_plan_activated_at IS NULL
            ORDER BY e.exclusive_plan_offered_at DESC
        `

        return pendingPlans.map(plan => {
            const offeredDate = new Date(plan.exclusive_plan_offered_at)
            const now = new Date()
            const diffMs = now.getTime() - offeredDate.getTime()
            const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24))

            return {
                employerId: plan.user_id,
                email: plan.email || '',
                companyName: plan.company_name,
                employerName: plan.name ||
                    [plan.first_name, plan.last_name].filter(Boolean).join(' ') ||
                    plan.company_name,
                planType: plan.exclusive_plan_type,
                planName: plan.exclusive_plan_name,
                amountCents: plan.exclusive_plan_amount_cents,
                cycles: plan.exclusive_plan_cycles,
                totalValue: plan.exclusive_plan_amount_cents * plan.exclusive_plan_cycles,
                offeredAt: plan.exclusive_plan_offered_at.toISOString(),
                dismissedAt: '',
                daysAgo,
                status: 'pending' as const
            }
        })
    } catch (error) {
        console.error('Error fetching pending exclusive plans:', error)
        return []
    }
}
