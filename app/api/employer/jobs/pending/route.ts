import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { jobData, selectedPackage } = await request.json()

    console.log('🔍 PENDING-JOB: Request received:', {
      jobData: jobData ? Object.keys(jobData) : null,
      selectedPackage
    })

    // Get current user from Clerk
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      console.error('❌ PENDING-JOB: No user found in Clerk')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ PENDING-JOB: User authenticated:', {
      userId: currentUser.clerkUser.id,
      email: currentUser.clerkUser.emailAddresses[0]?.emailAddress,
      emailVerified: currentUser.clerkUser.emailAddresses[0]?.verification?.status === 'verified'
    })

    // Validate required fields
    if (!jobData) {
      return NextResponse.json(
        { error: 'Missing required field: jobData is required' },
        { status: 400 }
      )
    }

    // Validate job data has minimum required fields
    if (!jobData.title || !jobData.description) {
      return NextResponse.json(
        { error: 'Job data must include title and description' },
        { status: 400 }
      )
    }

    // Create or update pending job post record
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/external-return`

    // Always create a NEW pending job post instead of updating existing ones
    // Each pending job should be independent and separate
    const pendingJobPost = await db.pendingJobPost.create({
      data: {
        clerkUserId: currentUser.clerkUser.id,
        jobData: JSON.stringify(jobData),
        selectedPackage,
        email: currentUser.clerkUser.emailAddresses[0]?.emailAddress || '',
        sessionToken,
        returnUrl,
        expiresAt
      }
    })
    console.log('✅ PENDING-JOB: Created new pending job post:', pendingJobPost.id)

    return NextResponse.json({
      success: true,
      pendingJobId: pendingJobPost.id,
      sessionToken: pendingJobPost.sessionToken,
      expiresAt: pendingJobPost.expiresAt
    })

  } catch (error) {
    console.error('❌ PENDING-JOB: Error creating pending job post:', error)
    console.error('❌ PENDING-JOB: Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
    })
    return NextResponse.json(
      {
        error: 'Failed to create pending job post',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get current user from Clerk
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the latest pending job post for this user
    const pendingJobPost = await db.pendingJobPost.findFirst({
      where: {
        clerkUserId: currentUser.clerkUser.id,
        expiresAt: {
          gt: new Date() // Only find non-expired ones
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!pendingJobPost) {
      return NextResponse.json({
        success: true,
        pendingJobPost: null
      })
    }

    return NextResponse.json({
      success: true,
      pendingJobPost: {
        id: pendingJobPost.id,
        jobData: JSON.parse(pendingJobPost.jobData),
        selectedPackage: pendingJobPost.selectedPackage,
        sessionToken: pendingJobPost.sessionToken,
        createdAt: pendingJobPost.createdAt,
        expiresAt: pendingJobPost.expiresAt
      }
    })

  } catch (error) {
    console.error('❌ PENDING-JOB: Error fetching pending job post:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending job post' },
      { status: 500 }
    )
  }
}