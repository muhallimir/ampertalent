import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const applicationSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  resumeUrl: z.string().url('Valid resume URL is required'),
  coverLetter: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  portfolioUrl: z.string().url().optional().or(z.literal('')),
  jobId: z.string().optional(),
  jobTitle: z.string().optional(),
  source: z.string().default('wordpress_referral')
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = applicationSchema.parse(body)

    // Check if job exists (if jobId provided)
    let job = null
    if (validatedData.jobId) {
      job = await db.job.findUnique({
        where: { id: validatedData.jobId },
        include: {
          employer: {
            include: {
              user: true
            }
          }
        }
      })

      if (!job) {
        return NextResponse.json(
          { success: false, error: 'Job not found' },
          { status: 404 }
        )
      }
    }

    // For external applications without a specific job, we need at least a job title
    if (!validatedData.jobId && !validatedData.jobTitle) {
      return NextResponse.json(
        { success: false, error: 'Either jobId or jobTitle is required' },
        { status: 400 }
      )
    }

    // Create or find user profile for the applicant
    // Since email is not unique in UserProfile, we'll search by email first
    let userProfile = await db.userProfile.findFirst({
      where: {
        email: validatedData.email,
        role: 'seeker'
      },
      include: {
        jobSeeker: true
      }
    })

    if (!userProfile) {
      // Create a new user profile for external applicants
      // We need a clerkUserId, so we'll use a placeholder for external users
      const externalClerkUserId = `external_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      userProfile = await db.userProfile.create({
        data: {
          clerkUserId: externalClerkUserId,
          email: validatedData.email,
          name: `${validatedData.firstName} ${validatedData.lastName}`,
          phone: validatedData.phone || null,
          role: 'seeker'
        },
        include: {
          jobSeeker: true
        }
      })

      // Create JobSeeker profile
      await db.jobSeeker.create({
        data: {
          userId: userProfile.id,
          resumeUrl: validatedData.resumeUrl,
          portfolioUrls: validatedData.portfolioUrl ? [validatedData.portfolioUrl] : [],
          resumeLastUploaded: new Date()
        }
      })
    } else if (!userProfile.jobSeeker) {
      // User exists but doesn't have JobSeeker profile, create it
      await db.jobSeeker.create({
        data: {
          userId: userProfile.id,
          resumeUrl: validatedData.resumeUrl,
          portfolioUrls: validatedData.portfolioUrl ? [validatedData.portfolioUrl] : [],
          resumeLastUploaded: new Date()
        }
      })
    }

    // Create the application
    // Note: Applications require both jobId and seekerId, but jobId can be optional for general applications
    const applicationData: any = {
      seekerId: userProfile.id,
      resumeUrl: validatedData.resumeUrl,
      coverLetter: validatedData.coverLetter || null,
      status: 'pending',
      appliedAt: new Date()
    }

    if (validatedData.jobId) {
      applicationData.jobId = validatedData.jobId
    } else {
      // For applications without a specific job, we'll need to handle this differently
      // For now, let's create a placeholder job or handle it as a general inquiry
      return NextResponse.json(
        {
          success: false,
          error: 'Direct job applications require a valid jobId. Please contact us directly for general inquiries.'
        },
        { status: 400 }
      )
    }

    const application = await db.application.create({
      data: applicationData
    })

    // If we have a job and employer, send notification
    if (job && job.employer) {
      try {
        // Send notification to employer about new application
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: job.employer.userId,
            type: 'new_application',
            title: 'New Application Received',
            message: `${validatedData.firstName} ${validatedData.lastName} has applied for ${job.title}`,
            metadata: {
              applicationId: application.id,
              jobId: job.id,
              applicantName: `${validatedData.firstName} ${validatedData.lastName}`,
              source: validatedData.source
            }
          })
        })
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError)
        // Don't fail the application submission if notification fails
      }
    }

    // Send confirmation email to applicant (optional)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userProfile.id,
          type: 'application_confirmation',
          title: 'Application Submitted Successfully',
          message: `Your application for ${validatedData.jobTitle || job?.title || 'the position'} has been received and will be reviewed shortly.`,
          metadata: {
            applicationId: application.id,
            jobTitle: validatedData.jobTitle || job?.title || 'the position'
          }
        })
      })
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError)
      // Don't fail the application submission if email fails
    }

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      message: 'Application submitted successfully'
    })

  } catch (error) {
    console.error('Application submission error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit application'
      },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}