import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { S3Service } from '@/lib/s3'

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'ampertalent-files'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is an employer
    if (currentUser.profile.role !== 'employer') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const resolvedParams = await params
    const talentId = resolvedParams.id

    // Fetch talent's resume URL
    const talent = await db.jobSeeker.findUnique({
      where: {
        userId: talentId,
        isSuspended: false,
        profileVisibility: 'employers_only',
        // Require active subscription
        membershipPlan: {
          not: 'none'
        },
        membershipExpiresAt: {
          gt: new Date() // Must have non-expired subscription
        }
      },
      select: {
        resumeUrl: true,
        user: {
          select: {
            name: true
          }
        }
      }
    })

    if (!talent || !talent.resumeUrl) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 })
    }

    try {
      // Extract S3 key from the resume URL
      // The resumeUrl can be either:
      // 1. A full URL: https://bucket.s3.region.amazonaws.com/resumes/file.pdf
      // 2. Just the S3 key: resumes/file.pdf
      let s3Key: string

      try {
        // Try to parse as URL first
        const url = new URL(talent.resumeUrl)
        s3Key = url.pathname.substring(1) // Remove leading slash
      } catch {
        // If parsing fails, assume it's already an S3 key
        s3Key = talent.resumeUrl
      }

      // Generate presigned URL for viewing (valid for 1 hour) with inline disposition
      const presignedUrl = await S3Service.generatePresignedDownloadUrl(
        BUCKET_NAME,
        s3Key,
        3600, // 1 hour
        true // inline - display in browser instead of downloading
      )

      // Return JSON with download URL instead of redirecting
      return NextResponse.json({
        downloadUrl: presignedUrl,
        talentName: talent.user.name
      })
    } catch (error) {
      console.error('Error generating presigned URL for resume:', error)
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
    }

  } catch (error) {
    console.error('Error downloading resume:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}