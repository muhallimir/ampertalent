import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { id } = await params

    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is an employer
    if (currentUser.profile.role !== 'employer') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const pendingJobId = id

    console.log('📋 Fetching pending job post:', pendingJobId, 'for user:', currentUser.clerkUser.id)

    // Find the pending job post and ensure it belongs to the current user
    const pendingJob = await db.pendingJobPost.findUnique({
      where: { id: pendingJobId }
    })

    if (!pendingJob) {
      return NextResponse.json(
        { error: 'Pending job post not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (pendingJob.clerkUserId !== currentUser.clerkUser.id) {
      return NextResponse.json(
        { error: 'Access denied - You can only access your own pending job posts' },
        { status: 403 }
      )
    }

    console.log('✅ Successfully fetched pending job post:', pendingJobId)

    // Parse job data from JSON string
    let jobData
    try {
      jobData = typeof pendingJob.jobData === 'string'
        ? JSON.parse(pendingJob.jobData)
        : pendingJob.jobData
    } catch (error) {
      console.error('Error parsing pending job data:', error)
      return NextResponse.json(
        { error: 'Invalid job data format' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      pendingJob: {
        id: pendingJob.id,
        jobData: jobData,
        selectedPackage: pendingJob.selectedPackage,
        sessionToken: pendingJob.sessionToken,
        createdAt: pendingJob.createdAt,
        expiresAt: pendingJob.expiresAt
      }
    })

  } catch (error) {
    console.error('Error fetching pending job post:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { id } = await params

    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is an employer
    if (currentUser.profile.role !== 'employer') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const pendingJobId = id

    console.log('🗑️ Deleting pending job post:', pendingJobId, 'for user:', currentUser.clerkUser.id)

    // Find the pending job post to ensure it belongs to the current user
    const pendingJob = await db.pendingJobPost.findUnique({
      where: { id: pendingJobId }
    })

    if (!pendingJob) {
      return NextResponse.json(
        { error: 'Pending job post not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (pendingJob.clerkUserId !== currentUser.clerkUser.id) {
      return NextResponse.json(
        { error: 'Access denied - You can only delete your own pending job posts' },
        { status: 403 }
      )
    }

    // Delete the pending job post
    await db.pendingJobPost.delete({
      where: { id: pendingJobId }
    })

    console.log('✅ Successfully deleted pending job post:', pendingJobId)

    return NextResponse.json({
      success: true,
      message: 'Pending job post deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting pending job post:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { id } = await params

    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is an employer
    if (currentUser.profile.role !== 'employer') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const pendingJobId = id
    const body = await request.json()
    const { selectedPackage } = body

    if (!selectedPackage) {
      return NextResponse.json(
        { error: 'Missing required field: selectedPackage' },
        { status: 400 }
      )
    }

    console.log('📝 Updating pending job post:', pendingJobId, 'with package:', selectedPackage)

    // Find the pending job post to ensure it belongs to the current user
    const pendingJob = await db.pendingJobPost.findUnique({
      where: { id: pendingJobId }
    })

    if (!pendingJob) {
      return NextResponse.json(
        { error: 'Pending job post not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (pendingJob.clerkUserId !== currentUser.clerkUser.id) {
      return NextResponse.json(
        { error: 'Access denied - You can only update your own pending job posts' },
        { status: 403 }
      )
    }

    // Update the pending job post with selected package
    const updatedPendingJob = await db.pendingJobPost.update({
      where: { id: pendingJobId },
      data: { selectedPackage }
    })

    console.log('✅ Successfully updated pending job post:', pendingJobId, 'with package:', selectedPackage)

    return NextResponse.json({
      success: true,
      message: 'Pending job post updated successfully',
      pendingJob: {
        id: updatedPendingJob.id,
        selectedPackage: updatedPendingJob.selectedPackage
      }
    })

  } catch (error) {
    console.error('Error updating pending job post:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}