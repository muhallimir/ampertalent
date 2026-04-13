import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a team member
    if (currentUser.profile.role !== 'team_member') {
      return NextResponse.json({ error: 'User is not a team member' }, { status: 400 })
    }

    // Get the most recent team membership for this user
    const teamMember = await db.teamMember.findFirst({
      where: {
        userId: currentUser.profile.id,
        status: { in: ['active', 'pending'] }
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        employer: {
          select: {
            companyName: true
          }
        }
      }
    })

    if (!teamMember || !teamMember.employer) {
      return NextResponse.json({ error: 'No team membership found' }, { status: 404 })
    }

    // Create URL-friendly company name
    const companyNameSlug = teamMember.employer.companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return NextResponse.json({
      success: true,
      companyNameSlug: companyNameSlug,
      companyName: teamMember.employer.companyName,
      teamMemberId: teamMember.id,
      employerId: teamMember.employerId
    })

  } catch (error) {
    console.error('Error fetching team member company info:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
