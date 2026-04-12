import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { SEEKER_SUBSCRIPTION_PLANS } from '@/lib/subscription-plans'

export async function GET(request: NextRequest) {
  try {
    // 1. AUTHENTICATION: Verify admin access
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super admin
    if (currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    // Get current date for calculations
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Get active trials (job seekers currently in trial period)
    // Count all seekers with isOnTrial = true AND trialEndsAt is set
    // The trialEndsAt field is required to identify which seekers had trials
    // Some trials may have already expired but not yet processed by cron
    const activeTrials = await db.jobSeeker.count({
      where: {
        isOnTrial: true,
        trialEndsAt: {
          not: null
        }
      }
    })

    // Get trial conversions (retroactive - all time, not just 30 days)
    // Uses membershipPlan as source of truth instead of relying on isOnTrial flag
    // which may not always be updated when trial converts
    // ALSO includes seekers who had trial_monthly subscriptions but no trial_ends_at (orphaned trials)
    const trialsConvertedToPaid = await db.jobSeeker.count({
      where: {
        OR: [
          // Standard case: has trial_ends_at and upgraded to paid plan
          {
            trialEndsAt: {
              not: null
            },
            membershipPlan: {
              in: ['gold_bimonthly', 'vip_quarterly', 'annual_platinum']
            }
          },
          // Edge case: orphaned trial (no trial_ends_at but had trial subscription)
          {
            membershipPlan: {
              in: ['gold_bimonthly', 'vip_quarterly', 'annual_platinum']
            },
            trialEndsAt: null,
            subscriptions: {
              some: {
                plan: 'trial_monthly'
              }
            }
          }
        ]
      }
    })

    // Get trials canceled during trial period (retroactive - all time)
    // A canceled trial is one that ended but user stayed on 'none' membership plan
    // ALSO includes seekers with orphaned trial_monthly subscriptions who canceled
    const trialsCanceledDuringTrial = await db.jobSeeker.count({
      where: {
        OR: [
          // Standard case: has trial_ends_at and no plan (mutually exclusive with orphaned case)
          {
            trialEndsAt: {
              not: null
            },
            membershipPlan: 'none',
            // Exclude orphaned trials to prevent double-counting
            subscriptions: {
              none: {
                plan: 'trial_monthly'
              }
            }
          },
          // Edge case: orphaned trial that was canceled (no trial_ends_at but had trial subscription, now no plan)
          {
            membershipPlan: 'none',
            trialEndsAt: null,
            subscriptions: {
              some: {
                plan: 'trial_monthly'
              }
            }
          }
        ]
      }
    })

    // Calculate conversion rate
    const totalTrialsCompleted = trialsConvertedToPaid + trialsCanceledDuringTrial
    const trialConversionRate = totalTrialsCompleted > 0
      ? (trialsConvertedToPaid / totalTrialsCompleted) * 100
      : 0

    // Calculate average trial duration for all trials (active and completed)
    // Includes both standard trials (with trial_ends_at) and orphaned trials (with trial_monthly subscription)
    // Ensure queries are mutually exclusive to avoid double-counting
    const allStandardTrials = await db.jobSeeker.findMany({
      where: {
        trialEndsAt: {
          not: null,
          gte: thirtyDaysAgo
        },
        // Exclude orphaned trials to prevent double-counting
        subscriptions: {
          none: {
            plan: 'trial_monthly'
          }
        }
      },
      select: {
        createdAt: true,
        trialEndsAt: true,
        isOnTrial: true
      }
    })

    const allOrphanedTrials = await db.jobSeeker.findMany({
      where: {
        trialEndsAt: null,
        subscriptions: {
          some: {
            plan: 'trial_monthly'
          }
        },
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        createdAt: true,
        trialEndsAt: true,
        isOnTrial: true
      }
    })

    const allTrials = [...allStandardTrials, ...allOrphanedTrials]

    // Get trial plan from configuration once (used for both duration and pricing)
    const trialPlan = SEEKER_SUBSCRIPTION_PLANS.find(p => p.id === 'trial')
    const trialDays = trialPlan?.trialDays || 3
    const baseSubscriptionPrice = trialPlan?.price || 34.99

    let averageTrialDuration = 0
    if (allTrials.length > 0) {
      const totalDuration = allTrials.reduce((sum: number, trial: any) => {
        if (trial.trialEndsAt) {
          const durationMs = trial.trialEndsAt.getTime() - trial.createdAt.getTime()
          const durationDays = durationMs / (1000 * 60 * 60 * 24)
          return sum + Math.min(durationDays, trialDays) // Cap at configured trial days
        } else {
          // For orphaned trials without trial_ends_at, estimate as full trial duration
          // (This is conservative - they likely completed their trial)
          return sum + trialDays
        }
      }, 0)
      averageTrialDuration = totalDuration / allTrials.length
    }

    // Calculate revenue potential from active trials
    // Potential calculation: activeTrials × subscription_price
    // This represents the actual revenue available if all active trials convert
    const trialRevenuePotential = activeTrials > 0
      ? activeTrials * baseSubscriptionPrice
      : 0

    const trialMetrics = {
      activeTrials,
      trialConversionRate,
      trialsCanceledDuringTrial,
      trialsConvertedToPaid,
      averageTrialDuration,
      trialRevenuePotential,
      // Additional context for forecasting
      baseSubscriptionPrice,
      realizationFactors: {
        description: 'Revenue potential is calculated as: activeTrials × price',
        conversionRateApplied: trialConversionRate,
        pessimisticScenario: activeTrials * baseSubscriptionPrice * 0.3, // 30% conversion fallback
        optimisticScenario: activeTrials * baseSubscriptionPrice * 0.7   // 70% conversion upside
      }
    }

    return NextResponse.json({ trialMetrics })

  } catch (error) {
    console.error('Error fetching trial metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trial metrics' },
      { status: 500 }
    )
  }
}