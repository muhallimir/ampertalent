import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { S3Service } from '@/lib/s3'
import { presignedUrlCache } from '@/lib/presigned-url-cache'
import { createClient } from '@supabase/supabase-js'

const PAGE_SIZE = 20

// Supabase public URL helper - profile-pictures bucket is public, no signing needed
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

function getSupabasePublicUrl(storedUrl: string, bucket: string): string {
    if (!storedUrl) return storedUrl
    // If already a full URL, return as-is (it's already a public Supabase URL)
    if (storedUrl.startsWith('http')) return storedUrl
    // Build public URL from storage key
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${storedUrl}`
}

// For attachments (private bucket 'attachments'), still use signed URLs
async function generateSignedAttachmentUrl(s3Key: string): Promise<string | null> {
    if (!s3Key) return null
    const cached = presignedUrlCache.get(s3Key)
    if (cached) return cached

    try {
        const presignedUrl = await S3Service.generatePresignedDownloadUrl('attachments', s3Key, 24 * 60 * 60)
        presignedUrlCache.set(s3Key, presignedUrl, 23 * 60 * 60)
        return presignedUrl
    } catch (error) {
        console.error('Error generating signed URL:', error)
        return null
    }
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ threadId: string }> }
) {
    try {
        const currentUser = await getCurrentUser(req)
        if (!currentUser?.clerkUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { threadId } = await params
        const { searchParams } = new URL(req.url)
        const cursorISO = searchParams.get('cursor')

        const thread = await db.messageThread.findUnique({
            where: { id: threadId },
            select: { id: true, participants: true, lastMessageAt: true },
        })

        if (!thread) {
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 })
        }

        if (!thread.participants.includes(currentUser.profile.id)) {
            return NextResponse.json({ error: 'You do not have access to this thread' }, { status: 403 })
        }

        const [participantDetails, messagesRaw] = await Promise.all([
            db.userProfile.findMany({
                where: { id: { in: thread.participants } },
                select: {
                    id: true, clerkUserId: true, name: true, firstName: true, lastName: true,
                    profilePictureUrl: true, employer: { select: { companyName: true } },
                },
            }),
            db.message.findMany({
                where: {
                    threadId,
                    ...(cursorISO ? { createdAt: { lt: new Date(cursorISO) } } : {}),
                },
                take: PAGE_SIZE,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true, senderId: true, recipientId: true, content: true,
                    isRead: true, deliveryStatus: true, createdAt: true, applicationId: true, jobId: true,
                },
            }),
        ])

        const senderMap = new Map(participantDetails.map(p => [p.id, p]))

        const messageIds = messagesRaw.map(m => m.id)
        const attachmentsMap = new Map<string, any[]>()

        if (messageIds.length > 0) {
            const attachments = await db.messageAttachment.findMany({
                where: { messageId: { in: messageIds } },
                select: { id: true, messageId: true, fileName: true, fileUrl: true, fileType: true, fileSize: true, mimeType: true },
            })
            attachments.forEach(att => {
                if (!attachmentsMap.has(att.messageId)) attachmentsMap.set(att.messageId, [])
                attachmentsMap.get(att.messageId)!.push(att)
            })
        }

        const uniqueApplicationIds = [...new Set(messagesRaw.filter(m => m.applicationId).map(m => m.applicationId!))]
        const uniqueJobIds = [...new Set(messagesRaw.filter(m => m.jobId).map(m => m.jobId!))]

        const [applicationsMap, jobsMap] = await Promise.all([
            uniqueApplicationIds.length > 0
                ? db.application.findMany({
                    where: { id: { in: uniqueApplicationIds } },
                    select: {
                        id: true, interviewScheduledAt: true, interviewStage: true, interviewCompletedAt: true,
                        job: { select: { id: true, title: true, employer: { select: { companyName: true } } } },
                    },
                }).then(apps => new Map(apps.map(a => [a.id, a])))
                : Promise.resolve(new Map()),
            uniqueJobIds.length > 0
                ? db.job.findMany({
                    where: { id: { in: uniqueJobIds } },
                    select: {
                        id: true, title: true,
                        employer: { select: { companyName: true, user: { select: { name: true } } } },
                    },
                }).then(jobs => new Map(jobs.map(j => [j.id, j])))
                : Promise.resolve(new Map()),
        ])

        const uniqueProfilePictures = new Set<string>()
        const uniqueAttachmentUrls = new Set<string>()
        participantDetails.forEach(p => { if (p.profilePictureUrl) uniqueProfilePictures.add(p.profilePictureUrl) })
        Array.from(attachmentsMap.values()).flat().forEach(att => uniqueAttachmentUrls.add(att.fileUrl))

        // Profile pictures: bucket is now public, use public URLs directly
        const profilePictureUrlMap = new Map<string, string>()
        for (const url of uniqueProfilePictures) {
            profilePictureUrlMap.set(url, getSupabasePublicUrl(url, 'profile-pictures'))
        }

        // Attachments: private bucket, use signed URLs
        const attachmentUrlMap = await Promise.all(
            Array.from(uniqueAttachmentUrls).map(async url => {
                const signed = await generateSignedAttachmentUrl(url)
                return [url, signed || url] as const
            })
        ).then(results => new Map(results))

        const participantDetailsWithPresigned = participantDetails.map(p => ({
            id: p.id, clerkUserId: p.clerkUserId,
            name: p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
            firstName: p.firstName || undefined, lastName: p.lastName || undefined,
            profilePictureUrl: p.profilePictureUrl || undefined,
            presignedProfilePictureUrl: p.profilePictureUrl ? profilePictureUrlMap.get(p.profilePictureUrl) || undefined : undefined,
            employer: p.employer ? { companyName: p.employer.companyName } : undefined,
        }))

        const allPresignedMessages = messagesRaw.map(m => {
            const sender = senderMap.get(m.senderId)
            const messageAttachments = attachmentsMap.get(m.id) || []
            const application = m.applicationId ? applicationsMap.get(m.applicationId) : undefined
            const job = m.jobId ? jobsMap.get(m.jobId) : undefined

            return {
                id: m.id, threadId, senderId: m.senderId, recipientId: m.recipientId,
                content: m.content, isRead: m.isRead, deliveryStatus: m.deliveryStatus,
                createdAt: m.createdAt.toISOString(),
                attachments: messageAttachments.map(att => ({
                    id: att.id, fileName: att.fileName,
                    fileUrl: attachmentUrlMap.get(att.fileUrl) || att.fileUrl,
                    fileType: att.fileType, fileSize: att.fileSize, mimeType: att.mimeType,
                })),
                sender: {
                    id: sender?.id, name: sender?.name || `${sender?.firstName || ''} ${sender?.lastName || ''}`.trim(),
                    firstName: sender?.firstName || undefined, lastName: sender?.lastName || undefined,
                    profilePictureUrl: sender?.profilePictureUrl || undefined,
                    presignedProfilePictureUrl: sender?.profilePictureUrl ? profilePictureUrlMap.get(sender.profilePictureUrl) || undefined : undefined,
                    employer: sender?.employer ? { companyName: sender.employer.companyName } : undefined,
                },
                application: application ? {
                    id: application.id,
                    job: { id: application.job?.id, title: application.job?.title, employer: { companyName: application.job?.employer?.companyName ?? '' } },
                    interviewScheduledAt: application.interviewScheduledAt || undefined,
                    interviewStage: application.interviewStage || undefined,
                    interviewCompletedAt: application.interviewCompletedAt || undefined,
                } : undefined,
                job: job ? {
                    id: job.id, title: job.title,
                    employer: { companyName: job.employer?.companyName ?? '', user: { name: job.employer?.user?.name || '' } },
                } : undefined,
            }
        })

        const messagesAsc = allPresignedMessages.reverse()
        const oldest = messagesAsc[0]
        const nextCursor = oldest ? oldest.createdAt : null

        return NextResponse.json({
            success: true,
            thread: {
                id: thread.id, participants: thread.participants,
                lastMessageAt: thread.lastMessageAt.toISOString(),
                participantDetails: participantDetailsWithPresigned,
            },
            messages: messagesAsc,
            nextCursor,
            pageSize: PAGE_SIZE,
        })
    } catch (err: any) {
        console.error('💥 [thread GET] error:', err)
        return NextResponse.json({ error: 'Internal server error', debug: err?.message }, { status: 500 })
    }
}
