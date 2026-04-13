import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { id: resumeId } = await params

    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify user is a job seeker or admin impersonating a seeker
    if (currentUser.profile.role !== 'seeker' && !(currentUser.isImpersonating && currentUser.profile.role === 'seeker')) {
      console.log('🚫 RESUME UPDATE: Access denied', {
        userRole: currentUser.profile.role,
        isImpersonating: currentUser.isImpersonating,
        userId: currentUser.profile.id,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined
      })
      return NextResponse.json(
        { error: 'Only job seekers can update resumes' },
        { status: 403 }
      )
    }

    console.log('🎭 RESUME UPDATE: Processing request', {
      userRole: currentUser.profile.role,
      isImpersonating: currentUser.isImpersonating,
      userId: currentUser.profile.id,
      adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
      resumeId: resumeId
    })

    const body = await request.json()
    const { filename, isPrimary } = body

    // Verify the resume belongs to the current user
    const existingResume = await db.resume.findUnique({
      where: {
        id: resumeId,
        seekerId: currentUser.profile.id
      }
    })

    if (!existingResume) {
      return NextResponse.json(
        { error: 'Resume not found or access denied' },
        { status: 404 }
      )
    }

    // If setting this resume as primary, unset all other resumes as primary
    if (isPrimary === true) {
      await db.resume.updateMany({
        where: {
          seekerId: currentUser.profile.id,
          id: { not: resumeId }
        },
        data: {
          isPrimary: false
        }
      })
    }

    // Update the resume
    const updatedResume = await db.resume.update({
      where: { id: resumeId },
      data: {
        ...(filename && { filename }),
        ...(isPrimary !== undefined && { isPrimary })
      }
    })

    // If this resume is now primary, also update the job_seeker's resume_url field for backward compatibility
    if (isPrimary === true) {
      try {
        await db.jobSeeker.update({
          where: { userId: currentUser.profile.id },
          data: {
            resumeUrl: updatedResume.fileUrl,
            resumeLastUploaded: new Date()
          }
        })
        console.log(`Updated job_seeker.resume_url for seeker ${currentUser.profile.id}`)
      } catch (updateError) {
        console.error('Error updating job_seeker.resume_url:', updateError)
        // Don't fail the whole request if updating the job_seeker fails
      }
    }

    return NextResponse.json({
      success: true,
      resume: {
        id: updatedResume.id,
        filename: updatedResume.filename,
        uploadedAt: updatedResume.uploadedAt.toISOString(),
        url: updatedResume.fileUrl,
        isPrimary: updatedResume.isPrimary,
        fileSize: updatedResume.fileSize
      }
    })

  } catch (error) {
    console.error('Error updating resume:', error)
    return NextResponse.json(
      { error: 'Failed to update resume' },
      { status: 500 }
    )
  }
}