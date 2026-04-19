import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface ValidateUserInvitationRequest {
    invitationToken: string
}

export async function POST(request: Request) {
    try {
        const body: ValidateUserInvitationRequest = await request.json()
        const { invitationToken } = body

        if (!invitationToken) {
            return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 })
        }

        const userInvitation = await db.userInvitation.findUnique({
            where: { invitationToken },
            include: {
                inviter: {
                    select: { name: true }
                }
            }
        })

        if (!userInvitation) {
            return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 400 })
        }

        if (userInvitation.expiresAt < new Date()) {
            return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            invitationId: userInvitation.id,
            email: userInvitation.email,
            role: userInvitation.role,
            fullName: userInvitation.fullName,
            invitedByName: userInvitation.inviter?.name,
            expiresAt: userInvitation.expiresAt,
            acceptedAt: userInvitation.acceptedAt,
            message: userInvitation.message
        })
    } catch (error) {
        console.error('Error validating user invitation:', error)
        return NextResponse.json(
            { error: 'Failed to validate invitation' },
            { status: 500 }
        )
    }
}
