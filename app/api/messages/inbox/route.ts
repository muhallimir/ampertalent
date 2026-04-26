import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

function getPublicProfilePictureUrl(url: string | null | undefined): string | undefined {
    if (!url) return undefined
    if (url.startsWith('http')) return url
    return `${SUPABASE_URL}/storage/v1/object/public/profile-pictures/${url}`
}

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser || !currentUser?.profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
        const offset = parseInt(searchParams.get('offset') || '0')

        const threads = await db.messageThread.findMany({
            where: { participants: { has: currentUser.profile.id } },
            select: { id: true, participants: true, lastMessageAt: true },
            orderBy: { lastMessageAt: 'desc' },
            take: limit,
            skip: offset,
        })

        if (threads.length === 0) {
            return NextResponse.json({
                success: true,
                messages: [],
                pagination: { total: 0, limit, offset, hasMore: false },
                unreadCount: 0,
            })
        }

        const threadIds = threads.map(t => t.id)

        const [totalCount, unreadCount, latestMessagesRaw] = await Promise.all([
            db.messageThread.count({ where: { participants: { has: currentUser.profile.id } } }),
            db.message.count({ where: { recipientId: currentUser.profile.id, isRead: false } }),
            (async () => {
                const placeholders = threadIds.map((_, i) => `$${i + 1}`).join(', ')
                const query = `
                    SELECT DISTINCT ON ("thread_id")
                        id,
                        "thread_id" as "threadId",
                        "sender_id" as "senderId",
                        "recipient_id" as "recipientId",
                        content,
                        "is_read" as "isRead",
                        "created_at" as "createdAt",
                        "application_id" as "applicationId"
                    FROM "messages"
                    WHERE "thread_id" IN (${placeholders})
                    ORDER BY "thread_id", "created_at" DESC
                `
                return db.$queryRawUnsafe<Array<{
                    id: string; threadId: string; senderId: string; recipientId: string
                    content: string; isRead: boolean; createdAt: Date; applicationId: string | null
                }>>(query, ...threadIds)
            })(),
        ])

        const latestMessages = latestMessagesRaw.filter(Boolean)
        const latestMessageByThread = new Map<string, any>()
        latestMessages.forEach(msg => { msg.threadId && latestMessageByThread.set(msg.threadId, msg) })

        const uniqueParticipantIds = new Set<string>()
        const uniqueApplicationIds = new Set<string>()

        threads.forEach(thread => {
            thread.participants.forEach(id => { if (id !== currentUser.profile.id) uniqueParticipantIds.add(id) })
        })
        Array.from(latestMessageByThread.values()).forEach(msg => {
            if (msg.senderId) uniqueParticipantIds.add(msg.senderId)
            if (msg.applicationId) uniqueApplicationIds.add(msg.applicationId)
        })

        const [participants, applications] = await Promise.all([
            db.userProfile.findMany({
                where: { id: { in: Array.from(uniqueParticipantIds) } },
                select: {
                    id: true, name: true, firstName: true, lastName: true, profilePictureUrl: true,
                    employer: { select: { companyName: true } },
                },
            }),
            uniqueApplicationIds.size > 0
                ? db.application.findMany({
                    where: { id: { in: Array.from(uniqueApplicationIds) } },
                    select: { id: true, job: { select: { id: true, title: true, employer: { select: { companyName: true } } } } },
                })
                : Promise.resolve([]),
        ])

        const participantMap = new Map(participants.map(p => [p.id, p]))
        const applicationMap = new Map(applications.map(a => [a.id, a]))

        const uniqueProfilePictures = new Set<string>()
        participants.forEach(p => { if (p.profilePictureUrl) uniqueProfilePictures.add(p.profilePictureUrl) })

        const profilePictureUrlMap = new Map(
            Array.from(uniqueProfilePictures).map(url => [url, getPublicProfilePictureUrl(url)] as const)
        )

        const messages = threads.map(thread => {
            const latestMessage = latestMessageByThread.get(thread.id)
            if (!latestMessage) return null

            const otherParticipantId = thread.participants.find(id => id !== currentUser.profile.id)
            const otherParticipant = otherParticipantId ? participantMap.get(otherParticipantId) : null
            const sender = participantMap.get(latestMessage.senderId)

            if (!sender) return null

            const application = latestMessage.applicationId ? applicationMap.get(latestMessage.applicationId) : undefined

            return {
                id: latestMessage.id,
                content: latestMessage.content.length > 100
                    ? latestMessage.content.substring(0, 100) + '...'
                    : latestMessage.content,
                isRead: latestMessage.recipientId === currentUser.profile.id ? latestMessage.isRead : true,
                createdAt: latestMessage.createdAt,
                sender: {
                    id: sender.id,
                    name: sender.name || `${sender.firstName || ''} ${sender.lastName || ''}`.trim(),
                    firstName: sender.firstName || undefined,
                    lastName: sender.lastName || undefined,
                    profilePictureUrl: sender.profilePictureUrl || undefined,
                    employer: sender.employer ? { companyName: sender.employer.companyName } : undefined,
                },
                otherParticipant: otherParticipant ? {
                    id: otherParticipant.id,
                    name: otherParticipant.name || `${otherParticipant.firstName || ''} ${otherParticipant.lastName || ''}`.trim(),
                    firstName: otherParticipant.firstName || undefined,
                    lastName: otherParticipant.lastName || undefined,
                    profilePictureUrl: otherParticipant.profilePictureUrl || undefined,
                    presignedProfilePictureUrl: otherParticipant.profilePictureUrl
                        ? profilePictureUrlMap.get(otherParticipant.profilePictureUrl) || undefined
                        : undefined,
                    employer: otherParticipant.employer ? { companyName: otherParticipant.employer.companyName } : undefined,
                } : null,
                application: application ? {
                    id: application.id,
                    job: { id: application.job?.id, title: application.job?.title, companyName: application.job?.employer?.companyName || '' },
                } : undefined,
                threadId: thread.id,
            }
        }).filter(Boolean)

        return NextResponse.json({
            success: true,
            messages,
            pagination: { total: totalCount, limit, offset, hasMore: offset + limit < totalCount },
            unreadCount,
        })
    } catch (error) {
        console.error('Error fetching inbox:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
