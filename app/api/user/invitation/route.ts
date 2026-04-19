import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
    try {
        const currentUser = await getCurrentUser(request)
        if (!currentUser?.clerkUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = currentUser.clerkUser
        const userEmail = user.emailAddresses[0]?.emailAddress

        if (!userEmail) {
            return NextResponse.json({ error: 'User email not found' }, { status: 400 })
        }

        // Check if user already has a profile - if so, skip invitation check for performance
        if (currentUser.profile) {
            return NextResponse.json({ invitation: null })
        }

        // Only check for invitations if user doesn't have a profile yet
        const userInvitation = await db.userInvitation.findFirst({
            where: {
                email: userEmail.toLowerCase(),
                acceptedAt: null,
                expiresAt: {
                    gte: new Date()
                }
            },
            include: {
                inviter: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        if (!userInvitation) {
            return NextResponse.json({ invitation: null })
        }

        return NextResponse.json({
            invitation: {
                id: userInvitation.id,
                email: userInvitation.email,
                role: userInvitation.role,
                fullName: userInvitation.fullName,
                invitedByName: userInvitation.inviter?.name,
                expiresAt: userInvitation.expiresAt,
                acceptedAt: userInvitation.acceptedAt
            }
        })
    } catch (error) {
        console.error('Error checking user invitation:', error)
        return NextResponse.json(
            { error: 'Failed to check user invitation' },
            { status: 500 }
        )
    }
}
