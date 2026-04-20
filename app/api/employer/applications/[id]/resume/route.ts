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
    // Get current user and verify they are an employer
    const currentUser = await getCurrentUser(request)
    if (!currentUser?.profile || currentUser.profile.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const applicationId = resolvedParams.id

    // Get the application and verify the employer owns the job
    const application = await db.application.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          select: {
            employerId: true,
            title: true
          }
        },
        seeker: {
          select: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Verify the employer owns this job
    if (application.job.employerId !== currentUser.profile.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Extract S3 key from the resume URL
    if (!application.resumeUrl) {
      return NextResponse.json({ error: 'No resume found for this application' }, { status: 404 })
    }

    try {
      console.log('📋 Resume download - Application resumeUrl:', application.resumeUrl)

      // Extract S3 key from the resume URL
      // The resumeUrl can be either:
      // 1. A full URL: https://bucket.s3.region.amazonaws.com/resumes/file.pdf
      // 2. Just the S3 key: resumes/file.pdf
      let s3Key: string

      try {
        // Try to parse as URL first
        const url = new URL(application.resumeUrl)
        s3Key = url.pathname.substring(1) // Remove leading slash
      } catch {
        // If parsing fails, assume it's already an S3 key
        s3Key = application.resumeUrl
      }

      // Generate presigned URL for viewing (valid for 1 hour) with inline disposition
      const presignedUrl = await S3Service.generatePresignedDownloadUrl(
        BUCKET_NAME,
        s3Key,
        3600, // 1 hour
        true // inline - display in browser instead of downloading
      )

      return NextResponse.json({
        downloadUrl: presignedUrl,
        applicantName: application.seeker.user.name,
        jobTitle: application.job.title
      })
    } catch (error) {
      console.error('❌ Error generating presigned URL for resume:', error)
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in resume download API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}