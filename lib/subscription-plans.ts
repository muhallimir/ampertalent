import {
  FileText,
  Crown,
  Diamond,
  Trophy
} from 'lucide-react'

export interface SeekerSubscriptionPlan {
  id: string           // "public" plan ID used in URLs & API calls  (e.g. 'vip-platinum')
  membershipPlan: string // Prisma enum value stored in DB            (e.g. 'vip_quarterly')
  name: string
  price: number
  billing: string      // human-readable billing period              (e.g. '3 months')
  billingMonths: number // number of calendar months per period       (e.g. 3)
  duration: number     // days in period                             (e.g. 90)
  resumeLimit: number  // 999 = unlimited; stored directly as a number now
  resumeCredits: number // credits granted on activation (same as resumeLimit)
  trialDays?: number
  description: string
  features: string[]
  support: string[]
  popular?: boolean
  current?: boolean
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  borderColor: string
  includes?: string[]
}

// Predefined seeker subscription plans
export const SEEKER_SUBSCRIPTION_PLANS: SeekerSubscriptionPlan[] = [
  {
    id: 'trial',
    membershipPlan: 'trial_monthly',
    name: 'Flex Trial',
    price: 34.99,
    billing: 'month',
    billingMonths: 1,
    duration: 33,
    resumeLimit: 1,
    resumeCredits: 1,
    trialDays: 3,
    description: 'Free 3-day trial to post 1 resume for 33 days. Charges $34.99/month starting day 4.',
    features: [
      'Apply for unlimited jobs',
      'Cancel anytime',
      '3-day free trial'
    ],
    support: ['Email Support: Monday – Friday'],
    icon: FileText,
    color: 'text-brand-teal',
    bgColor: 'bg-brand-teal-light',
    borderColor: 'border-brand-teal'
  },
  {
    id: 'gold',
    membershipPlan: 'gold_bimonthly',
    name: 'Flex Gold',
    price: 49.99,
    billing: '2 months',
    billingMonths: 2,
    duration: 60,
    resumeLimit: 3,
    resumeCredits: 3,
    description: '$49.99 every 2 months to post 3 resumes for 60 days',
    features: [
      'Apply for Unlimited Jobs',
      'Cancel Anytime'
    ],
    support: ['Email & Text Support: Monday – Friday'],
    popular: true,
    icon: Crown,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-500'
  },
  {
    id: 'vip-platinum',
    membershipPlan: 'vip_quarterly',
    name: 'Flex VIP',
    price: 79.99,
    billing: '3 months',
    billingMonths: 3,
    duration: 90,
    resumeLimit: 999,
    resumeCredits: 999,
    description: '$79.99 every 3 months to post unlimited resumes for 90 days',
    features: [
      'Apply for Unlimited Jobs',
      'Cancel Anytime'
    ],
    support: ['Email, Text & Phone Support: Monday – Friday'],
    icon: Diamond,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-500',
    includes: ['t-shirt']
  },
  {
    id: 'annual-platinum',
    membershipPlan: 'annual_platinum',
    name: 'Flex Annual',
    price: 299.00,
    billing: 'year',
    billingMonths: 12,
    duration: 365,
    resumeLimit: 999,
    resumeCredits: 999,
    description: '$299.00 / year to post unlimited resumes for 365 days',
    features: [
      'Apply for Unlimited Jobs',
      'Cancel Anytime',
      'Best Value - Save $120/year!'
    ],
    support: ['Email, Text & Phone Support: Monday – Friday'],
    icon: Trophy,
    color: 'text-brand-coral',
    bgColor: 'bg-brand-coral-light',
    borderColor: 'border-brand-coral',
    includes: ['t-shirt']
  }
]

// ─── Lookup helpers ───────────────────────────────────────────────────────────

/** Find a plan by its public ID ('trial', 'gold', 'vip-platinum', 'annual-platinum') */
export function getPlanById(planId: string): SeekerSubscriptionPlan | undefined {
  return SEEKER_SUBSCRIPTION_PLANS.find(p => p.id === planId)
}

/** Find a plan by its Prisma enum/membershipPlan value ('trial_monthly', etc.) */
export function getPlanByMembershipPlan(membershipPlan: string): SeekerSubscriptionPlan | undefined {
  return SEEKER_SUBSCRIPTION_PLANS.find(p => p.membershipPlan === membershipPlan)
}

// ─── Conversion helpers ───────────────────────────────────────────────────────

/**
 * Map a public plan ID → Prisma enum value.
 * e.g. 'vip-platinum' → 'vip_quarterly'
 *
 * Falls back to keyword matching if exact ID is not found:
 *   'annual'          → 'annual_platinum'
 *   'vip'|'platinum'  → 'vip_quarterly'
 *   'gold'            → 'gold_bimonthly'
 *   'trial'           → 'trial_monthly'
 */
export function planIdToMembershipPlan(planId: string): string {
  const exact = getPlanById(planId)
  if (exact) return exact.membershipPlan

  const lower = planId.toLowerCase()
  if (lower.includes('annual')) return 'annual_platinum'
  if (lower.includes('vip') || lower.includes('platinum')) return 'vip_quarterly'
  if (lower.includes('gold')) return 'gold_bimonthly'
  if (lower.includes('trial')) return 'trial_monthly'

  console.warn(`[planIdToMembershipPlan] No match found for planId: "${planId}" — returning 'none'`)
  return 'none'
}

/**
 * Map a Prisma enum value → public plan ID.
 * e.g. 'vip_quarterly' → 'vip-platinum'
 */
export function membershipPlanToPlanId(membershipPlan: string): string {
  return getPlanByMembershipPlan(membershipPlan)?.id ?? membershipPlan
}

// ─── Period / duration helpers ────────────────────────────────────────────────────────

/**
 * Calculate the subscription period end date from a start date and plan.
 * Works with both public plan IDs and Prisma enum values.
 */
export function calcPeriodEnd(planIdOrEnum: string, from: Date = new Date()): Date {
  const plan = getPlanById(planIdOrEnum) ?? getPlanByMembershipPlan(planIdOrEnum)
  const end = new Date(from)
  if (!plan) {
    end.setMonth(end.getMonth() + 1) // safe fallback
    return end
  }
  if (plan.billingMonths === 12) {
    end.setFullYear(end.getFullYear() + 1)
  } else {
    end.setMonth(end.getMonth() + plan.billingMonths)
  }
  return end
}

/**
 * Return the billing-frequency string expected by the subscription record.
 * e.g. 'trial' → '1-month', 'vip-platinum' → '3-months'
 */
export function planBillingFrequency(planIdOrEnum: string): string {
  const plan = getPlanById(planIdOrEnum) ?? getPlanByMembershipPlan(planIdOrEnum)
  if (!plan) return '1-month'
  return plan.billingMonths === 1 ? '1-month' : `${plan.billingMonths}-months`
}

// ─── Resume / credits helpers ─────────────────────────────────────────────────

/**
 * Return the numeric resume limit for a plan (999 = unlimited).
 * Works with both public plan IDs and Prisma enum values.
 */
export function planResumeLimit(planIdOrEnum: string): number {
  const plan = getPlanById(planIdOrEnum) ?? getPlanByMembershipPlan(planIdOrEnum)
  return plan?.resumeLimit ?? 0
}

/**
 * Return the resume credits granted on activation for a plan.
 * Works with both public plan IDs and Prisma enum values.
 */
export function planResumeCredits(planIdOrEnum: string): number {
  const plan = getPlanById(planIdOrEnum) ?? getPlanByMembershipPlan(planIdOrEnum)
  return plan?.resumeCredits ?? 0
}

// ─── Display helpers ──────────────────────────────────────────────────────────

/**
 * Human-readable plan name from either a public ID or Prisma enum value.
 * e.g. 'vip_quarterly' → 'Flex VIP Platinum Professional'
 */
export function planDisplayName(planIdOrEnum: string): string {
  const plan = getPlanById(planIdOrEnum) ?? getPlanByMembershipPlan(planIdOrEnum)
  return plan?.name ?? 'Unknown Plan'
}

/**
 * Plan price from either a public ID or Prisma enum value.
 */
export function planPrice(planIdOrEnum: string): number {
  const plan = getPlanById(planIdOrEnum) ?? getPlanByMembershipPlan(planIdOrEnum)
  return plan?.price ?? 0
}