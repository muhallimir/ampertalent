import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params
        const body = await request.json()
        const { recipientId, threadId, subject, content, attachments } = body

        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 })
        }

        if (content.length > 5000) {
            return NextResponse.json({ error: 'Content must be 5000 characters or less' }, { status: 400 })
        }

        const updatedDraft = await db.messageDraft.updateMany({
            where: { id, userId: currentUser.profile.id },
            data: { recipientId, threadId, content: content.trim(), attachments, lastSavedAt: new Date() },
        })

        if (updatedDraft.count === 0) {
            return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
        }

        const draft = await db.messageDraft.findUnique({ where: { id } })

        return NextResponse.json({
            success: true,
            draft: { id: draft!.id, recipientId: draft!.recipientId, threadId: draft!.threadId, content: draft!.content, attachments: draft!.attachments, lastSavedAt: draft!.lastSavedAt },
        })
    } catch (error) {
        console.error('Error updating draft:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const deletedDraft = await db.messageDraft.deleteMany({
            where: { id, userId: currentUser.profile.id },
        })

        if (deletedDraft.count === 0) {
            return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, message: 'Draft deleted successfully' })
    } catch (error) {
        console.error('Error deleting draft:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
