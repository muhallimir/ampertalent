import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const drafts = await db.messageDraft.findMany({
            where: { userId: currentUser.profile.id },
            orderBy: { lastSavedAt: 'desc' },
        })

        return NextResponse.json({
            success: true,
            drafts: drafts.map(draft => ({
                id: draft.id,
                recipientId: draft.recipientId,
                threadId: draft.threadId,
                content: draft.content,
                attachments: draft.attachments,
                lastSavedAt: draft.lastSavedAt,
            })),
        })
    } catch (error) {
        console.error('Error fetching drafts:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { recipientId, threadId, content, attachments } = body

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 })
        }

        if (content.length > 5000) {
            return NextResponse.json({ error: 'Content must be 5000 characters or less' }, { status: 400 })
        }

        const existingDraft = await db.messageDraft.findFirst({
            where: { userId: currentUser.profile.id, threadId: threadId || null },
        })

        if (existingDraft) {
            const updatedDraft = await db.messageDraft.update({
                where: { id: existingDraft.id },
                data: { recipientId, content: content.trim(), attachments, lastSavedAt: new Date() },
            })
            return NextResponse.json({
                success: true,
                draft: { id: updatedDraft.id, recipientId: updatedDraft.recipientId, threadId: updatedDraft.threadId, content: updatedDraft.content, attachments: updatedDraft.attachments, lastSavedAt: updatedDraft.lastSavedAt },
            })
        } else {
            const newDraft = await db.messageDraft.create({
                data: { userId: currentUser.profile.id, recipientId, threadId, content: content.trim(), attachments },
            })
            return NextResponse.json({
                success: true,
                draft: { id: newDraft.id, recipientId: newDraft.recipientId, threadId: newDraft.threadId, content: newDraft.content, attachments: newDraft.attachments, lastSavedAt: newDraft.lastSavedAt },
            })
        }
    } catch (error) {
        console.error('Error saving draft:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
