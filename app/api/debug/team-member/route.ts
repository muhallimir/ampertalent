import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamMemberId = searchParams.get('id')
    const email = searchParams.get('email')

    if (!teamMemberId && !email) {
      // Return all recent team members if no filters
      const teamMembers = await db.teamMember.findMany({
        take: 10,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          employer: {
            select: {
              companyName: true,
              userId: true
            }
          },
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        teamMembers: teamMembers,
        count: teamMembers.length
      })
    }

    let teamMembers
    if (teamMemberId) {
      const teamMember = await db.teamMember.findUnique({
        where: { id: teamMemberId },
        include: {
          employer: {
            select: {
              companyName: true,
              userId: true
            }
          },
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })
      teamMembers = teamMember ? [teamMember] : []
    } else {
      teamMembers = await db.teamMember.findMany({
        where: { 
          email: email ? email.toLowerCase() : undefined
        },
        include: {
          employer: {
            select: {
              companyName: true,
              userId: true
            }
          },
          user: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    }

    return NextResponse.json({
      success: true,
      teamMembers: teamMembers,
      count: teamMembers.length
    })

  } catch (error) {
    console.error('Error fetching team member info:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    )
  }
}
