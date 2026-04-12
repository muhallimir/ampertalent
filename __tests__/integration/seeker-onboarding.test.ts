import { db } from '@/lib/db'

describe('Seeker Onboarding - Database Integration', () => {
  const createdUserIds: string[] = []
  const createdPendingSignupIds: string[] = []

  afterEach(async () => {
    for (const userId of createdUserIds) {
      await db.jobSeeker.delete({
        where: { userId },
      }).catch(() => {})
      
      await db.userProfile.delete({
        where: { id: userId },
      }).catch(() => {})
    }

    for (const psId of createdPendingSignupIds) {
      await db.pendingSignup.delete({
        where: { id: psId },
      }).catch(() => {})
    }

    createdUserIds.length = 0
    createdPendingSignupIds.length = 0
  })

  describe('Step 1: Role Selection', () => {
    it('should create UserProfile with seeker role', async () => {
      const clerkUserId = `test-clerk-${Date.now()}`
      const email = `seeker-role-${Date.now()}@test.com`

      const userProfile = await db.userProfile.create({
        data: {
          clerkUserId,
          email,
          name: 'Test Seeker',
          firstName: 'Test',
          lastName: 'Seeker',
          role: 'seeker',
          timezone: 'America/Chicago',
        },
      })

      createdUserIds.push(userProfile.id)

      expect(userProfile.role).toBe('seeker')
      expect(userProfile.clerkUserId).toBe(clerkUserId)

      const retrieved = await db.userProfile.findUnique({
        where: { clerkUserId },
      })
      expect(retrieved).toBeDefined()
      expect(retrieved?.role).toBe('seeker')
    })
  })

  describe('Step 2: Basic Information', () => {
    it('should save first name, last name, and email', async () => {
      const clerkUserId = `test-clerk-${Date.now()}`
      const email = `seeker-info-${Date.now()}@test.com`
      const firstName = 'Jane'
      const lastName = 'Developer'

      const userProfile = await db.userProfile.create({
        data: {
          clerkUserId,
          email,
          name: `${firstName} ${lastName}`,
          firstName,
          lastName,
          role: 'seeker',
          timezone: 'America/Chicago',
        },
      })

      createdUserIds.push(userProfile.id)

      expect(userProfile.firstName).toBe('Jane')
      expect(userProfile.lastName).toBe('Developer')
      expect(userProfile.email).toBe(email)
    })
  })

  describe('Step 3: Additional Details', () => {
    it('should create JobSeeker profile with skills', async () => {
      const clerkUserId = `test-clerk-${Date.now()}`
      const email = `seeker-details-${Date.now()}@test.com`

      const userProfile = await db.userProfile.create({
        data: {
          clerkUserId,
          email,
          name: 'Bob Engineer',
          firstName: 'Bob',
          lastName: 'Engineer',
          role: 'seeker',
          timezone: 'America/Chicago',
        },
      })

      createdUserIds.push(userProfile.id)

      const skills = ['React', 'TypeScript', 'Node.js']
      const jobSeeker = await db.jobSeeker.create({
        data: {
          userId: userProfile.id,
          headline: '5 years of experience',
          skills,
          availability: 'Remote',
        },
      })

      expect(jobSeeker.skills).toEqual(skills)
      expect(jobSeeker.headline).toBe('5 years of experience')

      const retrieved = await db.jobSeeker.findUnique({
        where: { userId: userProfile.id },
      })
      expect(retrieved?.skills).toEqual(skills)
    })
  })

  describe('Step 4: Professional Summary', () => {
    it('should save professional summary', async () => {
      const clerkUserId = `test-clerk-${Date.now()}`
      const email = `seeker-summary-${Date.now()}@test.com`

      const userProfile = await db.userProfile.create({
        data: {
          clerkUserId,
          email,
          name: 'Alice Designer',
          firstName: 'Alice',
          lastName: 'Designer',
          role: 'seeker',
          timezone: 'America/Chicago',
        },
      })

      createdUserIds.push(userProfile.id)

      const summary = 'Passionate about creating beautiful user experiences. 5+ years in UX/UI design.'
      const jobSeeker = await db.jobSeeker.create({
        data: {
          userId: userProfile.id,
          professionalSummary: summary,
          availability: 'Remote',
        },
      })

      expect(jobSeeker.professionalSummary).toBe(summary)

      const retrieved = await db.jobSeeker.findUnique({
        where: { userId: userProfile.id },
      })
      expect(retrieved?.professionalSummary).toBe(summary)
    })
  })

  describe('Step 5: Membership/Package Selection', () => {
    it('should update JobSeeker with membership plan', async () => {
      const clerkUserId = `test-clerk-${Date.now()}`
      const email = `seeker-plan-${Date.now()}@test.com`

      const userProfile = await db.userProfile.create({
        data: {
          clerkUserId,
          email,
          name: 'Charlie Marketer',
          firstName: 'Charlie',
          lastName: 'Marketer',
          role: 'seeker',
          timezone: 'America/Chicago',
        },
      })

      createdUserIds.push(userProfile.id)

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      const jobSeeker = await db.jobSeeker.create({
        data: {
          userId: userProfile.id,
          membershipPlan: 'gold_bimonthly',
          membershipExpiresAt: expiresAt,
          availability: 'Remote',
        },
      })

      expect(jobSeeker.membershipPlan).toBe('gold_bimonthly')
      expect(jobSeeker.membershipExpiresAt).toBeDefined()
      expect(jobSeeker.membershipExpiresAt).toEqual(expiresAt)

      const activeSeekers = await db.jobSeeker.findMany({
        where: {
          membershipPlan: 'gold_bimonthly',
          membershipExpiresAt: {
            gt: new Date(),
          },
        },
      })
      expect(activeSeekers.length).toBeGreaterThan(0)
      expect(activeSeekers.find(s => s.userId === userProfile.id)).toBeDefined()
    })
  })

  describe('Pending Signup Save - Mid-flow Progress', () => {
    it('should save partial onboarding data in PendingSignup', async () => {
      const clerkUserId = `test-clerk-${Date.now()}`
      const email = `seeker-pending-${Date.now()}@test.com`

      const onboardingData = JSON.stringify({
        role: 'seeker',
        firstName: 'David',
        lastName: 'Analyst',
        location: 'New York, NY',
        experience: '3',
      })

      const pendingSignup = await db.pendingSignup.create({
        data: {
          clerkUserId,
          email,
          onboardingData,
          selectedPlan: 'trial_monthly',
          sessionToken: `token-${Date.now()}`,
          returnUrl: '/onboarding',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      createdPendingSignupIds.push(pendingSignup.id)

      expect(pendingSignup.clerkUserId).toBe(clerkUserId)
      expect(pendingSignup.email).toBe(email)

      const retrieved = await db.pendingSignup.findUnique({
        where: { id: pendingSignup.id },
      })
      expect(retrieved).toBeDefined()

      const data = JSON.parse(retrieved!.onboardingData)
      expect(data.role).toBe('seeker')
      expect(data.firstName).toBe('David')
      expect(data.location).toBe('New York, NY')
    })

    it('should update pending signup when user continues later', async () => {
      const clerkUserId = `test-clerk-${Date.now()}`
      const email = `seeker-update-${Date.now()}@test.com`

      const initial = await db.pendingSignup.create({
        data: {
          clerkUserId,
          email,
          onboardingData: JSON.stringify({ firstName: 'David' }),
          selectedPlan: 'trial_monthly',
          sessionToken: `token-${Date.now()}`,
          returnUrl: '/onboarding',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      createdPendingSignupIds.push(initial.id)

      const updated = await db.pendingSignup.update({
        where: { id: initial.id },
        data: {
          onboardingData: JSON.stringify({
            firstName: 'David',
            lastName: 'Analyst',
            location: 'New York, NY',
            professionalSummary: 'Data analyst with 3 years experience',
          }),
        },
      })

      const data = JSON.parse(updated.onboardingData)
      expect(data.lastName).toBe('Analyst')
      expect(data.professionalSummary).toBeDefined()
    })
  })

  describe('Complete Onboarding Flow', () => {
    it('should handle full seeker onboarding end-to-end', async () => {
      const clerkUserId = `test-clerk-${Date.now()}`
      const email = `seeker-fullflow-${Date.now()}@test.com`

      const userProfile = await db.userProfile.create({
        data: {
          clerkUserId,
          email,
          name: 'Full Flow Test',
          firstName: 'Full',
          lastName: 'Flow',
          role: 'seeker',
          timezone: 'America/Chicago',
        },
      })

      createdUserIds.push(userProfile.id)

      const jobSeeker = await db.jobSeeker.create({
        data: {
          userId: userProfile.id,
          headline: 'Senior Software Engineer',
          skills: ['TypeScript', 'React', 'Node.js', 'AWS'],
          availability: 'Remote',
          professionalSummary: 'Experienced engineer looking for remote opportunities',
          membershipPlan: 'gold_bimonthly',
          membershipExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      expect(jobSeeker.membershipPlan).toBe('gold_bimonthly')

      const fullProfile = await db.userProfile.findUnique({
        where: { id: userProfile.id },
        include: {
          jobSeeker: true,
        },
      })

      expect(fullProfile?.jobSeeker).toBeDefined()
      expect(fullProfile?.jobSeeker?.skills).toContain('TypeScript')
      expect(fullProfile?.jobSeeker?.membershipPlan).toBe('gold_bimonthly')
    })
  })
})
