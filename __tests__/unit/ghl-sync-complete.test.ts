/**
 * Complete GHL Sync End-to-End Test
 * Tests the actual behavior of GHL sync including:
 * - Contact upsert (create or update existing)
 * - Activity note creation
 * - Purchase history tracking
 */

import { GHLSyncService } from '@/lib/ghl-sync-service'
import axios from 'axios'
import { db } from '@/lib/db'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock database
jest.mock('@/lib/db', () => ({
    db: {
        userProfile: {
            findUnique: jest.fn(),
        },
    },
}))

describe('GHL Sync Service - Complete E2E', () => {
    let ghlService: GHLSyncService
    const mockApiKey = 'test-api-key'
    const mockLocationId = 'test-location-id'

    beforeEach(() => {
        jest.clearAllMocks()

        // Mock axios.create to return a mock client
        const mockClient = {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            patch: jest.fn(),
            delete: jest.fn(),
        }

        mockedAxios.create = jest.fn().mockReturnValue(mockClient as any)

        ghlService = new GHLSyncService(mockApiKey, mockLocationId)
    })

    describe('Contact Upsert - Duplicate Handling', () => {
        it('should CREATE new contact if not exists', async () => {
            const mockClient = (ghlService as any).client
            mockClient.post.mockResolvedValueOnce({
                status: 201,
                data: {
                    contact: {
                        id: 'new-contact-id',
                        email: 'test@example.com',
                        firstName: 'Test',
                        lastName: 'User'
                    }
                }
            })

            const result = await ghlService.upsertContact({
                locationId: mockLocationId,
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                name: 'Test User'
            })

            expect(result.contact.id).toBe('new-contact-id')
            expect(result.message).toBe('Contact created successfully')
            expect(mockClient.post).toHaveBeenCalledWith('/contacts/', expect.any(Object))
        })

        it('should UPDATE existing contact when duplicate detected', async () => {
            const mockClient = (ghlService as any).client
            const existingContactId = 'existing-contact-id'

            // First POST fails with duplicate error
            mockClient.post.mockRejectedValueOnce({
                response: {
                    status: 400,
                    data: {
                        message: 'This location does not allow duplicated contacts.'
                    }
                }
            })

            // Search returns existing contact
            mockClient.get.mockResolvedValueOnce({
                status: 200,
                data: {
                    contacts: [{
                        id: existingContactId,
                        email: 'test@example.com',
                        firstName: 'Old',
                        lastName: 'Name'
                    }]
                }
            })

            // PUT update succeeds
            mockClient.put.mockResolvedValueOnce({
                status: 200,
                data: {
                    contact: {
                        id: existingContactId,
                        email: 'test@example.com',
                        firstName: 'Updated',
                        lastName: 'User'
                    }
                }
            })

            const result = await ghlService.upsertContact({
                locationId: mockLocationId,
                email: 'test@example.com',
                firstName: 'Updated',
                lastName: 'User',
                name: 'Updated User'
            })

            expect(result.contact.id).toBe(existingContactId)
            expect(result.message).toContain('updated')
            expect(mockClient.get).toHaveBeenCalledWith('/contacts/', expect.any(Object))
            expect(mockClient.put).toHaveBeenCalledWith(`/contacts/${existingContactId}`, expect.any(Object))
        })
    })

    describe('Activity Notes - Purchase History', () => {
        it('should create activity note with correct payload format', async () => {
            const mockClient = (ghlService as any).client
            const contactId = 'test-contact-id'
            const userEmail = 'test@example.com'

                // Mock database user lookup
                ; (db.userProfile.findUnique as jest.Mock).mockResolvedValueOnce({
                    id: 'user-id-123',
                    email: userEmail,
                    role: 'seeker'
                })

            // Mock findContactByEmail
            mockClient.get.mockResolvedValueOnce({
                status: 200,
                data: {
                    contacts: [{
                        id: contactId,
                        email: userEmail
                    }]
                }
            })

            // Mock note creation
            mockClient.post.mockResolvedValueOnce({
                status: 201,
                data: {
                    id: 'note-id'
                }
            })

            await ghlService.addPurchaseActivityNote(
                'user-id-123',
                'addon_purchase',
                {
                    amount: 50,
                    serviceName: 'Resume Refresh'
                }
            )

            // Verify note endpoint was called with correct format
            // CRITICAL: Notes endpoint is /contacts/:id/notes (NO trailing slash)
            expect(mockClient.post).toHaveBeenCalledWith(
                `/contacts/${contactId}/notes`,
                expect.objectContaining({
                    body: expect.stringContaining('ADD-ON SERVICE PURCHASED'),
                    userId: contactId // Fixed: Must be contactId, not random string
                })
            )
        })

        it('should handle note creation failure gracefully', async () => {
            const mockClient = (ghlService as any).client

                // Mock database user lookup
                ; (db.userProfile.findUnique as jest.Mock).mockResolvedValueOnce({
                    id: 'user-id',
                    email: 'test@example.com',
                    role: 'seeker'
                })

            // Mock findContactByEmail success
            mockClient.get.mockResolvedValueOnce({
                status: 200,
                data: {
                    contacts: [{
                        id: 'contact-id',
                        email: 'test@example.com'
                    }]
                }
            })

            // Mock note creation failure (422)
            mockClient.post.mockRejectedValueOnce({
                response: {
                    status: 422,
                    data: {
                        message: 'Invalid request'
                    }
                }
            })

            // Should not throw - notes are non-critical
            await expect(
                ghlService.addPurchaseActivityNote('user-id', 'addon_purchase', {
                    amount: 50,
                    serviceName: 'Test Service'
                })
            ).resolves.not.toThrow()
        })
    })
})
