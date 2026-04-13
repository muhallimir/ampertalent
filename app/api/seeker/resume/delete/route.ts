import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { S3Service } from '@/lib/s3'

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'hire-my-mom-files'

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify seeker role
    if (currentUser.profile.role !== 'seeker') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get the current resume URL from the database
    const jobSeeker = await db.jobSeeker.findUnique({
      where: { userId: currentUser.profile.id },
      select: { resumeUrl: true }
    })

    if (!jobSeeker || !jobSeeker.resumeUrl) {
      return NextResponse.json({ error: 'No resume found to delete' }, { status: 404 })
    }

    // Check if this resume has been used in any job applications
    const applicationsWithResume = await db.application.findMany({
      where: {
        seekerId: currentUser.profile.id,
        resumeUrl: jobSeeker.resumeUrl
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            employer: {
              select: {
                companyName: true
              }
            }
          }
        }
      }
    })

    // If resume is used in applications, prevent deletion and suggest upgrade
    if (applicationsWithResume.length > 0) {
      const jobsAppliedTo = applicationsWithResume.map(app => ({
        jobId: app.job.id,
        jobTitle: app.job.title,
        companyName: app.job.employer.companyName,
        appliedAt: app.appliedAt
      }))

      return NextResponse.json({
        error: 'RESUME_IN_USE',
        message: 'This resume cannot be deleted because you have applied to jobs with it. Upgrade your plan to upload additional resumes.',
        jobsAppliedTo: jobsAppliedTo
      }, { status: 409 })
    }

    // Extract S3 key from the resume URL
    let fileKey: string
    try {
      const resumeUrl = jobSeeker.resumeUrl
      const urlParts = resumeUrl.split('/')

      // Handle different S3 URL formats
      if (resumeUrl.includes('.amazonaws.com/')) {
        // Standard S3 URL: https://bucket.s3.region.amazonaws.com/path/to/file
        const pathIndex = urlParts.findIndex((part: string) => part.includes('.amazonaws.com'))
        if (pathIndex !== -1 && pathIndex + 1 < urlParts.length) {
          fileKey = urlParts.slice(pathIndex + 1).join('/')
        } else {
          fileKey = urlParts.slice(-3).join('/') // Fallback to original logic
        }
      } else if (resumeUrl.includes('s3://')) {
        // S3 URI format: s3://bucket/path/to/file
        fileKey = urlParts.slice(3).join('/')
      } else {
        // Fallback to original logic
        fileKey = urlParts.slice(-3).join('/')
      }

      console.log('🗑️ RESUME-DELETE: Extracted file key:', fileKey)
    } catch (keyError) {
      console.error('❌ RESUME-DELETE: File key extraction error:', keyError)
      return NextResponse.json(
        { error: 'Invalid resume URL format' },
        { status: 400 }
      )
    }

    // Verify the file belongs to the current user (security check)
    if (!fileKey.includes(currentUser.profile.id)) {
      console.error('❌ RESUME-DELETE: Unauthorized file access:', {
        fileKey,
        userId: currentUser.profile.id
      })
      return NextResponse.json(
        { error: 'Unauthorized access to file' },
        { status: 403 }
      )
    }

    // Delete the file from S3
    try {
      console.log('🗑️ RESUME-DELETE: Deleting file from S3:', `${BUCKET_NAME}/${fileKey}`)
      await S3Service.deleteFile(BUCKET_NAME, fileKey)
      console.log('✅ RESUME-DELETE: File deleted from S3 successfully')
    } catch (s3Error) {
      console.error('❌ RESUME-DELETE: Failed to delete file from S3:', s3Error)
      // Continue with database update even if S3 deletion fails
      // The file might already be deleted or the URL might be invalid
    }

    // Update the database to remove the resume URL, last uploaded date, and restore credit
    await db.jobSeeker.update({
      where: { userId: currentUser.profile.id },
      data: {
        resumeUrl: null,
        resumeLastUploaded: null,
        resumeCredits: {
          increment: 1  // Restore 1 credit when resume is deleted
        }
      }
    })

    console.log('✅ RESUME-DELETE: Database updated successfully - resume removed and credit restored')

    return NextResponse.json({
      success: true,
      message: 'Resume deleted successfully'
    })

  } catch (error) {
    console.error('❌ RESUME-DELETE: Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to delete resume' },
      { status: 500 }
    )
  }
}