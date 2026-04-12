/**
 * Upload Confirmation - POST /api/upload/confirm
 * Creates Resume record after successful file upload
 */

import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser || !currentUser.profile?.jobSeeker) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const seekerId = currentUser.profile.jobSeeker.id
    const { storageKey, fileName, fileType } = await request.json()

    // Validate required fields
    if (!storageKey || !fileName) {
      return Response.json(
        { error: 'storageKey and fileName are required' },
        { status: 400 }
      )
    }

    // Check seeker's resume quota
    const seeker = await db.jobSeeker.findUnique({
      where: { id: seekerId },
      select: {
        userId: true,
        user: {
          select: {
            subscription: true,
          },
        },
      },
    })

    if (!seeker) {
      return Response.json({ error: 'Seeker not found' }, { status: 404 })
    }

    // Get resume count for seeker
    const resumeCount = await db.resume.count({
      where: {
        seekerId,
        deletedAt: null, // Don't count soft-deleted resumes
      },
    })

    // Check against quota (default 3 for free users)
    const resumeLimit = seeker.user?.subscription?.resumeLimit || 3

    if (resumeCount >= resumeLimit) {
      return Response.json(
        {
          error: 'Resume limit reached',
          current: resumeCount,
          limit: resumeLimit,
          message: `You have reached your resume limit of ${resumeLimit}. Upgrade your subscription to upload more.`,
        },
        { status: 403 }
      )
    }

    // Create resume record
    const resume = await db.resume.create({
      data: {
        seekerId,
        fileName,
        fileKey: storageKey,
        uploadedAt: new Date(),
        // Set as primary if it's the first resume
        isPrimary: resumeCount === 0,
      },
    })

    return Response.json(
      {
        id: resume.id,
        fileName: resume.fileName,
        uploadedAt: resume.uploadedAt,
        isPrimary: resume.isPrimary,
        storageKey: resume.fileKey,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/upload/confirm]:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
