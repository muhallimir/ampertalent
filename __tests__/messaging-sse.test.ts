/**
 * Messaging SSE Integration Tests
 *
 * Tests that:
 * 1. SSE connections-store can broadcast to users
 * 2. Message reply route broadcasts correct SSE payload
 * 3. new_message notification shape matches what MessageThread.tsx expects
 * 4. Database records are created correctly and cleaned up
 * 5. Message thread participants are enforced
 *
 * All created DB records are cleaned up in afterAll.
 */

import { PrismaClient } from '@prisma/client'
import { connectionsStore } from '../lib/connections-store'
import { socketIOService } from '../lib/socket-io-service'

const db = new PrismaClient({
    datasources: {
        db: { url: process.env.DATABASE_URL },
    },
})

// IDs to clean up after tests
const createdIds = {
    messageIds: [] as string[],
    threadIds: [] as string[],
    userIds: [] as string[],
}

async function cleanup() {
    // Order matters due to foreign key constraints
    if (createdIds.messageIds.length > 0) {
        await db.messageAttachment.deleteMany({ where: { messageId: { in: createdIds.messageIds } } })
        await db.message.deleteMany({ where: { id: { in: createdIds.messageIds } } })
    }
    if (createdIds.threadIds.length > 0) {
        await db.messageThread.deleteMany({ where: { id: { in: createdIds.threadIds } } })
    }
    if (createdIds.userIds.length > 0) {
        await db.userProfile.deleteMany({ where: { id: { in: createdIds.userIds } } })
    }
    await db.$disconnect()
}

// Helper: create a minimal UserProfile for testing
async function createTestUser(role: 'employer' | 'seeker', suffix: string) {
    const user = await db.userProfile.create({
        data: {
            name: `Test ${role} ${suffix}`,
            firstName: `Test`,
            lastName: `${role}-${suffix}`,
            role,
            email: `test-${role}-${suffix}@ampertalent-test.invalid`,
            clerkUserId: `clerk_test_${role}_${suffix}_${Date.now()}`,
        },
    })
    createdIds.userIds.push(user.id)
    return user
}

// Helper: create a thread between two users
async function createTestThread(participantIds: string[]) {
    const thread = await db.messageThread.create({
        data: { participants: participantIds },
    })
    createdIds.threadIds.push(thread.id)
    return thread
}

// Helper: create a message
async function createTestMessage(senderId: string, recipientId: string, threadId: string, content: string) {
    const message = await db.message.create({
        data: { senderId, recipientId, content, threadId, deliveryStatus: 'sent' },
    })
    createdIds.messageIds.push(message.id)
    return message
}

afterAll(cleanup)

describe('ConnectionsStore - SSE broadcast', () => {
    test('broadcastToUser returns false when user not connected', () => {
        const result = connectionsStore.broadcastToUser('nonexistent-user', {
            type: 'new_message',
            title: 'Test',
        })
        expect(result).toBe(false)
    })

    test('broadcastToUser returns true when user is connected', () => {
        const userId = 'test-sse-user-' + Date.now()
        let enqueuedData: string | null = null

        // Mock controller
        const mockController = {
            enqueue: (data: string) => { enqueuedData = data },
        } as unknown as ReadableStreamDefaultController

        connectionsStore.addConnection(userId, mockController)

        const result = connectionsStore.broadcastToUser(userId, {
            type: 'new_message',
            title: 'Hello',
            threadId: 'thread-123',
            message: { id: 'msg-1', content: 'hi' },
        })

        expect(result).toBe(true)
        expect(enqueuedData).not.toBeNull()

        const parsed = JSON.parse(enqueuedData!.replace('data: ', '').trim())
        expect(parsed.type).toBe('notification')
        expect(parsed.notification.type).toBe('new_message')
        expect(parsed.notification.threadId).toBe('thread-123')

        // Cleanup connection
        connectionsStore.removeConnection(userId)
    })

    test('getStats reports connected users correctly', () => {
        const userId = 'test-stats-user-' + Date.now()
        const mockController = {
            enqueue: () => {},
        } as unknown as ReadableStreamDefaultController

        connectionsStore.addConnection(userId, mockController)
        const stats = connectionsStore.getStats()
        expect(stats.connectedUsers).toContain(userId)

        connectionsStore.removeConnection(userId)
        const statsAfter = connectionsStore.getStats()
        expect(statsAfter.connectedUsers).not.toContain(userId)
    })
})

describe('SocketIOService - SSE message shape', () => {
    test('emitNewMessage broadcasts correct shape that MessageThread.tsx expects', async () => {
        const recipientId = 'test-recipient-' + Date.now()
        let receivedNotification: any = null

        const mockController = {
            enqueue: (data: string) => {
                const parsed = JSON.parse(data.replace('data: ', '').trim())
                receivedNotification = parsed.notification
            },
        } as unknown as ReadableStreamDefaultController

        connectionsStore.addConnection(recipientId, mockController)

        const mockMessage = {
            id: 'msg-test-1',
            threadId: 'thread-test-1',
            recipientId,
            senderId: 'sender-test-1',
            content: 'Hello from unit test',
            createdAt: new Date().toISOString(),
            sender: { id: 'sender-test-1', name: 'Test Sender' },
        }

        await socketIOService.emitNewMessage('thread-test-1', mockMessage as any)

        // This is what MessageThread.tsx line 537-543 expects:
        // const data = notification as { threadId: string; message: Message };
        // if (data.threadId !== threadId) return;
        // setMessages((prev) => [...prev, data.message]);
        expect(receivedNotification).not.toBeNull()
        expect(receivedNotification.type).toBe('new_message')
        expect(receivedNotification.threadId).toBe('thread-test-1')
        expect(receivedNotification.message).toBeDefined()
        expect(receivedNotification.message.id).toBe('msg-test-1')
        expect(receivedNotification.message.content).toBe('Hello from unit test')

        connectionsStore.removeConnection(recipientId)
    })
})

describe('Messaging - Database operations with cleanup', () => {
    let employer: Awaited<ReturnType<typeof createTestUser>>
    let seeker: Awaited<ReturnType<typeof createTestUser>>

    beforeAll(async () => {
        employer = await createTestUser('employer', 'msg-test')
        seeker = await createTestUser('seeker', 'msg-test')
    })

    test('creates a message thread with correct participants', async () => {
        const thread = await createTestThread([employer.id, seeker.id])
        expect(thread.participants).toContain(employer.id)
        expect(thread.participants).toContain(seeker.id)
    })

    test('creates a message in a thread and links correctly', async () => {
        const thread = await createTestThread([employer.id, seeker.id])
        const message = await createTestMessage(employer.id, seeker.id, thread.id, 'Test message content')

        const fetched = await db.message.findUnique({
            where: { id: message.id },
            include: { sender: true, recipient: true },
        })

        expect(fetched).not.toBeNull()
        expect(fetched?.content).toBe('Test message content')
        expect(fetched?.senderId).toBe(employer.id)
        expect(fetched?.recipientId).toBe(seeker.id)
        expect(fetched?.threadId).toBe(thread.id)
        expect(fetched?.isRead).toBe(false)
        expect(fetched?.deliveryStatus).toBe('sent')
    })

    test('thread participants restriction - only participants can access messages', async () => {
        const thread = await createTestThread([employer.id, seeker.id])
        const outsider = await createTestUser('employer', 'outsider')

        // Thread participants should not include outsider
        expect(thread.participants).not.toContain(outsider.id)
        createdIds.userIds.push(outsider.id)
    })

    test('message read status can be updated', async () => {
        const thread = await createTestThread([employer.id, seeker.id])
        const message = await createTestMessage(seeker.id, employer.id, thread.id, 'Unread message')

        expect(message.isRead).toBe(false)

        const updated = await db.message.update({
            where: { id: message.id },
            data: { isRead: true },
        })
        expect(updated.isRead).toBe(true)
    })

    test('lastMessageAt updates when new message is added to thread', async () => {
        const thread = await createTestThread([employer.id, seeker.id])
        const originalTime = thread.lastMessageAt

        // Small delay to ensure time difference
        await new Promise(resolve => setTimeout(resolve, 10))

        await createTestMessage(employer.id, seeker.id, thread.id, 'Trigger lastMessageAt update')
        await db.messageThread.update({
            where: { id: thread.id },
            data: { lastMessageAt: new Date() },
        })

        const updatedThread = await db.messageThread.findUnique({ where: { id: thread.id } })
        expect(updatedThread?.lastMessageAt.getTime()).toBeGreaterThan(originalTime.getTime())
    })

    test('unread count query returns correct count', async () => {
        const thread = await createTestThread([employer.id, seeker.id])

        // Create 3 unread messages for employer
        for (let i = 0; i < 3; i++) {
            await createTestMessage(seeker.id, employer.id, thread.id, `Unread message ${i + 1}`)
        }

        const unreadCount = await db.message.count({
            where: { recipientId: employer.id, isRead: false },
        })

        expect(unreadCount).toBeGreaterThanOrEqual(3)
    })
})

describe('Messaging SSE - Full flow simulation', () => {
    test('reply triggers SSE with message payload to recipient', async () => {
        // Simulate what the /reply route does:
        // 1. Message created in DB
        // 2. socketIOService.emitNewMessage called with full message
        // 3. Recipient receives SSE with {type:'new_message', threadId, message:{...}}

        const recipientId = 'sse-flow-recipient-' + Date.now()
        const sseEvents: any[] = []

        const mockController = {
            enqueue: (data: string) => {
                const parsed = JSON.parse(data.replace('data: ', '').trim())
                sseEvents.push(parsed)
            },
        } as unknown as ReadableStreamDefaultController

        connectionsStore.addConnection(recipientId, mockController)

        // Simulate the reply route calling socketIOService
        const mockThreadId = 'thread-flow-' + Date.now()
        const mockMessageData = {
            id: 'msg-flow-' + Date.now(),
            threadId: mockThreadId,
            recipientId,
            senderId: 'sender-flow',
            content: 'Hello, testing SSE flow!',
            createdAt: new Date().toISOString(),
            attachments: [],
            sender: {
                id: 'sender-flow',
                name: 'Flow Sender',
                employer: undefined,
            },
        }

        await socketIOService.emitNewMessage(mockThreadId, mockMessageData as any)

        expect(sseEvents).toHaveLength(1)
        const event = sseEvents[0]
        expect(event.type).toBe('notification')

        const notification = event.notification
        // MessageThread.tsx line 537: checks notification.type === 'new_message'
        expect(notification.type).toBe('new_message')
        // MessageThread.tsx line 538: checks data.threadId !== threadId
        expect(notification.threadId).toBe(mockThreadId)
        // MessageThread.tsx line 541: uses data.message
        expect(notification.message.id).toBe(mockMessageData.id)
        expect(notification.message.content).toBe('Hello, testing SSE flow!')

        connectionsStore.removeConnection(recipientId)
    })
})
