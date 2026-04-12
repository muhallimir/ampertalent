import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params object in Next.js 16
    const resolvedParams = await params
    const teamMemberId = resolvedParams.id

    if (!teamMemberId) {
      return NextResponse.json({ error: 'Team member ID is required' }, { status: 400 })
    }

    const teamMember = await db.teamMember.findUnique({
      where: { id: teamMemberId },
      include: {
        employer: {
          select: {
            companyName: true,
            userId: true
          }
        }
      }
    })

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      teamMember: teamMember
    })

  } catch (error) {
    console.error('Error fetching team member:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
