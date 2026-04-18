import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser || !currentUser?.profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const preferences = await db.userProfile.findUnique({
            where: { id: currentUser.profile.id },
            select: { allowDirectMessages: true, messageNotificationEmail: true, messageNotificationInApp: true },
        })

        if (!preferences) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        return NextResponse.json({ success: true, preferences })
    } catch (error) {
        console.error('Error fetching preferences:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser || !currentUser?.profile) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { allowDirectMessages, messageNotificationEmail, messageNotificationInApp } = body

        if (typeof allowDirectMessages !== 'boolean' || typeof messageNotificationEmail !== 'boolean' || typeof messageNotificationInApp !== 'boolean') {
            return NextResponse.json({ error: 'All preference fields must be boolean values' }, { status: 400 })
        }

        const updatedPreferences = await db.userProfile.update({
            where: { id: currentUser.profile.id },
            data: { allowDirectMessages, messageNotificationEmail, messageNotificationInApp },
            select: { allowDirectMessages: true, messageNotificationEmail: true, messageNotificationInApp: true },
        })

        return NextResponse.json({ success: true, preferences: updatedPreferences })
    } catch (error) {
        console.error('Error updating preferences:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
