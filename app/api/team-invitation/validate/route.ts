import { NextResponse } from 'next/server'
import { validateTeamInvitationToken } from '@/lib/team-invitations'

interface ValidateInvitationRequest {
  invitationToken: string
}

export async function POST(request: Request) {
  try {
    const body: ValidateInvitationRequest = await request.json()
    const { invitationToken } = body

    if (!invitationToken) {
      return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 })
    }

    const teamInvitation = await validateTeamInvitationToken(invitationToken)

    if (!teamInvitation) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      invitationId: teamInvitation.id,
      employerId: teamInvitation.employerId,
      email: teamInvitation.email,
      role: teamInvitation.role,
      employerName: teamInvitation.employer?.companyName,
      companyLogo: teamInvitation.employer?.companyLogoUrl,
      invitedByName: teamInvitation.inviter?.name,
      expiresAt: teamInvitation.expiresAt,
      acceptedAt: teamInvitation.acceptedAt,
      message: teamInvitation.message
    })
  } catch (error) {
    console.error('Error validating team invitation:', error)
    return NextResponse.json(
      { error: 'Failed to validate invitation' },
      { status: 500 }
    )
  }
}
