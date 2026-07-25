/**
 * POST /api/demo/exit
 *
 * Cleanly removes a demo account:
 *  - deletes the UserProfile (cascades to JobSeeker / Employer / Applications)
 *  - deletes the matching Clerk user
 *  - returns 200 on success, 404 if the profile is already gone
 *
 * Called from the "Exit demo" button in the PersistentDemoBanner.
 */

import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  let body: { profileId?: string; clerkUserId?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { profileId, clerkUserId } = body
  if (!profileId) {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
  }

  // Look up the profile first so we can clean up the Clerk user too
  const profile = await db.userProfile.findUnique({
    where: { id: profileId },
    select: { id: true, clerkUserId: true, name: true },
  })
  if (!profile) {
    return NextResponse.json({ success: true, alreadyGone: true })
  }

  // Defence in depth: only allow deleting demo accounts (those whose name
  // starts with "demo-"). This protects real users from being wiped if the
  // route is ever wired to a real session.
  if (!profile.name?.startsWith('demo-')) {
    return NextResponse.json(
      { error: 'Refusing to delete a non-demo account' },
      { status: 403 }
    )
  }

  // Best-effort: delete the Clerk user first
  const targetClerkId = profile.clerkUserId ?? clerkUserId
  if (targetClerkId) {
    try {
      const clerk = await clerkClient()
      await clerk.users.deleteUser(targetClerkId)
    } catch (clerkErr) {
      console.warn('⚠️ DEMO EXIT: Clerk deleteUser failed (continuing):', clerkErr)
    }
  }

  // Cascade: UserProfile → JobSeeker / Employer / Application rows
  await db.userProfile.delete({ where: { id: profileId } })

  return NextResponse.json({ success: true, deleted: { profileId, name: profile.name } })
}
