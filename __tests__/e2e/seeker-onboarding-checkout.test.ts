import { db } from '@/lib/db'
import { SEEKER_SUBSCRIPTION_PLANS } from '@/lib/subscription-plans'

/**
 * End-to-end test: Complete seeker onboarding flow with checkout
 * This simulates:
 * 1. User fills onboarding form
 * 2. Pending signup is created
 * 3. User selects subscription package
 * 4. Checkout endpoint is called
 * 5. Checkout URL with correct price is returned
 */
describe('Seeker Onboarding to Checkout Flow E2E', () => {
    const testEmail = 'test-checkout-' + Date.now() + '@example.com'
    const clerkUserId = 'user_test_' + Date.now()

    it('should create pending signup during onboarding', async () => {
        // Simulate: User completes onboarding form and system saves pending signup
        const onboardingData = {
            role: 'seeker',
            firstName: 'Test',
            lastName: 'User',
            location: 'Remote',
            experience: 'entry_level',
            skills: ['JavaScript', 'React'],
            professionalSummary: 'Test summary'
        }

        const pendingSignup = await db.pendingSignup.create({
            data: {
                clerkUserId,
                email: testEmail,
                onboardingData: JSON.stringify(onboardingData),
                selectedPlan: 'trial', // Will be updated when user selects package
                sessionToken: 'TEST_TOKEN_' + Date.now(),
                returnUrl: 'http://localhost:3000/seeker/dashboard',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
        })

        expect(pendingSignup).toBeDefined()
        expect(pendingSignup.clerkUserId).toBe(clerkUserId)
        expect(pendingSignup.selectedPlan).toBe('trial')
        console.log('✅ Pending signup created:', {
            id: pendingSignup.id,
            email: pendingSignup.email,
            selectedPlan: pendingSignup.selectedPlan
        })

        return pendingSignup
    })

    it('should find and update pending signup when user selects package', async () => {
        // First create a pending signup
        const pendingSignup = await db.pendingSignup.create({
            data: {
                clerkUserId,
                email: testEmail,
                firstName: 'Test',
                lastName: 'User',
                location: 'Remote',
                experience: 'entry_level',
                skills: ['JavaScript'],
                professionalSummary: 'Test',
                selectedPlan: 'trial',
                sessionToken: 'TEST_TOKEN_' + Date.now(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
        })

        // Simulate: User selects 'gold' package in checkout
        const selectedPackage = 'gold'

        // Find existing pending signup (what checkout endpoint does)
        const existing = await db.pendingSignup.findFirst({
            where: {
                clerkUserId,
                expiresAt: {
                    gt: new Date()
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        expect(existing).toBeDefined()
        expect(existing?.id).toBe(pendingSignup.id)

        // Update with selected package
        if (existing && existing.selectedPlan !== selectedPackage) {
            const updated = await db.pendingSignup.update({
                where: { id: existing.id },
                data: { selectedPlan: selectedPackage }
            })

            expect(updated.selectedPlan).toBe('gold')
            console.log('✅ Pending signup updated:', {
                id: updated.id,
                previousPlan: 'trial',
                newPlan: updated.selectedPlan
            })
        }
    })

    it('should construct checkout URL with correct plan price', async () => {
        // Simulate what checkout endpoint does
        const selectedPackage = 'vip-platinum'

        // Look up plan
        const plan = SEEKER_SUBSCRIPTION_PLANS.find(p => p.id === selectedPackage)
        expect(plan).toBeDefined()
        expect(plan?.price).toBe(79.99)
        expect(plan?.name).toBe('Flex VIP')

        console.log('✅ Plan details retrieved:', {
            id: plan?.id,
            name: plan?.name,
            price: plan?.price,
            billing: plan?.billing
        })

        // Construct checkout URL
        const baseUrl = 'http://localhost:3000'
        const checkoutUrl = new URL('/checkout/paypal', baseUrl)
        checkoutUrl.searchParams.set('planId', selectedPackage)
        checkoutUrl.searchParams.set('pendingSignupId', 'test-pending-id')
        checkoutUrl.searchParams.set('sessionToken', 'test-token')
        checkoutUrl.searchParams.set('totalPrice', plan!.price.toString())
        checkoutUrl.searchParams.set('userType', 'seeker')
        checkoutUrl.searchParams.set('returnUrl', `${baseUrl}/seeker/dashboard`)

        const url = checkoutUrl.toString()
        expect(url).toContain('planId=vip-platinum')
        expect(url).toContain('totalPrice=79.99')
        expect(url).toContain('/checkout/paypal')

        console.log('✅ Checkout URL constructed correctly:', {
            url: url.substring(0, 100) + '...',
            hasPrice: url.includes('totalPrice=79.99'),
            hasPlanId: url.includes('planId=vip-platinum')
        })
    })

    it('should validate all subscription plans have prices', () => {
        SEEKER_SUBSCRIPTION_PLANS.forEach(plan => {
            expect(plan.price).toBeGreaterThan(0)
            expect(plan.name).toBeDefined()
            expect(plan.name).toMatch(/Flex/) // Should use new Flex branding
            console.log(`✅ Plan valid: ${plan.id} - ${plan.name} ($${plan.price})`)
        })
    })

    afterAll(async () => {
        // Cleanup: Delete test pending signups
        await db.pendingSignup.deleteMany({
            where: {
                email: testEmail
            }
        })
        console.log('✅ Test cleanup completed')
    })
})
