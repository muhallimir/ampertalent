/**
 * Demo Role Backfill — defence-in-depth helper for payment routes
 *
 * The demo flow defers JobSeeker / Employer row creation to the
 * onboarding-completion step so the visitor walks the full onboarding form.
 * That means a demo account that reaches the Stripe / PayPal / post-a-job
 * flows before completing onboarding is missing the role-specific row and
 * trips the `isSeeker` / `isEmployer` guards in the payment routes
 * (which return "Invalid user type" / "Employer not found").
 *
 * `ensureDemoRoleRows` is a single helper that:
 *   1. Reads the user's profile
 *   2. If the profile is NOT a demo account, returns without changes
 *   3. If the role is `seeker` and no JobSeeker row exists, creates one
 *      (mirror of what onboarding/complete does)
 *   4. If the role is `employer` and no Employer row exists, creates one
 *      (mirror of what onboarding/complete does)
 *
 * Safe to call from any payment route — it's idempotent (no-op when the
 * row already exists). It only acts on profiles whose `name` matches the
 * canonical `demo-{role}-{ts}` pattern, so a real (non-demo) account
 * is never auto-provisioned by this helper.
 */
import { db } from './db'
import { DEMO_NAME_REGEX } from './demo-credentials'

export interface EnsureDemoRoleRowsResult {
  isDemo: boolean
  isSeeker: boolean
  isEmployer: boolean
  role: string | null
  /** What (if anything) the helper had to create to bring the demo profile up to date */
  created: 'seeker' | 'employer' | null
}

export async function ensureDemoRoleRows(
  profileId: string
): Promise<EnsureDemoRoleRowsResult> {
  const profile = await db.userProfile.findUnique({
    where: { id: profileId },
    include: { employer: true, jobSeeker: true },
  })

  if (!profile) {
    return { isDemo: false, isSeeker: false, isEmployer: false, role: null, created: null }
  }

  // Real (non-demo) account: don't auto-provision.
  if (!profile.name || !DEMO_NAME_REGEX.test(profile.name)) {
    return {
      isDemo: false,
      isSeeker: !!profile.jobSeeker,
      isEmployer: !!profile.employer,
      role: profile.role,
      created: null,
    }
  }

  if (profile.role === 'seeker') {
    if (!profile.jobSeeker) {
      await db.jobSeeker.create({
        data: {
          userId: profile.id,
          headline: profile.firstName ? `${profile.firstName} (demo)` : 'Demo job seeker',
          availability: 'Remote (US)',
          skills: ['JavaScript', 'TypeScript', 'React', 'Next.js', 'PostgreSQL'],
          membershipPlan: 'none',
        },
      })
      return {
        isDemo: true,
        isSeeker: true,
        isEmployer: false,
        role: 'seeker',
        created: 'seeker',
      }
    }
    return {
      isDemo: true,
      isSeeker: true,
      isEmployer: false,
      role: 'seeker',
      created: null,
    }
  }

  if (profile.role === 'employer') {
    if (!profile.employer) {
      await db.employer.create({
        data: {
          userId: profile.id,
          companyName: profile.firstName ? `${profile.firstName} Co.` : 'Demo Co.',
        },
      })
      return {
        isDemo: true,
        isSeeker: false,
        isEmployer: true,
        role: 'employer',
        created: 'employer',
      }
    }
    return {
      isDemo: true,
      isSeeker: false,
      isEmployer: true,
      role: 'employer',
      created: null,
    }
  }

  return {
    isDemo: true,
    isSeeker: false,
    isEmployer: false,
    role: profile.role,
    created: null,
  }
}
