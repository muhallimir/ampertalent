import { db } from '@/lib/db'

export type AccessDeniedReason = 'cancelled' | 'suspended' | 'no_plan'

export interface SeekerAccessResult {
  allowed: boolean
  reason?: AccessDeniedReason
}

/**
 * Check whether a seeker's account is in good standing for feature access.
 * Returns `{ allowed: true }` if active, or `{ allowed: false, reason }` otherwise.
 */
export async function isSeekerAccessAllowed(userId: string): Promise<SeekerAccessResult> {
  const seeker = await db.jobSeeker.findUnique({
    where: { userId },
    select: {
      cancelledSeeker: true,
      isSuspended: true,
      membershipPlan: true,
    }
  })

  if (!seeker) return { allowed: false, reason: 'no_plan' }
  if (seeker.cancelledSeeker) return { allowed: false, reason: 'cancelled' }
  if (seeker.isSuspended) return { allowed: false, reason: 'suspended' }
  if (seeker.membershipPlan === 'none') return { allowed: false, reason: 'no_plan' }

  return { allowed: true }
}
