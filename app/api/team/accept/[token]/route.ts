import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { clerkClient } from '@clerk/nextjs/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Await params for Next.js 16
    const { token } = await params

    if (!token) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 400 })
    }

    // Find the invitation
    const invitation = await db.teamInvitation.findFirst({
      where: {
        invitationToken: token,
        acceptedAt: null, // Not yet accepted
        expiresAt: {
          gt: new Date() // Not expired
        }
      },
      include: {
        employer: {
          select: {
            companyName: true,
            user: {
              select: {
                name: true
              }
            }
          }
        },
        inviter: {
          select: {
            name: true
          }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json({
        error: 'Invalid or expired invitation token'
      }, { status: 404 })
    }

    // Check if user is authenticated
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.profile) {
      // Check if there's a Clerk user for this email that needs to complete signup
      try {
        const client = await clerkClient()
        const clerkUsers = await client.users.getUserList({
          emailAddress: [invitation.email.toLowerCase()]
        })

        if (clerkUsers.data.length > 0) {
          const clerkUser = clerkUsers.data[0]
          // If user exists but hasn't completed profile, redirect to complete signup
          const emailVerified = clerkUser.emailAddresses.some(e => e.emailAddress.toLowerCase() === invitation.email.toLowerCase() && e.verification?.status === 'verified')
          if (!emailVerified) {
            const signupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/sign-up?email=${encodeURIComponent(invitation.email)}&token=${token}`
            return NextResponse.redirect(signupUrl)
          }
        }
      } catch (error) {
        console.error('Error checking Clerk user:', error)
      }

      // Redirect to login with return URL
      const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/sign-in?redirect_url=${encodeURIComponent(`/team/accept/${token}`)}`
      return NextResponse.redirect(loginUrl)
    }

    // Check if the invitation email matches the current user's email
    if (currentUser.profile.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json({
        error: 'This invitation is for a different email address'
      }, { status: 403 })
    }

    // Check if user is already an active team member (pending members can still accept)
    const existingActiveMember = await db.teamMember.findFirst({
      where: {
        employerId: invitation.employerId,
        userId: currentUser.profile.id,
        status: 'active'
      }
    })

    if (existingActiveMember) {
      return NextResponse.json({
        error: 'You are already a member of this team'
      }, { status: 409 })
    }

    // Accept the invitation
    await db.$transaction(async (tx) => {
      // Update the invitation as accepted
      await tx.teamInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() }
      })

      // Update the team member record
      await tx.teamMember.updateMany({
        where: {
          employerId: invitation.employerId,
          email: invitation.email.toLowerCase()
        },
        data: {
          userId: currentUser.profile.id,
          name: currentUser.profile.name,
          status: 'active',
          joinedAt: new Date()
        }
      })

      // Log the acceptance
      await tx.adminActionLog.create({
        data: {
          adminId: currentUser.profile.id,
          actionType: 'team_invitation_accepted',
          targetEntity: 'team_invitation',
          targetId: invitation.id,
          details: {
            email: invitation.email,
            role: invitation.role,
            employerId: invitation.employerId,
            companyName: invitation.employer.companyName,
            inviterName: invitation.inviter.name,
            acceptedBy: currentUser.profile.name
          }
        }
      })
    })

    // Redirect to employer dashboard (team members now have access)
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/employer/dashboard?welcome=true`
    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    console.error('Error accepting team invitation:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Await params for Next.js 16
    const { token } = await params

    if (!token) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 400 })
    }

    // Find the invitation
    const invitation = await db.teamInvitation.findFirst({
      where: {
        invitationToken: token,
        acceptedAt: null, // Not yet accepted
        expiresAt: {
          gt: new Date() // Not expired
        }
      },
      include: {
        employer: {
          select: {
            companyName: true,
            user: {
              select: {
                name: true
              }
            }
          }
        },
        inviter: {
          select: {
            name: true
          }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json({
        error: 'Invalid or expired invitation token'
      }, { status: 404 })
    }

    // Check if user is authenticated
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.profile) {
      return NextResponse.json({
        error: 'Authentication required'
      }, { status: 401 })
    }

    // Check if the invitation email matches the current user's email
    if (currentUser.profile.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json({
        error: 'This invitation is for a different email address'
      }, { status: 403 })
    }

    // Check if user is already an active team member (pending members can still accept)
    const existingActiveMember = await db.teamMember.findFirst({
      where: {
        employerId: invitation.employerId,
        userId: currentUser.profile.id,
        status: 'active'
      }
    })

    if (existingActiveMember) {
      return NextResponse.json({
        error: 'You are already a member of this team'
      }, { status: 409 })
    }

    // Accept the invitation
    await db.$transaction(async (tx) => {
      // Update the invitation as accepted
      await tx.teamInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() }
      })

      // Update the team member record
      await tx.teamMember.updateMany({
        where: {
          employerId: invitation.employerId,
          email: invitation.email.toLowerCase()
        },
        data: {
          userId: currentUser.profile.id,
          name: currentUser.profile.name,
          status: 'active',
          joinedAt: new Date()
        }
      })

      // Log the acceptance
      await tx.adminActionLog.create({
        data: {
          adminId: currentUser.profile.id,
          actionType: 'team_invitation_accepted',
          targetEntity: 'team_invitation',
          targetId: invitation.id,
          details: {
            email: invitation.email,
            role: invitation.role,
            employerId: invitation.employerId,
            companyName: invitation.employer.companyName,
            inviterName: invitation.inviter.name,
            acceptedBy: currentUser.profile.name
          }
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Team invitation accepted successfully',
      team: {
        companyName: invitation.employer.companyName,
        role: invitation.role,
        inviterName: invitation.inviter.name
      }
    })

  } catch (error) {
    console.error('Error accepting team invitation:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}