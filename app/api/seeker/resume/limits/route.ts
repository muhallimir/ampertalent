import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { syncResumeCredits } from '@/lib/resume-credits'
import { hasActiveSubscription } from '@/lib/subscription-check'
import { planResumeLimit, planDisplayName } from '@/lib/subscription-plans'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 API: Checking seeker resume limits')

    const user = await getCurrentUser(request)
    if (!user || user.profile?.role !== 'seeker') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get job seeker details with subscription info
    const jobSeeker = await db.jobSeeker.findUnique({
      where: {
        userId: user.profile.id
      },
      select: {
        membershipPlan: true,
        membershipExpiresAt: true,
        resumeCredits: true,
        subscriptions: {
          where: {
            status: 'active'
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    })

    if (!jobSeeker) {
      return NextResponse.json({ error: 'Job seeker profile not found' }, { status: 404 })
    }

    // Sync resume credits before returning limits
    await syncResumeCredits(user.profile.id)

    // Re-fetch jobSeeker with updated credits
    const updatedJobSeeker = await db.jobSeeker.findUnique({
      where: {
        userId: user.profile.id
      },
      select: {
        membershipPlan: true,
        membershipExpiresAt: true,
        resumeCredits: true,
        subscriptions: {
          where: {
            status: 'active'
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    })

    if (!updatedJobSeeker) {
      return NextResponse.json({ error: 'Job seeker profile not found' }, { status: 404 })
    }

    // Check subscription status using centralized function
    const hasSubscription = await hasActiveSubscription(user.profile.id)

    // Get current remaining credits (resumeCredits = remaining, not used)
    const remainingCredits = updatedJobSeeker.resumeCredits || 0

    // Determine resume limit based on membership plan
    let resumeLimit = 0
    let planName = 'No Plan'
    let isExpired = !hasSubscription

    if (hasSubscription && updatedJobSeeker.membershipPlan && updatedJobSeeker.membershipPlan !== 'none') {
      resumeLimit = planResumeLimit(updatedJobSeeker.membershipPlan)
      planName = planDisplayName(updatedJobSeeker.membershipPlan)
    }

    // If no active subscription or expired, default to free limits
    if (resumeLimit === 0 || isExpired) {
      resumeLimit = 0 // Free users get 0 resumes
      planName = isExpired ? 'Expired Plan' : 'No Active Plan'
    }

    const canUpload = remainingCredits > 0
    const usedCredits = Math.max(0, resumeLimit - remainingCredits)

    return NextResponse.json({
      currentResumeCount: usedCredits,
      resumeLimit: resumeLimit === 999 ? 'unlimited' : resumeLimit,
      canUpload,
      remainingUploads: resumeLimit === 999 ? 'unlimited' : remainingCredits,
      planName,
      isExpired,
      membershipExpiresAt: updatedJobSeeker.membershipExpiresAt?.toISOString(),
      success: true
    })

  } catch (error) {
    console.error('❌ Error checking resume limits:', error)
    return NextResponse.json(
      { error: 'Failed to check resume limits' },
      { status: 500 }
    )
  }
}