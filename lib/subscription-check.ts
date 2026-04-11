import { db } from './db'

/**
 * Check if a seeker has an active subscription.
 *
 * Primary check: looks for a subscription with status = 'active' in the subscriptions table.
 * Fallback: checks membershipExpiresAt on the job_seekers table (denormalized field).
 *
 * This dual approach handles cases where the denormalized fields on job_seekers
 * are out of sync with the subscriptions table (e.g. webhook didn't update dates).
 */
export async function hasActiveSubscription(seekerId: string): Promise<boolean> {
  const activeSubscription = await db.subscription.findFirst({
    where: {
      seekerId,
      status: 'active',
    },
    select: { id: true },
  })

  if (activeSubscription) {
    return true
  }

  // Fallback: check denormalized fields on job_seekers
  const seeker = await db.jobSeeker.findUnique({
    where: { userId: seekerId },
    select: {
      membershipPlan: true,
      membershipExpiresAt: true,
    },
  })

  if (!seeker) return false

  return (
    seeker.membershipPlan !== 'none' &&
    !!seeker.membershipExpiresAt &&
    new Date(seeker.membershipExpiresAt) > new Date()
  )
}
