/**
 * Completes the rich demo data if a prior run was interrupted.
 *
 * The main seeder (scripts/seed-rich-demo-data.ts) is idempotent — running it
 * again will purge and recreate. But the purge-then-create flow is slow
 * through pgbouncer (~3-5 min). If a prior run was interrupted, this script
 * does the lighter recovery:
 *   1. Completes any seekers that have profile+jobSeeker but no subscription
 *   2. Runs the applications loop against the 30 jobs
 *
 * Safe to run multiple times — it skips anything that's already done.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { config as loadDotenv } from 'dotenv'

import { PrismaClient, Prisma } from '@prisma/client'

const DEMO_PREFIX = 'demo-rich-'

if (process.env.NODE_ENV === 'production') {
  console.error('❌ Refusing to run in production.')
  process.exit(1)
}

const dotenvPath = process.argv.find((a) => a === '--dotenv') ? process.argv[process.argv.indexOf('--dotenv') + 1] : '.env.local'
if (dotenvPath && existsSync(resolve(dotenvPath))) {
  loadDotenv({ path: resolve(dotenvPath) })
}

const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } })

const SEEKER_SETTINGS: Record<string, { plan: any; priceCents: number; durationDays: number; resumeCredits: number; isTrial: boolean; billingFreq: string }> = {
  '01': { plan: 'vip_quarterly', priceCents: 7999, durationDays: 90, resumeCredits: 999, isTrial: false, billingFreq: '3-months' },
  '02': { plan: 'gold_bimonthly', priceCents: 4999, durationDays: 60, resumeCredits: 3, isTrial: false, billingFreq: '2-months' },
  '03': { plan: 'annual_platinum', priceCents: 29900, durationDays: 365, resumeCredits: 999, isTrial: false, billingFreq: '12-months' },
  '04': { plan: 'gold_bimonthly', priceCents: 4999, durationDays: 60, resumeCredits: 3, isTrial: false, billingFreq: '2-months' },
  '05': { plan: 'vip_quarterly', priceCents: 7999, durationDays: 90, resumeCredits: 999, isTrial: false, billingFreq: '3-months' },
  '06': { plan: 'vip_quarterly', priceCents: 7999, durationDays: 90, resumeCredits: 999, isTrial: false, billingFreq: '3-months' },
  '07': { plan: 'gold_bimonthly', priceCents: 4999, durationDays: 60, resumeCredits: 3, isTrial: false, billingFreq: '2-months' },
  '08': { plan: 'vip_quarterly', priceCents: 7999, durationDays: 90, resumeCredits: 999, isTrial: false, billingFreq: '3-months' },
  '09': { plan: 'gold_bimonthly', priceCents: 4999, durationDays: 60, resumeCredits: 3, isTrial: false, billingFreq: '2-months' },
  '10': { plan: 'annual_platinum', priceCents: 29900, durationDays: 365, resumeCredits: 999, isTrial: false, billingFreq: '12-months' },
  '11': { plan: 'vip_quarterly', priceCents: 7999, durationDays: 90, resumeCredits: 999, isTrial: false, billingFreq: '3-months' },
  '12': { plan: 'gold_bimonthly', priceCents: 4999, durationDays: 60, resumeCredits: 3, isTrial: false, billingFreq: '2-months' },
  '13': { plan: 'trial_monthly', priceCents: 3499, durationDays: 33, resumeCredits: 1, isTrial: true, billingFreq: '1-month' },
  '14': { plan: 'gold_bimonthly', priceCents: 4999, durationDays: 60, resumeCredits: 3, isTrial: false, billingFreq: '2-months' },
  '15': { plan: 'vip_quarterly', priceCents: 7999, durationDays: 90, resumeCredits: 999, isTrial: false, billingFreq: '3-months' },
  '16': { plan: 'trial_monthly', priceCents: 3499, durationDays: 33, resumeCredits: 1, isTrial: true, billingFreq: '1-month' },
  '17': { plan: 'annual_platinum', priceCents: 29900, durationDays: 365, resumeCredits: 999, isTrial: false, billingFreq: '12-months' },
  '18': { plan: 'gold_bimonthly', priceCents: 4999, durationDays: 60, resumeCredits: 3, isTrial: false, billingFreq: '2-months' },
  '19': { plan: 'gold_bimonthly', priceCents: 4999, durationDays: 60, resumeCredits: 3, isTrial: false, billingFreq: '2-months' },
  '20': { plan: 'trial_monthly', priceCents: 3499, durationDays: 33, resumeCredits: 1, isTrial: true, billingFreq: '1-month' },
}

const PLAN_ID = {
  trial_monthly: 'trial',
  gold_bimonthly: 'gold',
  vip_quarterly: 'vip-platinum',
  annual_platinum: 'annual-platinum',
} as Record<string, string>

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

const RUN_TS = Date.now()

async function completeSeekers() {
  console.log('🔧 Completing any seeker rows missing subscription/resume/notification...')

  const seekers = await db.userProfile.findMany({
    where: { name: { startsWith: `${DEMO_PREFIX}seeker-` } },
    include: { jobSeeker: true },
    orderBy: { name: 'asc' },
  })

  let completed = 0
  for (const seeker of seekers) {
    const match = seeker.name.match(/-(\d{2})$/)
    if (!match) continue
    const num = match[1]
    const settings = SEEKER_SETTINGS[num]
    if (!settings) {
      console.warn(`  no settings for ${seeker.name} (num=${num})`)
      continue
    }

    const existingSub = await db.subscription.findFirst({ where: { seekerId: seeker.id } })
    const existingRes = await db.resume.findFirst({ where: { seekerId: seeker.id } })
    const existingExt = await db.externalPayment.findFirst({ where: { userId: seeker.id } })
    const existingNotif = await db.notification.findFirst({ where: { userId: seeker.id, type: 'seeker_payment_confirmation' } })

    if (existingSub && existingRes && existingExt && existingNotif) {
      continue
    }

    const createdDaysAgo = 18 + parseInt(num, 10) * 2
    const periodStart = daysAgo(createdDaysAgo)
    const periodEnd = new Date(periodStart.getTime() + settings.durationDays * 24 * 60 * 60 * 1000)

    let extPayment = existingExt
    if (!extPayment) {
      extPayment = await db.externalPayment.create({
        data: {
          userId: seeker.id,
          amount: new Prisma.Decimal(settings.priceCents / 100),
          planId: PLAN_ID[settings.plan] || settings.plan,
          status: 'completed',
          authnetTransactionId: `demo_sub_${settings.plan}_${RUN_TS}_${num}`,
          webhookProcessedAt: periodStart,
        },
      })
    }

    if (!existingSub) {
      await db.subscription.create({
        data: {
          seekerId: seeker.id,
          plan: settings.plan,
          status: 'active',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          expires_at: periodEnd,
          billingFrequency: settings.billingFreq,
          nextBillingDate: periodEnd,
          externalPaymentId: extPayment.id,
          authnetSubscriptionId: `demo_sub_auth_${RUN_TS}_${num}`,
        },
      })
    }

    if (!existingRes) {
      await db.resume.create({
        data: {
          seekerId: seeker.id,
          filename: `resume-${seeker.id}.pdf`,
          fileUrl: `https://ampertalent-demo.com/resumes/${seeker.id}-0.pdf`,
          fileSize: 150_000,
          isPrimary: true,
        },
      })
    }

    if (!existingNotif) {
      await db.notification.create({
        data: {
          userId: seeker.id,
          type: 'seeker_payment_confirmation',
          title: 'Subscription active',
          message: `Your ${settings.plan.replace('_', ' ')} plan is active until ${periodEnd.toISOString().slice(0, 10)}.`,
          priority: 'medium',
        },
      })
    }

    completed++
  }
  console.log(`   ✓ completed ${completed} seekers\n`)
}

async function createApplications() {
  console.log('📄 Creating applications + interview history...')

  const existingAppCount = await db.application.count({
    where: { seeker: { user: { name: { startsWith: `${DEMO_PREFIX}seeker-` } } } },
  })
  if (existingAppCount > 0) {
    console.log(`   ⚠️  ${existingAppCount} applications already exist — skipping to keep idempotent`)
    return
  }

  const seekers = await db.userProfile.findMany({
    where: { name: { startsWith: `${DEMO_PREFIX}seeker-` } },
    select: { id: true, firstName: true, lastName: true, name: true },
    orderBy: { name: 'asc' },
  })

  const jobs = await db.job.findMany({
    where: { employer: { user: { name: { startsWith: `${DEMO_PREFIX}employer-` } } } },
    select: { id: true, title: true, employerId: true },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`   ${seekers.length} seekers × ${jobs.length} jobs`)

  const STATUS_MIX: Array<{ status: any; weight: number }> = [
    { status: 'pending', weight: 40 },
    { status: 'reviewed', weight: 25 },
    { status: 'interview', weight: 15 },
    { status: 'rejected', weight: 12 },
    { status: 'hired', weight: 8 },
  ]
  const totalWeight = STATUS_MIX.reduce((sum, s) => sum + s.weight, 0)

  function pickStatus() {
    let r = Math.random() * totalWeight
    for (const s of STATUS_MIX) {
      if (r < s.weight) return s.status
      r -= s.weight
    }
    return 'pending'
  }

  const COVER_LETTERS = [
    "Hi! I came across your role and immediately wanted to reach out. I've shipped similar work at a comparable stage and would love to dig into how your team is structured.",
    "Saw this on AmperTalent and the scope matches what I do best. My previous team went through a similar build and I'd love to share what worked (and what didn't).",
    "Quick intro: I've been doing this kind of work for the last few years and the specifics of your role stood out. Happy to walk through any relevant projects on a call.",
    "I'd love to chat about this role. I've put together a few notes on how I'd approach the first 90 days and can share on a screen.",
    "If you're open to a quick conversation, I can walk through how I'd think about the hardest part of this role — the part you can't fully capture in a posting.",
  ]

  let appCount = 0
  let ivCount = 0
  let notifCount = 0
  const totals: Record<string, number> = { pending: 0, reviewed: 0, interview: 0, rejected: 0, hired: 0 }

  for (let si = 0; si < seekers.length; si++) {
    const seeker = seekers[si]
    const shuffled = jobs.slice()
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const appsPerSeeker = 3 + Math.floor(Math.random() * 3) // 3-5
    const seen = new Set<string>()
    const batchCreateData: any[] = []
    const batchMeta: Array<{ idx: number; job: any; status: any; appliedAt: Date }> = []

    for (let ai = 0; ai < appsPerSeeker && ai < shuffled.length; ai++) {
      const job = shuffled[ai]
      if (seen.has(job.id)) continue
      seen.add(job.id)
      const status = pickStatus()
      const appliedDaysAgo = 1 + Math.floor(Math.random() * 12)
      const appliedAt = daysAgo(appliedDaysAgo)
      batchCreateData.push({
        jobId: job.id,
        seekerId: seeker.id,
        resumeUrl: `https://ampertalent-demo.com/resumes/${seeker.id}-${ai}.pdf`,
        coverLetter: ai === 0 ? COVER_LETTERS[si % COVER_LETTERS.length] : null,
        status,
        appliedAt,
        updatedAt: appliedAt,
      })
      batchMeta.push({ idx: ai, job, status, appliedAt })
    }

    // Bulk insert — one round trip per seeker
    const created = await db.$transaction(
      batchCreateData.map((data) => db.application.create({ data, select: { id: true } }))
    )

    // Now create interview history & notifications based on status
    for (let i = 0; i < created.length; i++) {
      const app = created[i]
      const meta = batchMeta[i]
      totals[meta.status] = (totals[meta.status] || 0) + 1
      appCount++

      if (meta.status === 'interview' || meta.status === 'hired') {
        const scheduledFor = new Date(meta.appliedAt.getTime() + 3 * 24 * 60 * 60 * 1000)
        await db.interviewHistory.create({
          data: {
            applicationId: app.id,
            stage: meta.status === 'hired' ? 'final_interview' : 'technical_interview',
            scheduledAt: scheduledFor,
            completedAt: new Date(scheduledFor.getTime() + 60 * 60 * 1000),
            notes: meta.status === 'hired'
              ? 'Strong signal across the board. Offered the role.'
              : 'Solid technical signal. Moving to next round.',
            feedback: meta.status === 'hired'
              ? 'Excellent communication, deep system design instincts, strong culture fit.'
              : 'Met the bar on all technical criteria. Recommend advancing.',
            interviewerId: meta.job.employerId,
          },
        })
        ivCount++

        if (meta.status === 'hired') {
          await db.interviewHistory.create({
            data: {
              applicationId: app.id,
              stage: 'initial_screening',
              scheduledAt: new Date(meta.appliedAt.getTime() + 1 * 24 * 60 * 60 * 1000),
              completedAt: new Date(meta.appliedAt.getTime() + 1 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
              notes: 'Recruiter screen. Strong background.',
              feedback: 'Clear communication and ownership. Moving to technical.',
              interviewerId: meta.job.employerId,
            },
          })
          ivCount++
        }
      }

      // Notify employer — do this in one batch at the end too
      await db.notification.create({
        data: {
          userId: meta.job.employerId,
          type: 'new_application',
          title: 'New application',
          message: `${seeker.firstName} ${seeker.lastName} applied for ${meta.job.title}`,
          priority: 'medium',
          data: { applicationId: app.id, jobId: meta.job.id },
        },
      })
      notifCount++
    }

    if ((si + 1) % 5 === 0) {
      console.log(`   ${si + 1}/${seekers.length} seekers processed (${appCount} apps so far)`)
    }
  }

  console.log(`   ✓ ${appCount} applications, ${ivCount} interview history rows, ${notifCount} notifications`)
  console.log(`   by status: ${JSON.stringify(totals)}\n`)
}

async function main() {
  console.log('🔧 Completing rich demo data (if interrupted)...\n')
  await completeSeekers()
  await createApplications()
  console.log('✅ Done.')
}

main()
  .then(async () => { await db.$disconnect() })
  .catch(async (e) => { console.error('❌', e); await db.$disconnect(); process.exit(1) })
