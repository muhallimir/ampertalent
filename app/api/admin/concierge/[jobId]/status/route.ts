import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { ConciergeService } from '@/lib/concierge-service'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    // Await params for Next.js 16
    const { jobId } = await params

    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is an admin
    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { status, notes } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses = ['pending', 'discovery_call', 'job_optimization', 'candidate_screening', 'interviews', 'completed']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Get the concierge request first to get the request ID
    const conciergeRequest = await ConciergeService.getConciergeRequest(jobId)
    if (!conciergeRequest) {
      return NextResponse.json(
        { error: 'Concierge request not found' },
        { status: 404 }
      )
    }

    // Update the concierge request status
    const success = await ConciergeService.updateConciergeStatus(
      conciergeRequest.id,
      status,
      currentUser.profile.id,
      notes
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update concierge status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Concierge status updated successfully'
    })

  } catch (error) {
    console.error('Error updating concierge status:', error)
    return NextResponse.json(
      { error: 'Failed to update concierge status' },
      { status: 500 }
    )
  }
}