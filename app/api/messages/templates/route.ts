import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const templates = await db.messageTemplate.findMany({
            where: { userId: currentUser.profile.id },
            orderBy: [{ isDefault: 'desc' }, { usageCount: 'desc' }, { createdAt: 'desc' }],
        })

        const custom = templates.filter(t => !t.isDefault).map(t => ({
            id: t.id, name: t.name, category: t.category, content: t.content,
            isDefault: t.isDefault, usageCount: t.usageCount, createdAt: t.createdAt,
        }))

        const defaultTemplates = templates.filter(t => t.isDefault).map(t => ({
            id: t.id, name: t.name, category: t.category, content: t.content,
            isDefault: t.isDefault, usageCount: t.usageCount, createdAt: t.createdAt,
        }))

        return NextResponse.json({ custom, default: defaultTemplates })
    } catch (error) {
        console.error('Error fetching templates:', error)
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
        const { name, category, content, isDefault, action } = body

        if (action === 'restore') {
            const defaultTemplatesConfig = [
                { name: 'Interview Invitation', category: 'Interview', content: 'Hi [Name],\n\nThank you for your application! We were impressed with your qualifications and would like to invite you for an interview.\n\nWould you be available for a [virtual/in-person] interview on [date/time]?\n\nLooking forward to speaking with you!\n\nBest regards' },
                { name: 'Application Received', category: 'General', content: 'Hi [Name],\n\nThank you for applying for the [Position] role. We have received your application and will review it carefully.\n\nWe will be in touch soon regarding next steps.\n\nBest regards' },
                { name: 'Request Additional Info', category: 'Follow-up', content: 'Hi [Name],\n\nThank you for your interest in the [Position] role. We would like to learn more about your experience.\n\nCould you please provide more details about [specific area]?\n\nThank you!' },
            ]

            const existingDefaults = await db.messageTemplate.findMany({
                where: { userId: currentUser.profile.id, isDefault: true },
            })

            const isUnmodified = existingDefaults.length === defaultTemplatesConfig.length &&
                existingDefaults.every(existing => {
                    const defaultConfig = defaultTemplatesConfig.find(def => def.name === existing.name)
                    return defaultConfig && existing.category === defaultConfig.category && existing.content === defaultConfig.content
                })

            if (isUnmodified) {
                return NextResponse.json({ success: true, message: 'Default templates are already up to date', count: existingDefaults.length, unchanged: true })
            }

            await db.messageTemplate.deleteMany({ where: { userId: currentUser.profile.id } })

            const created = await db.messageTemplate.createMany({
                data: defaultTemplatesConfig.map(t => ({ userId: currentUser.profile.id, name: t.name, category: t.category, content: t.content, isDefault: true })),
            })

            return NextResponse.json({ success: true, message: 'Default templates restored successfully', count: created.count, unchanged: false })
        }

        if (!name || !content) {
            return NextResponse.json({ error: 'Name and content are required' }, { status: 400 })
        }

        if (isDefault) {
            await db.messageTemplate.updateMany({ where: { userId: currentUser.profile.id }, data: { isDefault: false } })
        }

        const template = await db.messageTemplate.create({
            data: { userId: currentUser.profile.id, name: name.trim(), category: category || 'general', content: content.trim(), isDefault: isDefault || false },
        })

        return NextResponse.json({
            success: true,
            template: { id: template.id, name: template.name, category: template.category, content: template.content, isDefault: template.isDefault, usageCount: template.usageCount, createdAt: template.createdAt },
        })
    } catch (error) {
        console.error('Error creating template:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
