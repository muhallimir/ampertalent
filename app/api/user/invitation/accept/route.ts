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
            where: { id: invitationId }
        })

        if (!userInvitation) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
        }

        if (userInvitation.acceptedAt) {
            return NextResponse.json({ error: 'Invitation has already been accepted' }, { status: 400 })
        }

        const user = currentUser.clerkUser
        const userEmail = user.emailAddresses[0]?.emailAddress

        if (userEmail?.toLowerCase() !== userInvitation.email.toLowerCase()) {
            return NextResponse.json({ error: 'Email does not match invitation' }, { status: 400 })
        }

        await db.userInvitation.update({
            where: { id: invitationId },
            data: { acceptedAt: new Date() }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error accepting user invitation:', error)
        return NextResponse.json(
            { error: 'Failed to accept user invitation' },
            { status: 500 }
        )
    }
}
