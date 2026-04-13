import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {

  const currentUser = await getCurrentUser(request)

  if (!currentUser || !currentUser.clerkUser) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  try {
    console.log('🔍 EMAIL BLAST API: GET request received', {
      jobId: id,
      url: request.url,
      method: request.method
    })

    const currentUser = await getCurrentUser(request)

    if (!currentUser || !currentUser.clerkUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Email blast GET API called with impersonated user', {
        adminId: (currentUser as any).adminProfile?.id,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    const jobId = id

    // Verify employer role
    if (!currentUser.profile || currentUser.profile.role !== 'employer' || !currentUser.profile.employer) {
      console.error('❌ EMPLOYER ACCESS DENIED (Email Blast GET):', {
        hasProfile: !!currentUser.profile,
        role: currentUser.profile?.role,
        hasEmployer: !!currentUser.profile?.employer,
        isImpersonating: currentUser.isImpersonating
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const employerId = currentUser.profile.employer.userId

    // Get the job and verify ownership
    console.log('🔍 EMAIL BLAST DEBUG: Querying job', {
      jobId,
      employerId,
      timestamp: new Date().toISOString()
    })

    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        emailBlastRequests: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    console.log('🔍 EMAIL BLAST DEBUG: Job query result', {
      jobFound: !!job,
      jobId: job?.id,
      jobEmployerId: job?.employerId,
      isEmailBlast: job?.isEmailBlast,
      emailBlastRequestsCount: job?.emailBlastRequests?.length || 0,
      requestingEmployerId: employerId,
      ownershipMatch: job?.employerId === employerId
    })

    if (!job) {
      console.error('❌ EMAIL BLAST ERROR: Job not found', {
        jobId,
        employerId,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    if (job.employerId !== employerId) {
      console.error('❌ EMAIL BLAST ERROR: Access denied - ownership mismatch', {
        jobId,
        jobEmployerId: job.employerId,
        requestingEmployerId: employerId,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if this is an email blast job
    if (!job.isEmailBlast) {
      console.error('❌ EMAIL BLAST ERROR: Job is not an email blast', {
        jobId,
        isEmailBlast: job.isEmailBlast,
        jobTitle: job.title,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json(
        { error: 'This job is not an email blast' },
        { status: 400 }
      )
    }

    const emailBlastRequest = job.emailBlastRequests[0] || null

    console.log('🔍 EMAIL BLAST DEBUG: EmailBlastRequest details', {
      hasEmailBlastRequest: !!emailBlastRequest,
      requestId: emailBlastRequest?.id,
      requestStatus: emailBlastRequest?.status,
      requestContent: emailBlastRequest?.content ? 'has content' : 'no content',
      requestLogoUrl: emailBlastRequest?.logoUrl ? 'has logo' : 'no logo',
      requestCreatedAt: emailBlastRequest?.createdAt,
      timestamp: new Date().toISOString()
    })

    console.log('✅ EMAIL BLAST SUCCESS: Returning email blast request data', {
      jobId,
      employerId,
      hasRequest: !!emailBlastRequest,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      emailBlastRequest
    })

  } catch (error) {
    console.error('Error fetching email blast details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params for Next.js 16
    const { id } = await params

    console.log('🔍 EMAIL BLAST API: POST request received', {
      jobId: id,
      url: request.url,
      method: request.method
    })

    const currentUser = await getCurrentUser(request)

    if (!currentUser || !currentUser.clerkUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Log impersonation context for debugging
    if (currentUser.isImpersonating) {
      console.log('🎭 IMPERSONATION: Email blast POST API called with impersonated user', {
        adminId: (currentUser as any).adminProfile?.id,
        impersonatedUserId: currentUser.profile?.id,
        impersonatedRole: currentUser.profile?.role
      })
    }

    const jobId = id
    const { logoUrl, content, customLink, useJobLink } = await request.json()

    // Validation
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const wordCount = content.trim().split(/\s+/).filter((word: string) => word.length > 0).length
    if (wordCount > 100) {
      return NextResponse.json(
        { error: 'Content must be 100 words or less' },
        { status: 400 }
      )
    }

    if (!useJobLink && (!customLink || customLink.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Custom link is required when not using job link' },
        { status: 400 }
      )
    }

    // Verify employer role
    if (!currentUser.profile || currentUser.profile.role !== 'employer' || !currentUser.profile.employer) {
      console.error('❌ EMPLOYER ACCESS DENIED (Email Blast POST):', {
        hasProfile: !!currentUser.profile,
        role: currentUser.profile?.role,
        hasEmployer: !!currentUser.profile?.employer,
        isImpersonating: currentUser.isImpersonating
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const employerId = currentUser.profile.employer.userId

    // Get the job and verify ownership
    console.log('🔍 EMAIL BLAST DEBUG: POST - Querying job', {
      jobId,
      employerId,
      timestamp: new Date().toISOString()
    })

    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        emailBlastRequests: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    console.log('🔍 EMAIL BLAST DEBUG: POST - Job query result', {
      jobFound: !!job,
      jobId: job?.id,
      jobEmployerId: job?.employerId,
      isEmailBlast: job?.isEmailBlast,
      emailBlastRequestsCount: job?.emailBlastRequests?.length || 0,
      requestingEmployerId: employerId,
      ownershipMatch: job?.employerId === employerId
    })

    if (!job) {
      console.error('❌ EMAIL BLAST ERROR: POST - Job not found', {
        jobId,
        employerId,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    if (job.employerId !== employerId) {
      console.error('❌ EMAIL BLAST ERROR: POST - Access denied - ownership mismatch', {
        jobId,
        jobEmployerId: job.employerId,
        requestingEmployerId: employerId,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if this is an email blast job
    if (!job.isEmailBlast) {
      console.error('❌ EMAIL BLAST ERROR: POST - Job is not an email blast', {
        jobId,
        isEmailBlast: job.isEmailBlast,
        jobTitle: job.title,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json(
        { error: 'This job is not an email blast' },
        { status: 400 }
      )
    }

    const existingRequest = job.emailBlastRequests[0]

    console.log('🔍 EMAIL BLAST DEBUG: POST - Existing request check', {
      hasExistingRequest: !!existingRequest,
      requestId: existingRequest?.id,
      requestStatus: existingRequest?.status,
      canEdit: !existingRequest || (existingRequest.status !== 'pending' && existingRequest.status !== 'completed'),
      timestamp: new Date().toISOString()
    })

    // Don't allow editing if processing has started or email has been sent
    if (existingRequest?.status === 'pending' || existingRequest?.status === 'completed') {
      const statusMessage = existingRequest.status === 'completed'
        ? 'Cannot edit email blast details after email has been sent'
        : 'Cannot edit email blast details after processing has started'

      console.error('❌ EMAIL BLAST ERROR: POST - Cannot edit due to status', {
        jobId,
        requestStatus: existingRequest.status,
        statusMessage,
        timestamp: new Date().toISOString()
      })

      return NextResponse.json(
        { error: statusMessage },
        { status: 400 }
      )
    }

    // Update the email blast request with the new details
    if (existingRequest) {
      console.log('🔄 EMAIL BLAST DEBUG: POST - Updating existing request', {
        requestId: existingRequest.id,
        hasLogoUrl: !!logoUrl,
        contentLength: content.trim().length,
        useJobLink,
        hasCustomLink: !!customLink,
        timestamp: new Date().toISOString()
      })

      await db.emailBlastRequest.update({
        where: { id: existingRequest.id },
        data: {
          logoUrl: logoUrl || null,
          content: content.trim(),
          customLink: useJobLink ? null : customLink?.trim() || null,
          useJobLink
        }
      })

      console.log('✅ EMAIL BLAST SUCCESS: POST - Request updated successfully', {
        requestId: existingRequest.id,
        jobId,
        timestamp: new Date().toISOString()
      })
    } else {
      // This shouldn't happen in normal flow, but handle it just in case
      console.error('❌ EMAIL BLAST ERROR: POST - Email blast request not found', {
        jobId,
        employerId,
        jobHasEmailBlastRequests: job.emailBlastRequests.length > 0,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json(
        { error: 'Email blast request not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Email blast details saved successfully'
    })

  } catch (error) {
    console.error('Error saving email blast details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}