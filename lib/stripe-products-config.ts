/**
 * Stripe Products Configuration
 * Centralized configuration for all Ampertalent products, plans, and pricing
 */

export interface StripeProduct {
  id: string;
  name: string;
  description: string;
  category: 'seeker' | 'employer' | 'service';
  priceId: string;
  monthlyPrice: number;
  currency: string;
  features: string[];
  recommended?: boolean;
}

/**
 * SEEKER PLANS
 * Four membership tiers for job seekers
 */
export const SEEKER_PLANS: StripeProduct[] = [
  {
    id: 'seeker-flex-trial',
    name: 'Flex Trial',
    description: '7-day free trial',
    category: 'seeker',
    priceId: process.env.STRIPE_FLEX_TRIAL_PRICE_ID || '',
    monthlyPrice: 0,
    currency: 'usd',
    features: [
      'Browse job postings',
      'Create profile',
      'Save up to 5 jobs',
      '7-day trial period'
    ]
  },
  {
    id: 'seeker-flex-gold',
    name: 'Flex Gold',
    description: 'Most popular - $63.99/month or $599/year',
    category: 'seeker',
    priceId: process.env.STRIPE_FLEX_GOLD_PRICE_ID || '',
    monthlyPrice: 63.99,
    currency: 'usd',
    recommended: true,
    features: [
      'Unlimited job applications',
      'Save unlimited jobs',
      'Upload 3 resumes',
      'Resume critique (1/month)',
      'Priority support'
    ]
  },
  {
    id: 'seeker-flex-vip',
    name: 'Flex VIP',
    description: 'Premium - $73.99/month',
    category: 'seeker',
    priceId: process.env.STRIPE_FLEX_VIP_PRICE_ID || '',
    monthlyPrice: 73.99,
    currency: 'usd',
    features: [
      'Everything in Gold',
      'Upload 10 resumes',
      'Resume critique (3/month)',
      'Profile visibility boost',
      'LinkedIn optimization'
    ]
  },
  {
    id: 'seeker-flex-annual',
    name: 'Flex Annual',
    description: 'Best value - $249.99/year',
    category: 'seeker',
    priceId: process.env.STRIPE_FLEX_ANNUAL_PRICE_ID || '',
    monthlyPrice: 249.99 / 12,
    currency: 'usd',
    features: [
      'Everything in VIP',
      '2 months free with annual',
      'Upload 15 resumes',
      'Resume critique (6/year)',
      'Exclusive job postings'
    ]
  }
];

/**
 * EMPLOYER PACKAGES
 * Four packages for employers to post jobs and access talent
 */
export const EMPLOYER_PACKAGES: StripeProduct[] = [
  {
    id: 'employer-standard',
    name: 'Standard',
    description: '$97 per job posting',
    category: 'employer',
    priceId: process.env.STRIPE_HIRE_STANDARD_PRICE_ID || '',
    monthlyPrice: 97,
    currency: 'usd',
    features: [
      '1 job posting (30 days)',
      'Up to 20 applications',
      'Basic applicant tools',
      'Email notifications'
    ]
  },
  {
    id: 'employer-featured',
    name: 'Featured',
    description: '$127 per posting - Get more visibility',
    category: 'employer',
    priceId: process.env.STRIPE_HIRE_FEATURED_PRICE_ID || '',
    monthlyPrice: 127,
    currency: 'usd',
    recommended: true,
    features: [
      'Featured job listing',
      '1 job posting (30 days)',
      'Up to 50 applications',
      'Advanced screening tools',
      'Video interview integration'
    ]
  },
  {
    id: 'employer-email-blast',
    name: 'Email Blast',
    description: '$249 - Targeted outreach',
    category: 'employer',
    priceId: process.env.STRIPE_EMAIL_BLAST_PRICE_ID || '',
    monthlyPrice: 249,
    currency: 'usd',
    features: [
      '1 job posting (30 days)',
      'Email to 500+ qualified candidates',
      'Advanced filters',
      'Detailed analytics',
      'Team collaboration'
    ]
  },
  {
    id: 'employer-gold-plus',
    name: 'Gold Plus',
    description: '$127/month - Unlimited posting',
    category: 'employer',
    priceId: process.env.STRIPE_HIRE_GOLD_PLUS_PRICE_ID || '',
    monthlyPrice: 127,
    currency: 'usd',
    features: [
      'Unlimited job postings',
      'Team member access',
      'Advanced analytics',
      'Concierge support',
      'Custom branding'
    ]
  }
];

/**
 * CONCIERGE SERVICES
 * Premium services for employers and seekers
 */
export const CONCIERGE_SERVICES: StripeProduct[] = [
  {
    id: 'service-concierge-lite',
    name: 'Concierge Lite',
    description: 'Basic matching service',
    category: 'service',
    priceId: process.env.STRIPE_CONCIERGE_LITE_PRICE_ID || '',
    monthlyPrice: 795,
    currency: 'usd',
    features: [
      '10 candidate matches per month',
      'Basic screening',
      'Email support',
      'Monthly reporting'
    ]
  },
  {
    id: 'service-concierge-level-1',
    name: 'Concierge Level 1',
    description: 'Standard matching service',
    category: 'service',
    priceId: process.env.STRIPE_CONCIERGE_LEVEL_1_PRICE_ID || '',
    monthlyPrice: 1495,
    currency: 'usd',
    features: [
      '25 candidate matches per month',
      'Phone screening included',
      'Priority support',
      'Weekly reporting'
    ]
  },
  {
    id: 'service-concierge-level-2',
    name: 'Concierge Level 2',
    description: 'Premium matching service',
    category: 'service',
    priceId: process.env.STRIPE_CONCIERGE_LEVEL_2_PRICE_ID || '',
    monthlyPrice: 2995,
    currency: 'usd',
    features: [
      '50 candidate matches per month',
      'Full screening process',
      'Interview coordination',
      'Daily reporting'
    ]
  },
  {
    id: 'service-concierge-level-3',
    name: 'Concierge Level 3',
    description: 'Enterprise matching service',
    category: 'service',
    priceId: process.env.STRIPE_CONCIERGE_LEVEL_3_PRICE_ID || '',
    monthlyPrice: 5695,
    currency: 'usd',
    features: [
      'Unlimited candidate matches',
      'End-to-end recruitment',
      'Dedicated account manager',
      'Real-time reporting',
      'Offer negotiation support'
    ]
  }
];

/**
 * Get all seeker plans
 */
export function getSeekerPlans(): StripeProduct[] {
  return SEEKER_PLANS;
}

/**
 * Get all employer packages
 */
export function getEmployerPackages(): StripeProduct[] {
  return EMPLOYER_PACKAGES;
}

/**
 * Get all concierge services
 */
export function getConciergeServices(): StripeProduct[] {
  return CONCIERGE_SERVICES;
}

/**
 * Get plan type from price ID
 */
export function getPlanTypeFromPriceId(
  priceId: string
): 'seeker' | 'employer' | 'service' | null {
  const allProducts = [...SEEKER_PLANS, ...EMPLOYER_PACKAGES, ...CONCIERGE_SERVICES];
  const product = allProducts.find((p) => p.priceId === priceId);
  return product?.category || null;
}

/**
 * Get product by price ID
 */
export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  const allProducts = [...SEEKER_PLANS, ...EMPLOYER_PACKAGES, ...CONCIERGE_SERVICES];
  return allProducts.find((p) => p.priceId === priceId);
}
