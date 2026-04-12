import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { id } = await params

    // Verify admin access
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const signupId = id

    // Check if the pending signup exists
    const pendingSignup = await db.pendingSignup.findUnique({
      where: { id: signupId }
    })

    if (!pendingSignup) {
      return NextResponse.json({ error: 'Pending signup not found' }, { status: 404 })
    }

    // Delete the pending signup
    await db.pendingSignup.delete({
      where: { id: signupId }
    })

    // Log the admin action
    await db.adminActionLog.create({
      data: {
        adminId: currentUser.profile.id,
        actionType: 'pending_signup_deleted',
        targetEntity: 'pending_signup',
        targetId: signupId,
        details: {
          email: pendingSignup.email,
          selectedPlan: pendingSignup.selectedPlan,
          deletedBy: currentUser.profile.name || currentUser.clerkUser.firstName
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Pending signup deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting pending signup:', error)
    return NextResponse.json(
      { error: 'Failed to delete pending signup' },
      { status: 500 }
    )
  }
}