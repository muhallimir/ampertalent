import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { S3Service } from '@/lib/s3'

export async function DELETE(
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
      console.log('🚫 RESUME DELETE: Access denied', {
        userRole: currentUser.profile.role,
        isImpersonating: currentUser.isImpersonating,
        userId: currentUser.profile.id,
        adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined
      })
      return NextResponse.json(
        { error: 'Only job seekers can delete resumes' },
        { status: 403 }
      )
    }

    console.log('🎭 RESUME DELETE: Processing request', {
      userRole: currentUser.profile.role,
      isImpersonating: currentUser.isImpersonating,
      userId: currentUser.profile.id,
      adminId: currentUser.isImpersonating ? (currentUser as any).adminProfile?.id : undefined,
      resumeId: resumeId
    })

    // Get the resume to delete
    const resume = await db.resume.findUnique({
      where: {
        id: resumeId,
        seekerId: currentUser.profile.id
      }
    })

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      )
    }

    // Check if this resume has been used in any job applications
    const applicationsWithResume = await db.application.findMany({
      where: {
        seekerId: currentUser.profile.id,
        resumeUrl: resume.fileUrl
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

    // Delete the file from S3
    try {
      const fileKey = resume.fileUrl.split('/').slice(-3).join('/')
      await S3Service.deleteFile(process.env.AWS_S3_BUCKET_NAME!, fileKey)
    } catch (s3Error) {
      console.error('Error deleting file from S3:', s3Error)
      // Continue with database deletion even if S3 deletion fails
    }

    // Delete the resume record from database
    await db.resume.delete({
      where: {
        id: resumeId
      }
    })

    // If this was the primary resume, make another resume primary if one exists
    if (resume.isPrimary) {
      const otherResumes = await db.resume.findMany({
        where: {
          seekerId: currentUser.profile.id
        },
        orderBy: {
          uploadedAt: 'desc'
        },
        take: 1
      })

      if (otherResumes.length > 0) {
        await db.resume.update({
          where: {
            id: otherResumes[0].id
          },
          data: {
            isPrimary: true
          }
        })
      }
    }

    // Check if this was the last resume
    const remainingResumes = await db.resume.findMany({
      where: {
        seekerId: currentUser.profile.id
      }
    })

    // Get current jobSeeker data to calculate correct credits
    const jobSeeker = await db.jobSeeker.findUnique({
      where: { userId: currentUser.profile.id },
      select: {
        membershipPlan: true,
        resumeCredits: true
      }
    })

    if (!jobSeeker) {
      return NextResponse.json(
        { error: 'Job seeker profile not found' },
        { status: 404 }
      )
    }

    // Calculate the maximum credits allowed for this plan
    const planLimits: Record<string, number> = {
      'trial_monthly': 1,
      'gold_bimonthly': 3,
      'vip_quarterly': 999,
      'annual_platinum': 999,
      'none': 0
    }
    const maxCredits = planLimits[jobSeeker.membershipPlan] || 0

    // Calculate new credits, capped at plan limit
    const currentCredits = jobSeeker.resumeCredits || 0
    const newCredits = Math.min(currentCredits + 1, maxCredits)

    // Update jobSeeker record
    const updateData: any = {
      resumeCredits: newCredits  // ✅ Capped at plan limit
    }

    // If no resumes remain, clear legacy fields
    if (remainingResumes.length === 0) {
      updateData.resumeUrl = null
      updateData.resumeLastUploaded = null
    }

    await db.jobSeeker.update({
      where: { userId: currentUser.profile.id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message: 'Resume deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting resume:', error)
    return NextResponse.json(
      { error: 'Failed to delete resume' },
      { status: 500 }
    )
  }
}