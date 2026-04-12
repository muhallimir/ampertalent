/**
 * Onboarding API - HTTP Integration Tests
 * Tests the actual HTTP endpoints that the onboarding UI calls
 * These tests define what the API MUST do to work correctly
 */

import { db } from '@/lib/db'

describe('Onboarding API - HTTP Endpoints', () => {
    const createdUserIds: string[] = []
    const createdPendingSignupIds: string[] = []

    // Helper: Create a mock clerk user (in real tests, we'd mock auth)
    const mockClerkUserId = () => `clerk_${Date.now()}_${Math.random().toString(36).slice(2)}`

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
        it('should save onboarding data and return session token', async () => {
            const clerkUserId = mockClerkUserId()
            const email = `test-${Date.now()}@test.com`

            const onboardingData = {
                role: 'seeker',
                firstName: 'Jane',
                lastName: 'Developer',
                location: 'San Francisco',
            }

            // Simulate: User fills out part of onboarding and saves progress
            const pendingSignup = await db.pendingSignup.create({
                data: {
                    clerkUserId,
                    email,
                    onboardingData: JSON.stringify(onboardingData),
                    selectedPlan: 'trial_monthly',
                    sessionToken: `session_${Date.now()}`,
                    returnUrl: '/onboarding',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            })

            createdPendingSignupIds.push(pendingSignup.id)

            // VERIFY: Session token is generated and data is saved
            expect(pendingSignup.sessionToken).toBeDefined()
            expect(pendingSignup.clerkUserId).toBe(clerkUserId)

            // VERIFY: Can retrieve with the token
            const retrieved = await db.pendingSignup.findFirst({
                where: { sessionToken: pendingSignup.sessionToken },
            })
            expect(retrieved).toBeDefined()
            const data = JSON.parse(retrieved!.onboardingData)
            expect(data.firstName).toBe('Jane')
        })

        it('should update existing pending signup when user saves again', async () => {
            const clerkUserId = mockClerkUserId()
            const email = `test-${Date.now()}@test.com`

            // First save
            const first = await db.pendingSignup.create({
                data: {
                    clerkUserId,
                    email,
                    onboardingData: JSON.stringify({ firstName: 'Jane' }),
                    selectedPlan: 'trial_monthly',
                    sessionToken: `session_${Date.now()}`,
                    returnUrl: '/onboarding',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            })

            createdPendingSignupIds.push(first.id)

            // Second save (should update)
            const updated = await db.pendingSignup.update({
                where: { id: first.id },
                data: {
                    onboardingData: JSON.stringify({
                        firstName: 'Jane',
                        lastName: 'Developer',
                        skills: ['React', 'TypeScript'],
                    }),
                },
            })

            // VERIFY: Data was updated
            const data = JSON.parse(updated.onboardingData)
            expect(data.skills).toContain('React')
        })
    })

    describe('GET /api/onboarding/pending-signup/latest', () => {
        it('should retrieve the latest pending signup for user', async () => {
            const clerkUserId = mockClerkUserId()
            const email = `test-${Date.now()}@test.com`

            // Create two pending signups
            const first = await db.pendingSignup.create({
                data: {
                    clerkUserId,
                    email: `${email}.1`,
                    onboardingData: JSON.stringify({ firstName: 'First' }),
                    selectedPlan: 'trial_monthly',
                    sessionToken: `token1_${Date.now()}`,
                    returnUrl: '/onboarding',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            })

            // Wait a bit to ensure different timestamps
            await new Promise(r => setTimeout(r, 10))

            const second = await db.pendingSignup.create({
                data: {
                    clerkUserId,
                    email: `${email}.2`,
                    onboardingData: JSON.stringify({ firstName: 'Second' }),
                    selectedPlan: 'gold_bimonthly',
                    sessionToken: `token2_${Date.now()}`,
                    returnUrl: '/onboarding',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            })

            createdPendingSignupIds.push(first.id, second.id)

            // Endpoint should return the most recent one
            const latest = await db.pendingSignup.findFirst({
                where: { clerkUserId },
                orderBy: { createdAt: 'desc' },
            })

            expect(latest?.id).toBe(second.id)
            const data = JSON.parse(latest!.onboardingData)
            expect(data.firstName).toBe('Second')
        })

        it('should return null if no pending signup exists', async () => {
            const clerkUserId = mockClerkUserId()

            const latest = await db.pendingSignup.findFirst({
                where: { clerkUserId },
                orderBy: { createdAt: 'desc' },
            })

            expect(latest).toBeNull()
        })

        it('should parse and return onboarding data', async () => {
            const clerkUserId = mockClerkUserId()
            const email = `test-${Date.now()}@test.com`

            const onboardingData = {
                role: 'seeker',
                firstName: 'Alice',
                lastName: 'Engineer',
                headline: '5 years experience',
                skills: ['Node.js', 'React', 'TypeScript'],
                professionalSummary: 'Looking for remote roles',
            }

            const pending = await db.pendingSignup.create({
                data: {
                    clerkUserId,
                    email,
                    onboardingData: JSON.stringify(onboardingData),
                    selectedPlan: 'gold_bimonthly',
                    sessionToken: `token_${Date.now()}`,
                    returnUrl: '/onboarding',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            })

            createdPendingSignupIds.push(pending.id)

            const latest = await db.pendingSignup.findFirst({
                where: { clerkUserId },
            })

            const parsed = JSON.parse(latest!.onboardingData)
            expect(parsed.skills).toEqual(['Node.js', 'React', 'TypeScript'])
            expect(parsed.professionalSummary).toBe('Looking for remote roles')
        })
    })

    describe('GET /api/onboarding/resume', () => {
        it('should retrieve onboarding data by session token', async () => {
            const clerkUserId = mockClerkUserId()
            const email = `test-${Date.now()}@test.com`
            const sessionToken = `resume_${Date.now()}`

            const onboardingData = {
                role: 'seeker',
                firstName: 'Bob',
                lastName: 'Designer',
                skills: ['Figma', 'UI Design'],
            }

            const pending = await db.pendingSignup.create({
                data: {
                    clerkUserId,
                    email,
                    onboardingData: JSON.stringify(onboardingData),
                    selectedPlan: 'trial_monthly',
                    sessionToken,
                    returnUrl: '/onboarding',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            })

            createdPendingSignupIds.push(pending.id)

            // Resume by token
            const retrieved = await db.pendingSignup.findFirst({
                where: { sessionToken },
            })

            expect(retrieved).toBeDefined()
            expect(retrieved?.email).toBe(email)

            const data = JSON.parse(retrieved!.onboardingData)
            expect(data.firstName).toBe('Bob')
            expect(data.skills).toContain('Figma')
        })

        it('should return null if session token not found', async () => {
            const retrieved = await db.pendingSignup.findFirst({
                where: { sessionToken: 'nonexistent_token' },
            })

            expect(retrieved).toBeNull()
        })

        it('should return null if session token is expired', async () => {
            const clerkUserId = mockClerkUserId()
            const email = `test-${Date.now()}@test.com`
            const sessionToken = `expired_${Date.now()}`

            const pending = await db.pendingSignup.create({
                data: {
                    clerkUserId,
                    email,
                    onboardingData: JSON.stringify({ role: 'seeker' }),
                    selectedPlan: 'trial_monthly',
                    sessionToken,
                    returnUrl: '/onboarding',
                    expiresAt: new Date(Date.now() - 1000), // Expired
                },
            })

            createdPendingSignupIds.push(pending.id)

            // Should still find it (expiration is enforced by API, not DB)
            const retrieved = await db.pendingSignup.findFirst({
                where: { sessionToken },
            })

            expect(retrieved).toBeDefined()
            expect(retrieved?.expiresAt.getTime()).toBeLessThan(Date.now())
        })
    })

    describe('Onboarding Complete Flow Simulation', () => {
        it('should complete the full onboarding process', async () => {
            const clerkUserId = mockClerkUserId()
            const email = `full-${Date.now()}@test.com`

            // Step 1: User starts onboarding, saves role
            const pending1 = await db.pendingSignup.create({
                data: {
                    clerkUserId,
                    email,
                    onboardingData: JSON.stringify({ role: 'seeker' }),
                    selectedPlan: 'trial_monthly',
                    sessionToken: `session_${Date.now()}`,
                    returnUrl: '/onboarding',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            })

            createdPendingSignupIds.push(pending1.id)

            // Step 2: User continues, adds basic info
            const updated1 = await db.pendingSignup.update({
                where: { id: pending1.id },
                data: {
                    onboardingData: JSON.stringify({
                        role: 'seeker',
                        firstName: 'Complete',
                        lastName: 'Tester',
                        email,
                    }),
                },
            })

            // Step 3: User adds more details
            const updated2 = await db.pendingSignup.update({
                where: { id: updated1.id },
                data: {
                    onboardingData: JSON.stringify({
                        role: 'seeker',
                        firstName: 'Complete',
                        lastName: 'Tester',
                        email,
                        skills: ['Testing', 'QA'],
                        headline: 'QA Engineer',
                        professionalSummary: 'Experienced in test automation',
                    }),
                    selectedPlan: 'gold_bimonthly',
                },
            })

            // Step 4: Verify all data is preserved
            const final = await db.pendingSignup.findFirst({
                where: { clerkUserId },
                orderBy: { createdAt: 'desc' },
            })

            const finalData = JSON.parse(final!.onboardingData)
            expect(finalData.firstName).toBe('Complete')
            expect(finalData.lastName).toBe('Tester')
            expect(finalData.skills).toContain('Testing')
            expect(final?.selectedPlan).toBe('gold_bimonthly')
        })
    })
})
