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
    // Await params for Next.js 16
    const { id } = await params

    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify user is a job seeker or admin impersonating a seeker
    if (currentUser.profile.role !== 'seeker' && !(currentUser.isImpersonating && currentUser.profile.role === 'seeker')) {
      console.log('🚫 RESUME DOWNLOAD: Access denied', {
        userRole: currentUser.profile.role,
        isImpersonating: currentUser.isImpersonating,
        userId: currentUser.profile.id,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined
      })
      return NextResponse.json(
        { error: 'Only job seekers can download resumes' },
        { status: 403 }
      )
    }

    console.log('🎭 RESUME DOWNLOAD: Processing request', {
      userRole: currentUser.profile.role,
      isImpersonating: currentUser.isImpersonating,
      userId: currentUser.profile.id,
      adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
      resumeId: id
    })

    // Get the resume and verify it belongs to the current user
    const resume = await db.resume.findUnique({
      where: {
        id: id,
        seekerId: currentUser.profile.id // Ensure the resume belongs to the current user
      }
    })

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found or access denied' },
        { status: 404 }
      )
    }

    // Extract file key from the resume URL
    const resumeUrl = resume.fileUrl
    const urlParts = resumeUrl.split('/')
    const fileKey = urlParts.slice(-3).join('/') // Get the last 3 parts: resumes/userId/filename

    // Verify the file belongs to the current user (additional security check)
    if (!fileKey.includes(currentUser.profile.id)) {
      return NextResponse.json(
        { error: 'Unauthorized access to file' },
        { status: 403 }
      )
    }

    // Generate presigned download URL (valid for 1 hour) with inline disposition to view in browser
    const downloadUrl = await S3Service.generatePresignedDownloadUrl(
      BUCKET_NAME,
      fileKey,
      3600, // 1 hour
      true // inline - display in browser instead of downloading
    )

    return NextResponse.json({
      success: true,
      downloadUrl,
      filename: resume.filename,
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