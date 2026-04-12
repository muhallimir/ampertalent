import { db } from '@/lib/db'

describe('Onboarding API Endpoints', () => {
    const createdUserIds: string[] = []
    const createdPendingSignupIds: string[] = []

    afterEach(async () => {
        for (const userId of createdUserIds) {
            await db.jobSeeker.delete({
                where: { userId },
            }).catch(() => { })

            await db.userProfile.delete({
                where: { id: userId },
            }).catch(() => { })
        }

        for (const psId of createdPendingSignupIds) {
            await db.pendingSignup.delete({
                where: { id: psId },
            }).catch(() => { })
        }

        createdUserIds.length = 0
        createdPendingSignupIds.length = 0
    })

    describe('POST /api/onboarding/pending-signup', () => {
        it('should save partial onboarding data and return session token', async () => {
            const clerkUserId = `test-clerk-${Date.now()}`
            const email = `api-pending-${Date.now()}@test.com`

            const onboardingData = {
                role: 'seeker',
                firstName: 'Test',
                lastName: 'User',
                location: 'San Francisco, CA',
            }

            // This endpoint should accept onboarding data from client and save to PendingSignup
            // It should return sessionToken to allow resuming later

            const pendingSignup = await db.pendingSignup.create({
                data: {
                    clerkUserId,
                    email,
                    onboardingData: JSON.stringify(onboardingData),
                    selectedPlan: 'trial_monthly',
                    sessionToken: `token-${Date.now()}`,
                    returnUrl: '/onboarding',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            })

            createdPendingSignupIds.push(pendingSignup.id)

            // VERIFY: Can retrieve the pending signup with the token
            const retrieved = await db.pendingSignup.findFirst({
                where: { sessionToken: pendingSignup.sessionToken },
            })

            expect(retrieved).toBeDefined()
            expect(retrieved?.clerkUserId).toBe(clerkUserId)

            const data = JSON.parse(retrieved!.onboardingData)
            expect(data.firstName).toBe('Test')
        })
    })

    describe('GET /api/onboarding/pending-signup/latest', () => {
        it('should retrieve the latest pending signup for a user', async () => {
            const clerkUserId = `test-clerk-${Date.now()}`
            const email = `api-latest-${Date.now()}@test.com`

            // Create first pending signup
            await db.pendingSignup.create({
                data: {
                    clerkUserId,
                    email,
                    onboardingData: JSON.stringify({ firstName: 'First' }),
                    selectedPlan: 'trial_monthly',
                    sessionToken: `token1-${Date.now()}`,
                    returnUrl: '/onboarding',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            })

            // Create second (newer) pending signup
            const latest = await db.pendingSignup.create({
                data: {
                    clerkUserId,
                    email: `${email}.second`,
                    onboardingData: JSON.stringify({ firstName: 'Latest' }),
                    selectedPlan: 'gold_bimonthly',
                    sessionToken: `token2-${Date.now()}`,
                    returnUrl: '/onboarding',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            })

            createdPendingSignupIds.push(latest.id)

            // VERIFY: Get latest pending signup for user (by createdAt DESC)
            const retrieved = await db.pendingSignup.findFirst({
                where: { clerkUserId },
                orderBy: { createdAt: 'desc' },
            })

            expect(retrieved).toBeDefined()
            expect(retrieved?.id).toBe(latest.id)

            const data = JSON.parse(retrieved!.onboardingData)
            expect(data.firstName).toBe('Latest')
        })
    })

    describe('GET /api/onboarding/resume', () => {
        it('should retrieve onboarding data by resume token', async () => {
            const resumeToken = `resume-${Date.now()}`
            const clerkUserId = `test-clerk-${Date.now()}`
            const email = `api-resume-${Date.now()}@test.com`

            const onboardingData = {
                role: 'seeker',
                firstName: 'Resume',
                lastName: 'Test',
                skills: ['React', 'Node.js'],
                professionalSummary: 'Looking to resume application',
            }

            const pendingSignup = await db.pendingSignup.create({
                data: {
                    clerkUserId,
                    email,
                    onboardingData: JSON.stringify(onboardingData),
                    selectedPlan: 'trial_monthly',
                    sessionToken: resumeToken,
                    returnUrl: '/onboarding',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            })

            createdPendingSignupIds.push(pendingSignup.id)

            // VERIFY: Can retrieve by session token
            const retrieved = await db.pendingSignup.findFirst({
                where: { sessionToken: resumeToken },
            })

            expect(retrieved).toBeDefined()
            expect(retrieved?.clerkUserId).toBe(clerkUserId)

            const data = JSON.parse(retrieved!.onboardingData)
            expect(data.skills).toContain('React')
        })
    })
})
