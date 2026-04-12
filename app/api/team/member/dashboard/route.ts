import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const currentUser = await getCurrentUser()
    if (!currentUser?.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get companyName from query parameters
    const { searchParams } = new URL(request.url)
    const companyName = searchParams.get('companyName')

    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    // Find the employer by company name (URL-friendly)
    const employers = await db.employer.findMany({
      where: {
        companyName: {
          contains: companyName.replace(/-/g, ' '),
          mode: 'insensitive'
        }
      },
      select: {
        userId: true,
        companyName: true,
        companyDescription: true,
        companyLogoUrl: true
      }
    })

    if (employers.length === 0) {
      return NextResponse.json({ error: 'Employer not found' }, { status: 404 })
    }

    // Try to find exact match first, then fallback to first result
    let employer = employers.find(emp => 
      emp.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-') === companyName
    )
    
    if (!employer) {
      employer = employers[0]
    }

    // Find the team member record for this user and employer
    const teamMember = await db.teamMember.findFirst({
      where: {
        userId: currentUser.profile.id,
        employerId: employer.userId
      },
      include: {
        employer: {
          select: {
            companyName: true,
            companyDescription: true,
            companyLogoUrl: true
          }
        }
      }
    })

    if (!teamMember) {
      return NextResponse.json({ error: 'Team membership not found' }, { status: 404 })
    }

    // Find other pending invitations for this user
    const pendingInvitations = await db.teamMember.findMany({
      where: {
        userId: currentUser.profile.id,
        status: 'pending',
        NOT: {
          id: teamMember.id
        }
      },
      include: {
        employer: {
          select: {
            companyName: true,
            companyDescription: true,
            companyLogoUrl: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      teamMember: {
        id: teamMember.id,
        employerId: teamMember.employerId,
        email: teamMember.email,
        name: teamMember.name,
        role: teamMember.role,
        status: teamMember.status,
        joinedAt: teamMember.joinedAt,
        employer: {
          companyName: teamMember.employer.companyName,
          companyDescription: teamMember.employer.companyDescription,
          companyLogoUrl: teamMember.employer.companyLogoUrl
        }
      },
      pendingInvitations: pendingInvitations.map(inv => ({
        id: inv.id,
        employerId: inv.employerId,
        email: inv.email,
        name: inv.name,
        role: inv.role,
        status: inv.status,
        joinedAt: inv.joinedAt,
        employer: {
          companyName: inv.employer.companyName,
          companyDescription: inv.employer.companyDescription,
          companyLogoUrl: inv.employer.companyLogoUrl
        }
      }))
    })

  } catch (error) {
    console.error('Error fetching team member dashboard data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
