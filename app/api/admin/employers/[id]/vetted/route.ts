import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { id } = await params

    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { isVetted } = await request.json()
    const employerId = id

    // Update the employer's vetted status
    const updatedEmployer = await db.employer.update({
      where: { userId: employerId },
      data: {
        isVetted,
        vettedAt: isVetted ? new Date() : null,
        vettedBy: isVetted ? currentUser.clerkUser.emailAddresses[0]?.emailAddress : null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    })

    // Log the action
    await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: isVetted ? 'employer_vetted' : 'employer_unvetted',
        targetEntity: 'employer',
        targetId: employerId,
        details: {
          employerName: updatedEmployer.companyName,
          employerEmail: updatedEmployer.user.email,
          previousStatus: !isVetted,
          newStatus: isVetted
        }
      }
    })

    return NextResponse.json({
      success: true,
      employer: updatedEmployer
    })

  } catch (error) {
    console.error('Error updating employer vetted status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}