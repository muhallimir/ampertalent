import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { S3Service } from '@/lib/s3'
import { getCurrentUser } from '@/lib/auth'

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

    if (currentUser.profile.role !== 'admin' && currentUser.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Get the resume and verify it belongs to the current user
    const resume = await db.resumeCritique.findUnique({
      where: {
        id: id
      }
    })

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found or access denied' },
        { status: 404 }
      )
    }

    // Extract file key from the resume URL
    const resumeUrl = resume.resumeUrl
    const urlParts = resumeUrl.split('/')
    const fileKey = urlParts.slice(-3).join('/') // Get the last 3 parts: resumes/userId/filename

    // Generate presigned download URL (valid for 1 hour)
    const downloadUrl = await S3Service.generatePresignedDownloadUrl(
      BUCKET_NAME,
      fileKey,
      3600 // 1 hour
    )

    return NextResponse.json({
      success: true,
      downloadUrl,
      expiresIn: 3600
    })

  } catch (error) {
    console.error('Error generating resume download URL:', error)
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    )
  }
}