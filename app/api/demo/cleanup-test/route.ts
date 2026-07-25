/**
 * POST /api/demo/cleanup-test
 *
 * Test-only endpoint that cleans up all demo Clerk users + DB rows. Used by
 * the Playwright validation script to reset state between role tests.
 *
 * NOT exposed in production — guarded by NODE_ENV !== 'production'.
 */

import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(_request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  let clerkDeleted = 0
  try {
    const clerk = await clerkClient()
    const list = await clerk.users.getUserList({ limit: 100 })
    for (const u of list.data) {
      const email = u.emailAddresses[0]?.emailAddress
      if (email?.includes('ampertalent-demo.com')) {
        try {
          await clerk.users.deleteUser(u.id)
          clerkDeleted++
        } catch (e) {
          console.warn('Failed to delete Clerk user', email, e)
        }
      }
    }
  } catch (e) {
    console.warn('Clerk cleanup error', e)
  }

  // Cascading delete via Prisma
  const profiles = await db.userProfile.findMany({
    where: { name: { startsWith: 'demo-' } },
    select: { id: true },
  })
  for (const p of profiles) {
    try {
      await db.jobSeeker.delete({ where: { userId: p.id } }).catch(() => {})
      await db.employer.delete({ where: { userId: p.id } }).catch(() => {})
      await db.userProfile.delete({ where: { id: p.id } }).catch(() => {})
    } catch {
      // ignore
    }
  }
  // Also clean up any demo-titled jobs that might be orphaned
  await db.job.deleteMany({ where: { title: { contains: 'Demo' } } }).catch(() => {})

  return NextResponse.json({
    success: true,
    clerkUsersDeleted: clerkDeleted,
    dbProfilesDeleted: profiles.length,
  })
}
