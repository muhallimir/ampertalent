/**
 * Client-safe GoHighLevel URL mapping
 * This file can be imported on the client-side without causing environment variable errors
 */

// Get GoHighLevel full page URL from Next.js public environment variables
export function getGoHighLevelPageUrl(planId: string): string | null {
  console.log('🔍 CLIENT-GHL-PAGE-URL: Looking up URL for planId:', planId)

  const envMapping: Record<string, string> = {
    // Current seeker subscription plan IDs (matching subscription-plans.ts)
    'trial': process.env.NEXT_PUBLIC_GOHIGHLEVEL_SEEKER_TRIAL_MONTHLY || '',
    'gold': process.env.NEXT_PUBLIC_GOHIGHLEVEL_SEEKER_GOLD_BIMONTHLY || '',
    'vip-platinum': process.env.NEXT_PUBLIC_GOHIGHLEVEL_SEEKER_VIP_QUARTERLY || '',
    'annual-platinum': process.env.NEXT_PUBLIC_GOHIGHLEVEL_SEEKER_ANNUAL_PLATINUM || '',

    // Employer job posting packages (matching PackageCard.tsx)
    'standard': process.env.NEXT_PUBLIC_GOHIGHLEVEL_EMPLOYER_STANDARD || '',
    'featured': process.env.NEXT_PUBLIC_GOHIGHLEVEL_EMPLOYER_FEATURED || '',
    'email_blast': process.env.NEXT_PUBLIC_GOHIGHLEVEL_EMPLOYER_SOLO || '',
    'gold_plus': process.env.NEXT_PUBLIC_GOHIGHLEVEL_EMPLOYER_GOLD_PLUS || '',

    // Concierge packages (matching PackageCard.tsx) - Updated Jan 2026
    'concierge_lite': process.env.NEXT_PUBLIC_GOHIGHLEVEL_EMPLOYER_SM_CONCIERGE_LITE || '',
    'concierge_level_1': process.env.NEXT_PUBLIC_GOHIGHLEVEL_EMPLOYER_SM_CONCIERGE_LVL_I || '',
    'concierge_level_2': process.env.NEXT_PUBLIC_GOHIGHLEVEL_EMPLOYER_SM_CONCIERGE_LVL_2 || '',
    'concierge_level_3': process.env.NEXT_PUBLIC_GOHIGHLEVEL_EMPLOYER_SM_CONCIERGE_LVL_3 || '',

    // Legacy employer packages (for backward compatibility)
    'employer_basic': process.env.NEXT_PUBLIC_GOHIGHLEVEL_EMPLOYER_STANDARD || '',
    'employer_standard': process.env.NEXT_PUBLIC_GOHIGHLEVEL_EMPLOYER_FEATURED || '',
    'employer_premium': process.env.NEXT_PUBLIC_GOHIGHLEVEL_EMPLOYER_SM_CONCIERGE_LITE || '',

    // Alternative naming support (for flexibility)
    'trial_monthly': process.env.NEXT_PUBLIC_GOHIGHLEVEL_SEEKER_TRIAL_MONTHLY || '',
    'gold_bimonthly': process.env.NEXT_PUBLIC_GOHIGHLEVEL_SEEKER_GOLD_BIMONTHLY || '',
    'vip_quarterly': process.env.NEXT_PUBLIC_GOHIGHLEVEL_SEEKER_VIP_QUARTERLY || '',
    'annual_platinum': process.env.NEXT_PUBLIC_GOHIGHLEVEL_SEEKER_ANNUAL_PLATINUM || ''
  }

  console.log('🔍 CLIENT-GHL-PAGE-URL: Available environment mappings:', {
    trial: process.env.NEXT_PUBLIC_GOHIGHLEVEL_SEEKER_TRIAL_MONTHLY,
    gold: process.env.NEXT_PUBLIC_GOHIGHLEVEL_SEEKER_GOLD_BIMONTHLY,
    'vip-platinum': process.env.NEXT_PUBLIC_GOHIGHLEVEL_SEEKER_VIP_QUARTERLY,
    'annual-platinum': process.env.NEXT_PUBLIC_GOHIGHLEVEL_SEEKER_ANNUAL_PLATINUM,
    standard: process.env.NEXT_PUBLIC_GOHIGHLEVEL_EMPLOYER_STANDARD,
    featured: process.env.NEXT_PUBLIC_GOHIGHLEVEL_EMPLOYER_FEATURED,
    email_blast: process.env.NEXT_PUBLIC_GOHIGHLEVEL_EMPLOYER_SOLO,
    gold_plus: process.env.NEXT_PUBLIC_GOHIGHLEVEL_EMPLOYER_GOLD_PLUS
  })

  const url = envMapping[planId]
  console.log('🔍 CLIENT-GHL-PAGE-URL: Found URL for planId', planId, ':', url)

  const isValidUrl = url && url !== 'your-trial-monthly-product-id' && !url.startsWith('your-')
  console.log('🔍 CLIENT-GHL-PAGE-URL: URL is valid:', isValidUrl)

  return isValidUrl ? url : null
}