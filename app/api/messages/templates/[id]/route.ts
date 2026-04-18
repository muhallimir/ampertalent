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
        const { name, category, content, isDefault } = body

        const existingTemplate = await db.messageTemplate.findFirst({ where: { id, userId: currentUser.profile.id } })
        if (!existingTemplate) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 })
        }

        if (isDefault) {
            await db.messageTemplate.updateMany({ where: { userId: currentUser.profile.id, id: { not: id } }, data: { isDefault: false } })
        }

        const template = await db.messageTemplate.update({
            where: { id },
            data: { name: name?.trim(), category, content: content?.trim(), isDefault },
        })

        return NextResponse.json({
            success: true,
            template: { id: template.id, name: template.name, category: template.category, content: template.content, isDefault: template.isDefault, usageCount: template.usageCount, createdAt: template.createdAt },
        })
    } catch (error) {
        console.error('Error updating template:', error)
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

        const existingTemplate = await db.messageTemplate.findFirst({ where: { id, userId: currentUser.profile.id } })
        if (!existingTemplate) {
            return NextResponse.json({ error: 'Template not found' }, { status: 404 })
        }

        await db.messageTemplate.delete({ where: { id } })

        return NextResponse.json({ success: true, message: 'Template deleted successfully' })
    } catch (error) {
        console.error('Error deleting template:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await params

        const template = await db.messageTemplate.update({
            where: { id, userId: currentUser.profile.id },
            data: { usageCount: { increment: 1 } },
        })

        return NextResponse.json({ success: true, template: { id: template.id, usageCount: template.usageCount } })
    } catch (error) {
        console.error('Error updating template usage:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
