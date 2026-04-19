import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { invitationId } = body

        if (!invitationId) {
            return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 })
        }

        const userInvitation = await db.userInvitation.findUnique({
            where: { id: invitationId },
            include: { inviter: true }
        })

        if (!userInvitation) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
        }

        if (userInvitation.role !== 'admin') {
            return NextResponse.json({ error: 'Invalid invitation role' }, { status: 400 })
        }

        if (userInvitation.expiresAt < new Date()) {
            return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
        }

        if (userInvitation.acceptedAt) {
            return NextResponse.json({ error: 'Invitation has already been accepted' }, { status: 400 })
        }

        const user = currentUser.clerkUser
        const userEmail = user.emailAddresses[0]?.emailAddress

        if (userEmail?.toLowerCase() !== userInvitation.email.toLowerCase()) {
            return NextResponse.json({ error: 'Email does not match invitation' }, { status: 400 })
        }

        // Create or update the user profile with admin role
        let userProfile = await db.userProfile.findUnique({
            where: { clerkUserId: user.id }
        })

        if (!userProfile) {
            const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || userEmail?.split('@')[0] || 'Admin User'
            const nameParts = name.split(' ')

            userProfile = await db.userProfile.create({
                data: {
                    clerkUserId: user.id,
                    role: 'admin',
                    name,
                    firstName: nameParts[0] || '',
                    lastName: nameParts.slice(1).join(' ') || '',
                    email: userEmail || null,
                    timezone: 'America/Chicago'
                }
            })
        } else if (userProfile.role !== 'admin') {
            userProfile = await db.userProfile.update({
                where: { id: userProfile.id },
                data: { role: 'admin' }
            })
        }

        await db.userInvitation.update({
            where: { id: invitationId },
            data: { acceptedAt: new Date() }
        })

        return NextResponse.json({ success: true, userProfile })
    } catch (error) {
        console.error('Error handling admin invitation:', error)
        return NextResponse.json(
            { error: 'Failed to process admin invitation' },
            { status: 500 }
        )
    }
}
