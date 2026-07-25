/**
 * POST /api/demo/create
 *
 * Creates a fully-provisioned demo account for the chosen role. The flow:
 *  1. Validate the role (must be one of seeker / employer / admin / super_admin)
 *  2. Generate the canonical `demo-{role}-{ts}` name + email + password
 *  3. Create a Clerk user with a verified email so the visitor can sign in
 *     without an email-verification round-trip
 *  4. Write the matching `UserProfile` row with the chosen role
 *  5. For seeker/employer: create the role-specific profile row
 *     (JobSeeker / Employer) so onboarding can complete cleanly
 *  6. Return the credentials so the client can call Clerk's `signIn.create`
 *
 * This route is intentionally PUBLIC — it's the only way a visitor can spawn
 * a demo account before they have any auth. The middleware whitelist in
 * `middleware.ts` includes `/api/demo/*` for the same reason.
 */

import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import {
  generateDemoName,
  generateDemoEmail,
  generateDemoPassword,
} from '@/lib/demo-credentials'
import {
  buildEmployerOnboardingStub,
  buildSeekerOnboardingStub,
} from '@/lib/demo-seeding'
import type { DemoRole } from '@/lib/demo-mode'

const VALID_ROLES: DemoRole[] = ['seeker', 'employer', 'admin', 'super_admin']

function isValidRole(role: unknown): role is DemoRole {
  return typeof role === 'string' && (VALID_ROLES as string[]).includes(role)
}

export async function POST(request: NextRequest) {
  let body: { role?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { role } = body
  if (!isValidRole(role)) {
    return NextResponse.json(
      { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
      { status: 400 }
    )
  }

  const timestamp = Date.now()
  const name = generateDemoName(role, timestamp)
  const email = generateDemoEmail(role, timestamp)
  const password = generateDemoPassword()

  // 1. Create the Clerk user with a verified email address.
  let clerkUserId: string
  try {
    const clerk = await clerkClient()
    const created = await clerk.users.createUser({
      emailAddress: [email],
      password,
      firstName: 'Demo',
      lastName: role.charAt(0).toUpperCase() + role.slice(1),
      skipPasswordRequirement: false,
    } as any)
    clerkUserId = created.id

    // Mark the email address as verified so the visitor can sign in
    // immediately (no verification round-trip). If this fails we still have
    // a working account, the visitor just has to enter a code.
    try {
      const emailAddressId = (created.emailAddresses?.[0] as any)?.id
      if (emailAddressId) {
        await (clerk as any).emailAddresses.updateEmailAddress(emailAddressId, {
          verified: true,
        })
      }
    } catch (verifyErr: any) {
      console.warn('⚠️ DEMO CREATE: Could not pre-verify email (non-fatal):', verifyErr?.message)
    }
  } catch (clerkErr: any) {
    console.error('🚨 DEMO CREATE: Clerk createUser failed:', clerkErr)
    return NextResponse.json(
      { error: 'Failed to create demo user in Clerk', details: String(clerkErr?.message ?? clerkErr) },
      { status: 500 }
    )
  }

  // 2. Write the matching UserProfile row. We try/catch so a Clerk user
  // created in step 1 can be rolled back if the DB write fails.
  //
  // For seeker / employer: we DO set the role on UserProfile (it's
  // required by the Prisma schema) but the middleware knows to bypass
  // the role-based redirect for demo users so the visitor walks the
  // full onboarding flow. The jobSeeker / employer row is created
  // later, by the onboarding submit endpoint, to mirror the real flow.
  //
  // For admin / super_admin: set the role directly. There's no admin
  // onboarding form in the app, so they go straight to the dashboard.
  let userProfile: { id: string; role: string; name: string; email: string | null }
  try {
    if (role === 'seeker') {
      const stub = buildSeekerOnboardingStub({ name })
      userProfile = await db.userProfile.create({
        data: {
          clerkUserId,
          role: 'seeker',
          name,
          firstName: stub.firstName,
          lastName: stub.lastName,
          email,
          timezone: 'America/Chicago',
        },
        select: { id: true, role: true, name: true, email: true },
      })
    } else if (role === 'employer') {
      const stub = buildEmployerOnboardingStub({ name })
      userProfile = await db.userProfile.create({
        data: {
          clerkUserId,
          role: 'employer',
          name,
          firstName: stub.firstName,
          lastName: stub.lastName,
          email,
          timezone: 'America/Chicago',
        },
        select: { id: true, role: true, name: true, email: true },
      })
    } else {
      // admin / super_admin — no role-specific profile row, no onboarding
      userProfile = await db.userProfile.create({
        data: {
          clerkUserId,
          role,
          name,
          firstName: 'Demo',
          lastName: role === 'super_admin' ? 'Super Admin' : 'Admin',
          email,
          timezone: 'America/Chicago',
        },
        select: { id: true, role: true, name: true, email: true },
      })
    }
  } catch (dbErr: any) {
    console.error('🚨 DEMO CREATE: UserProfile.create failed:', dbErr)
    // Try to roll back the Clerk user so we don't leak orphan accounts
    try {
      const clerk = await clerkClient()
      await clerk.users.deleteUser(clerkUserId)
    } catch (rollbackErr) {
      console.error('🚨 DEMO CREATE: Clerk rollback also failed:', rollbackErr)
    }
    return NextResponse.json(
      { error: 'Failed to create demo user profile', details: String(dbErr?.message ?? dbErr) },
      { status: 500 }
    )
  }

  // 3. Generate a one-time Clerk sign-in token. This is the cleanest way to
  //    instantly authenticate the visitor against a fresh Clerk account
  //    without going through email verification (which can't work for fake
  //    @ampertalent-demo.com addresses). The token URL can be redirected to
  //    and Clerk will sign the user in immediately.
  let signInToken: string | null = null
  try {
    const clerk = await clerkClient()
    const tokenResp = await (clerk as any).signInTokens.createSignInToken({
      userId: clerkUserId,
      expiresInSeconds: 60 * 60, // 1 hour — long enough for a demo session
    })
    // The token URL is `https://<your-clerk-frontend>/v1/signin/token/<token>?redirect_url=...`
    // or for a custom flow, we just use the token value to construct the URL.
    // The token field is the raw value; we expose it as a `signInToken` so the
    // client can build the URL using its known Clerk frontend API URL.
    signInToken = tokenResp?.token ?? null
  } catch (tokenErr: any) {
    console.warn('⚠️ DEMO CREATE: signInToken creation failed (non-fatal):', tokenErr?.message)
  }

  return NextResponse.json({
    success: true,
    profileId: userProfile.id,
    clerkUserId,
    role,
    name: userProfile.name,
    email,
    password,
    signInToken,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(timestamp + 24 * 60 * 60 * 1000).toISOString(),
  })
}
