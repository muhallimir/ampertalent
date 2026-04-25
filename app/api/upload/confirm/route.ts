/**
 * Upload Confirmation - POST /api/upload/confirm
 *
 * Called by FileUpload component after a successful PUT to Supabase signed URL.
 * Behaviour depends on uploadType:
 *   - resume     → creates a Resume DB record (seekers only, enforces quota)
 *   - logo/image → no DB record; just validates auth and returns { success, fileUrl }
 *   - profile/avatar/attachment/(default) → same, no DB record
 *
 * The caller already has fileUrl from the presigned-url step, so for non-resume
 * types this endpoint just gates on auth and echoes success.
 */

import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request)

    if (!currentUser?.clerkUser || !currentUser.profile) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { uploadId, fileUrl, uploadType = 'document', storageKey, fileName } = body

    if (!fileUrl) {
      return Response.json({ error: 'fileUrl is required' }, { status: 400 })
    }

    // ── Resume upload: create DB record, enforce quota ────────────────────────
    if (uploadType === 'resume') {
      if (!currentUser.profile.jobSeeker) {
        return Response.json(
          { error: 'Resume upload is only available for job seekers' },
          { status: 403 }
        )
      }

      const seekerId = currentUser.profile.jobSeeker.id
      const resolvedKey = storageKey || fileUrl.split('/').slice(-1)[0]
      const resolvedName = fileName || resolvedKey || 'resume'

      const seeker = await db.jobSeeker.findUnique({
        where: { userId: seekerId },
        select: { userId: true, resumeLimit: true },
      })

      if (!seeker) {
        return Response.json({ error: 'Seeker not found' }, { status: 404 })
      }

      const resumeCount = await db.resume.count({
        where: { seekerId, deletedAt: null },
      })

      const resumeLimit = seeker.resumeLimit || 3

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

      const resume = await db.resume.create({
        data: {
          seekerId,
          filename: resolvedName,
          fileUrl,
          uploadedAt: new Date(),
          isPrimary: resumeCount === 0,
        },
      })

      return Response.json(
        {
          success: true,
          fileUrl,
          id: resume.id,
          fileName: resume.filename,
          uploadedAt: resume.uploadedAt,
          isPrimary: resume.isPrimary,
        },
        { status: 201 }
      )
    }

    // ── Logo / image / profile / attachment / generic ─────────────────────────
    // File already stored in Supabase (the signed PUT already succeeded).
    // Callers save fileUrl to the appropriate model via their own profile PUT/PATCH.
    return Response.json({ success: true, fileUrl, uploadId }, { status: 200 })
  } catch (error) {
    console.error('[POST /api/upload/confirm]:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
