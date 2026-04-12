import { NextRequest } from 'next/server'
import { GET } from '@/app/api/payments/stripe-success/route'

// Mock dependencies
jest.mock('@/lib/db', () => ({
    db: {
        pendingSignup: {
            findUnique: jest.fn(),
            delete: jest.fn()
        },
        userProfile: {
            findUnique: jest.fn()
        }
    }
}))

jest.mock('stripe', () => {
    return jest.fn().mockImplementation(() => ({
        checkout: {
            sessions: {
                retrieve: jest.fn()
            }
        }
    }))
})

describe('Stripe Success API', () => {
    const mockDb = require('@/lib/db').db
    const mockStripe = require('stripe')

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should redirect to dashboard when user profile exists', async () => {
        // Mock Stripe session as paid
        const mockSession = {
            id: 'cs_test_123',
            payment_status: 'paid',
            customer_email: 'test@example.com'
        }
        mockStripe().checkout.sessions.retrieve.mockResolvedValue(mockSession)

        // Mock pending signup exists
        const mockPendingSignup = {
            id: 'pending_123',
            clerkUserId: 'user_123',
            email: 'test@example.com'
        }
        mockDb.pendingSignup.findUnique.mockResolvedValue(mockPendingSignup)

        // Mock user profile exists
        const mockUserProfile = {
            id: 'profile_123',
            clerkUserId: 'user_123'
        }
        mockDb.userProfile.findUnique.mockResolvedValue(mockUserProfile)

        // Create request
        const url = new URL('http://localhost:3000/api/payments/stripe-success')
        url.searchParams.set('session_id', 'cs_test_123')
        url.searchParams.set('pendingSignupId', 'pending_123')

        const request = new NextRequest(url)

        // Call the API
        const response = await GET(request)

        // Should redirect to dashboard
        expect(response.status).toBe(302)
        expect(response.headers.get('Location')).toContain('/seeker/dashboard')
        expect(response.headers.get('Location')).toContain('welcome=true')

        // Should delete pending signup
        expect(mockDb.pendingSignup.delete).toHaveBeenCalledWith({
            where: { id: 'pending_123' }
        })
    })

    it('should redirect to onboarding when user profile does not exist', async () => {
        // Mock Stripe session as paid
        const mockSession = {
            id: 'cs_test_123',
            payment_status: 'paid',
            customer_email: 'test@example.com'
        }
        mockStripe().checkout.sessions.retrieve.mockResolvedValue(mockSession)

        // Mock pending signup exists
        const mockPendingSignup = {
            id: 'pending_123',
            clerkUserId: 'user_123',
            email: 'test@example.com'
        }
        mockDb.pendingSignup.findUnique.mockResolvedValue(mockPendingSignup)

        // Mock user profile does not exist
        mockDb.userProfile.findUnique.mockResolvedValue(null)

        // Create request
        const url = new URL('http://localhost:3000/api/payments/stripe-success')
        url.searchParams.set('session_id', 'cs_test_123')
        url.searchParams.set('pendingSignupId', 'pending_123')

        const request = new NextRequest(url)

        // Call the API
        const response = await GET(request)

        // Should redirect to onboarding
        expect(response.status).toBe(302)
        expect(response.headers.get('Location')).toContain('/onboarding')
        expect(response.headers.get('Location')).toContain('payment_status=success')
        expect(response.headers.get('Location')).toContain('sessionId=cs_test_123')
        expect(response.headers.get('Location')).toContain('pendingSignupId=pending_123')
    })

    it('should redirect to sign-in on invalid session', async () => {
        // Mock Stripe session as unpaid
        const mockSession = {
            id: 'cs_test_123',
            payment_status: 'unpaid',
            customer_email: 'test@example.com'
        }
        mockStripe().checkout.sessions.retrieve.mockResolvedValue(mockSession)

        // Create request
        const url = new URL('http://localhost:3000/api/payments/stripe-success')
        url.searchParams.set('session_id', 'cs_test_123')
        url.searchParams.set('pendingSignupId', 'pending_123')

        const request = new NextRequest(url)

        // Call the API
        const response = await GET(request)

        // Should redirect to sign-in
        expect(response.status).toBe(302)
        expect(response.headers.get('Location')).toContain('/sign-in')
        expect(response.headers.get('Location')).toContain('error=payment_failed')
    })
})