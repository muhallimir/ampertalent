/**
 * Unit tests for messaging initiation rules (Ticket #487)
 *
 * These tests call the send API route handler directly with mocked auth,
 * so no real DB writes happen for the permission checks.
 */

import { POST } from '@/app/api/messages/send/route'
import { NextRequest } from 'next/server'

// Mock getCurrentUser
jest.mock('@/lib/auth', () => ({
    getCurrentUser: jest.fn(),
}))

// Mock db
jest.mock('@/lib/db', () => ({
    db: {
        userProfile: { findUnique: jest.fn() },
        messageThread: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
        message: { create: jest.fn() },
    },
}))

// Mock everything else that send/route imports
jest.mock('@/lib/connections-store', () => ({ connectionsStore: { get: jest.fn() } }))
jest.mock('@/lib/socket-io-service', () => ({ socketIOService: { emit: jest.fn() } }))
jest.mock('@/lib/s3', () => ({ S3Service: {} }))

import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>
const mockDb = db as jest.Mocked<typeof db>

function makeRequest(body: object) {
    return new NextRequest('http://localhost/api/messages/send', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    })
}

describe('Messaging initiation rules', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('Seeker cannot start a new thread', () => {
        it('returns 403 when a seeker tries to message an employer with no existing thread', async () => {
            mockGetCurrentUser.mockResolvedValue({
                clerkUser: { id: 'clerk-seeker-1' } as any,
                profile: { id: 'seeker-profile-1', role: 'seeker', employer: null, jobSeeker: { userId: 'seeker-profile-1' } } as any,
            } as any)

                // Recipient exists and allows DMs
                ; (mockDb.userProfile.findUnique as jest.Mock).mockResolvedValue({
                    id: 'employer-profile-1',
                    role: 'employer',
                    allowDirectMessages: true,
                    employer: { userId: 'employer-profile-1' },
                    jobSeeker: null,
                })

                // No existing thread
                ; (mockDb.messageThread.findFirst as jest.Mock).mockResolvedValue(null)

            const res = await POST(makeRequest({ recipientId: 'employer-profile-1', content: 'Hello' }))
            expect(res.status).toBe(403)
            const body = await res.json()
            expect(body.error).toMatch(/cannot initiate/i)
        })
    })

    describe('Employer blocked when seeker has allowDirectMessages = false', () => {
        it('returns 403 when recipient does not allow direct messages', async () => {
            mockGetCurrentUser.mockResolvedValue({
                clerkUser: { id: 'clerk-employer-1' } as any,
                profile: { id: 'employer-profile-1', role: 'employer', employer: { userId: 'employer-profile-1' }, jobSeeker: null } as any,
            } as any)

                ; (mockDb.userProfile.findUnique as jest.Mock).mockResolvedValue({
                    id: 'seeker-profile-1',
                    role: 'seeker',
                    allowDirectMessages: false,
                    jobSeeker: { userId: 'seeker-profile-1' },
                    employer: null,
                })

            const res = await POST(makeRequest({ recipientId: 'seeker-profile-1', content: 'Hello' }))
            expect(res.status).toBe(403)
            const body = await res.json()
            expect(body.error).toMatch(/does not allow direct messages/i)
        })
    })

    describe('Employer can initiate a new thread', () => {
        it('creates a new thread when employer messages a seeker with DMs on', async () => {
            mockGetCurrentUser.mockResolvedValue({
                clerkUser: { id: 'clerk-employer-1' } as any,
                profile: { id: 'employer-profile-1', role: 'employer', employer: { userId: 'employer-profile-1' }, jobSeeker: null, firstName: 'Jane' } as any,
            } as any)

                ; (mockDb.userProfile.findUnique as jest.Mock).mockResolvedValue({
                    id: 'seeker-profile-1',
                    role: 'seeker',
                    allowDirectMessages: true,
                    jobSeeker: { userId: 'seeker-profile-1' },
                    employer: null,
                })

                // No existing thread
                ; (mockDb.messageThread.findFirst as jest.Mock).mockResolvedValue(null)

            const mockThread = { id: 'thread-1', participants: ['employer-profile-1', 'seeker-profile-1'] }
                ; (mockDb.messageThread.create as jest.Mock).mockResolvedValue(mockThread)

                // Message create
                ; (mockDb.message as any).create = jest.fn().mockResolvedValue({
                    id: 'msg-1', content: 'Hello', senderId: 'employer-profile-1', recipientId: 'seeker-profile-1',
                    threadId: 'thread-1', createdAt: new Date(), isRead: false,
                })

            const res = await POST(makeRequest({ recipientId: 'seeker-profile-1', content: 'Hello' }))

            // Thread was created
            expect(mockDb.messageThread.create).toHaveBeenCalled()
        })
    })
})
