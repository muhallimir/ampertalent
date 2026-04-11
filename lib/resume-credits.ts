import { db } from '@/lib/db'

export async function syncResumeCredits(userId: string) {
  const jobSeeker = await db.jobSeeker.findUnique({
    where: { userId },
    select: {
      membershipPlan: true,
      membershipExpiresAt: true,
      resumeCredits: true,
      resumes: {
        select: { id: true }
      }
    }
  })

  if (!jobSeeker) return null

  // Calculate expected credits based on plan
  let expectedCredits = 0
  if (jobSeeker.membershipPlan && jobSeeker.membershipPlan !== 'none') {
    if (!jobSeeker.membershipExpiresAt || new Date() <= jobSeeker.membershipExpiresAt) {
      const planMap: Record<string, number> = {
        'trial_monthly': 1,
        'gold_bimonthly': 3,
        'vip_quarterly': 999,
        'annual_platinum': 999
      }
      expectedCredits = planMap[jobSeeker.membershipPlan] || 0
    }
  }

  // Calculate remaining credits (plan limit - used resumes)
  const usedResumes = jobSeeker.resumes.length
  const remainingCredits = Math.max(0, expectedCredits - usedResumes)

  // Update if different
  if (jobSeeker.resumeCredits !== remainingCredits) {
    await db.jobSeeker.update({
      where: { userId },
      data: { resumeCredits: remainingCredits }
    })
    
    console.log(`🔄 Synced resume credits for user ${userId}:`, {
      oldCredits: jobSeeker.resumeCredits,
      newCredits: remainingCredits,
      plan: jobSeeker.membershipPlan,
      usedResumes,
      expectedCredits
    })
  }

  return remainingCredits
}