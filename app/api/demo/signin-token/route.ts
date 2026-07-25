/**
 * POST /api/demo/signin-token
 *
 * Issues a one-time Clerk sign-in token for a demo account. The token URL
 * can be redirected to and Clerk will sign the user in immediately,
 * bypassing the normal email verification flow (which can't work for fake
 * @ampertalent-demo.com addresses).
 *
 * The token expires in 1 hour. After the user is signed in, this endpoint
 * is no longer needed for the session.
 *
 * Defence in depth: only issues tokens for accounts whose name matches
 * the canonical `demo-` prefix.
 */

import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { DEMO_NAME_REGEX } from '@/lib/demo-credentials'

export async function POST(request: NextRequest) {
  let body: { profileId?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { profileId } = body
  if (!profileId || typeof profileId !== 'string') {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
  }

  const profile = await db.userProfile.findUnique({
    where: { id: profileId },
    select: { id: true, clerkUserId: true, name: true },
  })
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }
  if (!profile.name || !DEMO_NAME_REGEX.test(profile.name)) {
    return NextResponse.json(
      { error: 'Refusing to issue a sign-in token for a non-demo account' },
      { status: 403 }
    )
  }
  if (!profile.clerkUserId) {
    return NextResponse.json(
      { error: 'Demo profile has no Clerk user ID' },
      { status: 400 }
    )
  }

  try {
    const clerk = await clerkClient()
    const resp = await (clerk as any).signInTokens.createSignInToken({
      userId: profile.clerkUserId,
      expiresInSeconds: 60 * 60,
    })
    return NextResponse.json({
      success: true,
      token: resp?.token ?? null,
      tokenUrl: resp?.url ?? null,
      expiresAt: resp?.expiresAt ?? null,
    })
  } catch (err: any) {
    console.error('🚨 DEMO SIGNIN-TOKEN: failed:', err)
    return NextResponse.json(
      { error: 'Failed to issue sign-in token', details: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
