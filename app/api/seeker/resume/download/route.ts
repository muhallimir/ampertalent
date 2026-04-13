import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { S3Service } from '@/lib/s3'
import { db } from '@/lib/db'

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'hire-my-mom-files'

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const seekerId = searchParams.get('seekerId')
    const resumeId = searchParams.get('resumeId')

    // Determine if user can access the resume
    const isSeeker = currentUser.profile.role === 'seeker'
    const isAdmin = currentUser.profile.role === 'admin' || currentUser.profile.role === 'super_admin'
    const isTargetSeeker = seekerId === currentUser.profile.id

    if (!isSeeker && !isAdmin) {
      return NextResponse.json(
        { error: 'Only job seekers and admins can download resumes' },
        { status: 403 }
      )
    }

    // If seeker, they can only access their own resume
    // If admin, they can access any seeker's resume
    if (isSeeker && !isTargetSeeker) {
      return NextResponse.json(
        { error: 'You can only access your own resume' },
        { status: 403 }
      )
    }

    let resumeUrl: string;
    let fileKey: string;

    if (resumeId && resumeId !== 'legacy') {
      // Use new Resume table
      const resume = await db.resume.findUnique({
        where: { id: resumeId },
        select: {
          id: true,
          seekerId: true,
          fileUrl: true,
          filename: true
        }
      });

      if (!resume) {
        return NextResponse.json(
          { error: 'Resume not found' },
          { status: 404 }
        )
      }

      // Verify the resume belongs to the target seeker
      if (seekerId && resume.seekerId !== seekerId) {
        return NextResponse.json(
          { error: 'Resume does not belong to specified seeker' },
          { status: 403 }
        )
      }

      resumeUrl = resume.fileUrl;
      const urlParts = resumeUrl.split('/')
      fileKey = urlParts.slice(-3).join('/') // Get the last 3 parts: resumes/userId/filename
    } else {
      // Handle legacy resume or when no resumeId specified
      const targetUserId = seekerId || currentUser.profile.id;

      const jobSeeker = await db.jobSeeker.findUnique({
        where: { userId: targetUserId },
        select: { resumeUrl: true }
      });

      if (!jobSeeker?.resumeUrl) {
        return NextResponse.json(
          { error: 'No resume found' },
          { status: 404 }
        )
      }

      resumeUrl = jobSeeker.resumeUrl;
      const urlParts = resumeUrl.split('/')
      fileKey = urlParts.slice(-3).join('/') // Get the last 3 parts: resumes/userId/filename
    }

    // Security check: verify the file path contains the correct user ID
    const targetUserId = seekerId || currentUser.profile.id;
    if (!fileKey.includes(targetUserId)) {
      return NextResponse.json(
        { error: 'Unauthorized access to file' },
        { status: 403 }
      )
    }

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