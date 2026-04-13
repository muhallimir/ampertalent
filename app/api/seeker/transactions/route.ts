import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { planPrice } from '@/lib/subscription-plans'

interface Transaction {
  id: string
  amount: number
  currency: string
  status: string
  description: string
  date: string
  paymentMethod: {
    type: string
    last4?: string
    brand?: string
  }
  metadata?: Record<string, any>
}

const normalizePlanLabel = (planId: string) =>
  planId
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

interface PlanDisplayConfig {
  label: string
  planLabel?: string
  informational?: boolean
}

const SUBSCRIPTION_PLAN_DISPLAY_MAP: Record<string, PlanDisplayConfig> = {
  trial_monthly: { label: 'Trial Monthly Subscription', planLabel: 'Trial Monthly Subscription', informational: true },
  gold_bimonthly: { label: 'Gold Bimonthly Subscription', planLabel: 'Gold Bimonthly Subscription' },
  vip_quarterly: { label: 'VIP Quarterly Subscription', planLabel: 'VIP Quarterly Subscription' },
  annual_platinum: { label: 'Annual Platinum Subscription', planLabel: 'Annual Platinum Subscription' },
  none: { label: 'No Plan', planLabel: 'No Plan', informational: true }
}

// Plan prices now come from the single source of truth in subscription-plans.ts
const SUBSCRIPTION_PLAN_PRICES: Record<string, number> = {
  trial_monthly: planPrice('trial_monthly'),
  gold_bimonthly: planPrice('gold_bimonthly'),
  vip_quarterly: planPrice('vip_quarterly'),
  annual_platinum: planPrice('annual_platinum'),
}

const EXTERNAL_PLAN_DISPLAY_MAP: Record<string, PlanDisplayConfig> = {
  trial: { label: 'Subscription payment for Trial', planLabel: 'Trial Subscription', informational: true },
  gold: { label: 'Subscription payment for Gold', planLabel: 'Gold Subscription' },
  vip: { label: 'Subscription payment for VIP', planLabel: 'VIP Subscription' },
  'vip-platinum': { label: 'Subscription payment for VIP Platinum', planLabel: 'VIP Platinum Subscription' },
  'annual-platinum': { label: 'Subscription payment for Annual Platinum', planLabel: 'Annual Platinum Subscription' },
  annual_platinum: { label: 'Subscription payment for Annual Platinum', planLabel: 'Annual Platinum Subscription' },
  rush_critique: { label: 'Payment for Rush Critique', planLabel: 'Rush Critique' },
  standard_critique: { label: 'Payment for Standard Critique', planLabel: 'Standard Critique' }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Seeker transactions API called with impersonated user', {
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    // Verify user is a job seeker or admin impersonating a seeker
    if (currentUser.profile.role !== 'seeker' && !(currentUser.isImpersonating && currentUser.profile.role === 'seeker')) {
      console.log('🚫 SEEKER TRANSACTIONS: Access denied', {
        userRole: currentUser.profile.role,
        isImpersonating: currentUser.isImpersonating,
        userId: currentUser.profile.id,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined
      })
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const userId = currentUser.profile.id

    // Fetch external payments for this seeker
    const externalPayments = await db.externalPayment.findMany({
      where: {
        userId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Fetch subscriptions for this seeker
    const subscriptions = await db.subscription.findMany({
      where: {
        seekerId: userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform external payments to transaction format
    const externalTransactions: Transaction[] = externalPayments.map((payment: any) => {
      const display =
        EXTERNAL_PLAN_DISPLAY_MAP[payment.planId] || {
          label: `Payment for ${normalizePlanLabel(payment.planId)}`,
          planLabel: normalizePlanLabel(payment.planId)
        }

      return {
        id: payment.id,
        amount: payment.amount,
        currency: 'USD',
        status: payment.status === 'completed' ? 'succeeded' : payment.status,
        description: display.label,
        date: payment.createdAt.toISOString(),
        paymentMethod: {
          type: 'card',
          last4: undefined,
          brand: undefined
        },
        metadata: {
          planId: payment.planId,
          displayLabel: display.label,
          ghlTransactionId: payment.ghlTransactionId,
          source: 'external_payment'
        }
      }
    })

    // Transform subscriptions to transaction format only for free/trial plans without external payments.
    // Paid plan subscriptions without an external_payment are NOT shown — no actual charge occurred,
    // and displaying them with a price + "succeeded" status is misleading.
    const subscriptionTransactions: Transaction[] = subscriptions
      .filter((sub: any) => {
        // Must be a free/informational plan — paid plans require an external_payment to appear
        const planConfig = SUBSCRIPTION_PLAN_DISPLAY_MAP[sub.plan]
        if (!planConfig?.informational) {
          return false;
        }
        // Check if subscription has a linked external_payment_id (PayPal flow)
        if (sub.externalPaymentId) {
          return false; // Has linked external payment, don't show as separate transaction
        }
        // Check by ghlTransactionId (includes null === null for AuthNet backward compatibility)
        // This handles both:
        // - AuthNet: both sub and ep have null ghlTransactionId (null === null = true, filtered)
        // - GHL: both sub and ep have matching transaction IDs (filtered)
        if (externalPayments.some((ep: any) => ep.ghlTransactionId === sub.ghlTransactionId)) {
          return false;
        }
        return true;
      })
      .map((sub: any) => ({
        id: sub.id,
        amount: 0,
        currency: 'USD',
        status: 'succeeded',
        description: SUBSCRIPTION_PLAN_DISPLAY_MAP[sub.plan]?.label || `Subscription: ${normalizePlanLabel(sub.plan)}`,
        date: (sub.updatedAt || sub.createdAt).toISOString(),
        paymentMethod: {
          type: 'card',
          last4: undefined,
          brand: undefined
        },
        metadata: {
          plan: sub.plan,
          ghlTransactionId: sub.ghlTransactionId,
          source: 'subscription'
        }
      }))

    // Combine and sort all transactions
    const allTransactions = [...externalTransactions, ...subscriptionTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      success: true,
      transactions: allTransactions,
      pagination: {
        total: allTransactions.length,
        limit: 50,
        offset: 0,
        hasMore: false
      }
    })

  } catch (error) {
    console.error('Error fetching seeker transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transaction history' },
      { status: 500 }
    )
  }
}
