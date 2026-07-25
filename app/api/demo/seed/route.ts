/**
 * POST /api/demo/seed
 *
 * Seeds sample data for a freshly-created demo account so the visitor lands on
 * a populated dashboard that demonstrates the full feature set:
 *
 *  - seeker   → ≥ 1 Application row pointing at jobs posted by the demo
 *                employer (or, if no demo employer exists, 3 sample jobs
 *                we just insert on the fly)
 *  - employer → ≥ 3 Job rows owned by the demo employer
 *
 * Called from the client after the demo credentials dialog is closed and the
 * user is on the relevant dashboard.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { buildSampleJobs, buildSampleApplications } from '@/lib/demo-seeding'
import { DEMO_NAME_REGEX } from '@/lib/demo-credentials'
import type { DemoRole } from '@/lib/demo-mode'

const VALID_ROLES: DemoRole[] = ['seeker', 'employer', 'admin', 'super_admin']

function isValidRole(role: unknown): role is DemoRole {
  return typeof role === 'string' && (VALID_ROLES as string[]).includes(role)
}

export async function POST(request: NextRequest) {
  let body: { role?: string; profileId?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { role, profileId } = body
  if (!isValidRole(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }
  if (!profileId || typeof profileId !== 'string') {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
  }

  // Confirm the profile exists. For seeker/employer demo accounts the role
  // is null (set later when the visitor finishes onboarding), so we only
  // require a role match for admin/super_admin where the role is set at
  // create time. We also verify the profile name matches the demo
  // convention so this endpoint can't be used against a real account.
  const profile = await db.userProfile.findUnique({
    where: { id: profileId },
    select: { id: true, role: true, name: true },
  })
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }
  if (!profile.name || !DEMO_NAME_REGEX.test(profile.name)) {
    return NextResponse.json(
      { error: 'Refusing to seed a non-demo account' },
      { status: 403 }
    )
  }
  if (profile.role && profile.role !== role) {
    return NextResponse.json(
      { error: `Profile role mismatch: profile is '${profile.role}', seed requested '${role}'` },
      { status: 400 }
    )
  }

  try {
    if (role === 'seeker') {
      // Make sure the seeker has a JobSeeker row. The demo flow now defers
      // JobSeeker creation to the onboarding-completion step (so the visitor
      // walks the full flow), but the seed can still be called before that
      // step completes — e.g. from the integration tests.
      const existingSeeker = await db.jobSeeker.findUnique({ where: { userId: profileId } })
      if (!existingSeeker) {
        // FirstName/lastName live on UserProfile and are copied in by the
        // onboarding submit, so we read them back from the profile here.
        const profile = await db.userProfile.findUnique({
          where: { id: profileId },
          select: { firstName: true, lastName: true },
        })
        await db.jobSeeker.create({
          data: {
            userId: profileId,
            headline: profile?.firstName ? `${profile.firstName} (demo)` : 'Demo job seeker',
            availability: 'Remote (US)',
            skills: ['JavaScript', 'TypeScript', 'React', 'Next.js', 'PostgreSQL'],
            membershipPlan: 'none',
          },
        })
      }

      // Find the demo employer (if any) and use their jobs as the seed list.
      // Otherwise, spin up a single one-off "shared demo" employer + 3 jobs
      // and apply to those.
      let demoEmployer = await db.userProfile.findFirst({
        where: { name: { startsWith: 'demo-employer-' } },
        select: { id: true },
      })

      let jobsForSeeding: Array<{ id: string; title: string }>

      const existingDemoJobs = await db.job.findMany({
        where: { title: { contains: 'Demo' } },
        select: { id: true, title: true },
        orderBy: { createdAt: 'desc' },
        take: 3,
      })

      if (existingDemoJobs.length >= 3) {
        jobsForSeeding = existingDemoJobs
      } else if (demoEmployer) {
        // Ensure the demo employer has a matching Employer row. The new demo
        // flow defers Employer creation to onboarding-completion, so a
        // half-created demo user might be missing the row. Create it here
        // if it's missing.
        let employer = await db.employer.findUnique({
          where: { userId: demoEmployer.id },
        })
        if (!employer) {
          employer = await db.employer.create({
            data: { userId: demoEmployer.id, companyName: 'Demo Co.' },
          })
        }
        const built = buildSampleJobs({ employerProfileId: demoEmployer.id, count: 3 })
        const created = await Promise.all(
          built.map((j) =>
            db.job.create({
              data: {
                title: j.title,
                description: j.description,
                type: j.type,
                category: j.category,
                status: j.status,
                employerId: employer!.userId,
                locationText: j.locationText,
                skillsRequired: j.skillsRequired,
                payRangeText: j.payRangeText,
                approvedAt: new Date(),
              },
              select: { id: true, title: true },
            })
          )
        )
        jobsForSeeding = created
      } else {
        // No demo employer yet — create a throwaway one and three jobs
        const { generateDemoName } = await import('@/lib/demo-credentials')
        const ts = Date.now()
        const empName = generateDemoName('employer', ts)
        const emp = await db.userProfile.create({
          data: {
            clerkUserId: `demo_seed_employer_${ts}`,
            role: 'employer',
            name: empName,
            firstName: 'Demo',
            lastName: 'Employer',
            email: `${empName}@ampertalent-demo.com`,
            timezone: 'America/Chicago',
            employer: { create: { companyName: 'Demo Co.' } },
          },
        })
        const built = buildSampleJobs({ employerProfileId: emp.id, count: 3 })
        const created = await Promise.all(
          built.map((j) =>
            db.job.create({
              data: {
                title: j.title,
                description: j.description,
                type: j.type,
                category: j.category,
                status: j.status,
                employerId: emp.id,
                locationText: j.locationText,
                skillsRequired: j.skillsRequired,
                payRangeText: j.payRangeText,
                approvedAt: new Date(),
              },
              select: { id: true, title: true },
            })
          )
        )
        jobsForSeeding = created
      }

      // Build the applications and write them. Application requires a
      // resumeUrl; buildSampleApplications fills that in.
      const apps = buildSampleApplications({
        seekerProfileId: profileId,
        jobs: jobsForSeeding,
      })
      const written = await db.$transaction(
        apps.map((a) =>
          db.application.create({
            data: {
              seekerId: a.seekerId,
              jobId: a.jobId,
              status: a.status,
              resumeUrl: a.resumeUrl,
              coverLetter: a.coverLetter ?? null,
            },
            select: { id: true },
          })
        )
      )
      return NextResponse.json({
        success: true,
        seeded: { applications: written.length, jobs: jobsForSeeding.length },
      })
    }

    if (role === 'employer') {
      // Get or create the Employer row
      let employer = await db.employer.findUnique({ where: { userId: profileId } })
      if (!employer) {
        employer = await db.employer.create({
          data: { userId: profileId, companyName: 'Demo Co.' },
        })
      }
      const built = buildSampleJobs({ employerProfileId: profileId, count: 3 })
      const created = await db.$transaction(
        built.map((j) =>
          db.job.create({
            data: {
              title: j.title,
              description: j.description,
              type: j.type,
              category: j.category,
              status: j.status,
              employerId: employer!.userId,
              locationText: j.locationText,
              skillsRequired: j.skillsRequired,
              payRangeText: j.payRangeText,
              approvedAt: new Date(),
            },
            select: { id: true, title: true },
          })
        )
      )
      return NextResponse.json({
        success: true,
        seeded: { jobs: created.length },
      })
    }

    // admin / super_admin — no sample data needed; the admin dashboard
    // already shows aggregate stats.
    return NextResponse.json({ success: true, seeded: {} })
  } catch (err: any) {
    console.error('🚨 DEMO SEED: failed:', {
      role,
      profileId,
      message: err?.message,
      code: err?.code,
      meta: err?.meta,
    })
    return NextResponse.json(
      { error: 'Failed to seed demo data', details: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}
