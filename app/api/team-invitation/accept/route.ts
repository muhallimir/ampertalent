import { NextResponse } from 'next/server'
import { markTeamInvitationAsAccepted } from '@/lib/team-invitations'

interface AcceptInvitationRequest {
  invitationToken: string
}

export async function POST(request: Request) {
  try {
    const body: AcceptInvitationRequest = await request.json()
    const { invitationToken } = body

    if (!invitationToken) {
      return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 })
    }

    const updatedInvitation = await markTeamInvitationAsAccepted(invitationToken)

    return NextResponse.json({
      success: true,
      message: 'Invitation marked as accepted',
      acceptedAt: updatedInvitation.acceptedAt
    })
  } catch (error) {
    console.error('Error accepting team invitation:', error)
    return NextResponse.json(
      { error: 'Failed to mark invitation as accepted' },
      { status: 500 }
    )
  }
}
