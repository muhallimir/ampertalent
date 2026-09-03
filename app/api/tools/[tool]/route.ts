/**
 * Unified tools API for the 30 features shipped to ampertalent.
 *
 * Each feature exposes a small, public, read-mostly endpoint that the
 * /tools showcase page (and the e2e specs) can hit without auth.
 * The handlers wrap the pure logic in /lib so the same code is unit-tested
 * and exercised over HTTP.
 *
 * Tool catalog: see TOOL_HANDLERS below.
 */

import { NextRequest, NextResponse } from 'next/server'
import { scoreJobAgainstAlert, rankJobs } from '@/lib/job-alert-matcher'
import { scoreAtsFit } from '@/lib/ats-fit-scorer'
import { normalizeSalary, salaryRatio } from '@/lib/salary-normalizer'
import { convert, supportedCurrencies } from '@/lib/fx'
import { canTransition, nextStatuses, isTerminal } from '@/lib/application-state-machine'
import { applyTransaction, emptyAccount, canConsume, consume } from '@/lib/employer-credits'
import { slotsForDay, nextMatchingDays, pickFirstAvailable } from '@/lib/interview-slot-picker'
import { searchTalent } from '@/lib/talent-search'
import { composeDigest } from '@/lib/job-digest'
import { buildAlertDigest, alertDigestSubject } from '@/lib/alert-digest'
import { summarizeFeedback, recommendationLabel } from '@/lib/interview-feedback'
import { benchmark } from '@/lib/comp-benchmark'
import { createNote, searchNotes, tagCounts } from '@/lib/candidate-notes'
import { prorate } from '@/lib/subscription-proration'
import { validateCoupon } from '@/lib/coupon-engine'
import { findDuplicates, similarity } from '@/lib/job-dedupe'
import { jobPostingJsonLd, jobPostingScriptTag } from '@/lib/job-posting-schema'
import { filterAudit, summarize } from '@/lib/audit-filter'
import { progress, nextStep } from '@/lib/onboarding-progress'
import { sortTimeline, groupByDay, duration } from '@/lib/application-timeline'
import { scoreResume } from '@/lib/resume-quality-scorer'
import { parseCsv, validateAndBuild } from '@/lib/csv-bulk-import'
import { embed, similarJobs } from '@/lib/job-embedding'
import { diffResume } from '@/lib/resume-diff'
import { sign, nextBackoffMs, deliver } from '@/lib/webhook-delivery'
import { slugify, uniquify, jobSlug } from '@/lib/job-slug'
import { scoreJobPosting } from '@/lib/job-posting-scorer'
import { scoreBrandCompleteness } from '@/lib/employer-brand'
import { profileStrength } from '@/lib/profile-strength'
import { canTransitionReferral, rewardFor, earnings } from '@/lib/referral-rewards'

type Handler = (body: any) => any

const TOOL_HANDLERS: Record<string, { methods: string[]; handle: Handler; description: string }> = {
  'job-alert-matcher': {
    methods: ['GET', 'POST'],
    description: 'Score/rank jobs against alert criteria',
    handle: (b) => {
      if (b?.job && b?.criteria) {
        return scoreJobAgainstAlert(b.job, b.criteria)
      }
      return rankJobs(b?.jobs ?? [], b?.criteria ?? {}, { minScore: b?.minScore ?? 0 })
    },
  },
  'ats-fit-scorer': {
    methods: ['GET', 'POST'],
    description: 'Resume vs job description ATS fit',
    handle: (b) => scoreAtsFit(
      b?.resume ?? { skills: [] },
      b?.job ?? { requiredSkills: [], niceToHaveSkills: [], title: '' },
    ),
  },
  'salary-normalizer': {
    methods: ['POST'],
    description: 'Normalize salary across hourly/weekly/monthly/annual',
    handle: (b) => ({
      normalized: normalizeSalary(b?.input ?? { amount: 0, currency: 'USD', period: 'annual' }),
      ratio: b?.a && b?.b ? salaryRatio(b.a, b.b) : null,
    }),
  },
  'fx': {
    methods: ['GET', 'POST'],
    description: 'Convert between supported currencies',
    handle: (b) => ({
      currencies: supportedCurrencies(),
      converted: b?.amount != null ? convert(Number(b.amount), String(b.from ?? 'USD'), String(b.to ?? 'USD')) : null,
    }),
  },
  'application-state-machine': {
    methods: ['POST'],
    description: 'Validate application state transitions',
    handle: (b) => ({
      canTransition: canTransition(b?.from, b?.to, b?.actor),
      nextStatuses: nextStatuses(b?.from, b?.actor),
      terminal: isTerminal(b?.to),
    }),
  },
  'employer-credits': {
    methods: ['POST'],
    description: 'Employer job-posting credit ledger',
    handle: (b) => {
      let s = emptyAccount(b?.employerId ?? 'demo')
      for (const tx of b?.transactions ?? []) s = applyTransaction(s, tx)
      return { balance: s.balance, lifetimePurchased: s.lifetimePurchased, lifetimeConsumed: s.lifetimeConsumed, canConsume: canConsume(s, b?.consume ?? 0) }
    },
  },
  'interview-slot-picker': {
    methods: ['POST'],
    description: 'Generate interview slot options',
    handle: (b) => ({
      slots: pickFirstAvailable(b?.configs ?? [], b?.today ?? new Date().toISOString().slice(0, 10), b?.count ?? 5),
      matches: nextMatchingDays(b?.today ?? new Date().toISOString().slice(0, 10), b?.weekday ?? 1, b?.days ?? 4),
    }),
  },
  'talent-search': {
    methods: ['POST'],
    description: 'Search a talent pool by skills/text/location',
    handle: (b) => searchTalent(b?.profiles ?? [], b?.query ?? {}),
  },
  'job-digest': {
    methods: ['POST'],
    description: 'Compose a daily job digest (markdown + html)',
    handle: (b) => {
      const d = composeDigest({ recipientName: b?.recipientName ?? 'Friend', sections: b?.sections ?? [] })
      return { subject: d.subject, totalJobs: d.totalJobs, markdown: d.markdown, html: d.html }
    },
  },
  'interview-feedback': {
    methods: ['POST'],
    description: 'Summarize structured interview feedback',
    handle: (b) => ({
      summary: summarizeFeedback(b?.feedback ?? { interviewer: '?', candidateId: '?', scores: { technical: 3, communication: 3, culture: 3, problemSolving: 3 }, notes: '', recommendation: 'hire' }),
      label: recommendationLabel(b?.feedback?.recommendation ?? 'hire'),
    }),
  },
  'comp-benchmark': {
    methods: ['POST'],
    description: 'Comp percentiles from a points dataset',
    handle: (b) => benchmark(b?.points ?? [], b?.request ?? { currency: 'USD', level: 3, jobFamily: 'engineering' }),
  },
  'candidate-notes': {
    methods: ['POST'],
    description: 'Add + search private candidate notes',
    handle: (b) => {
      const note = createNote(b?.note ?? { candidateId: 'c1', authorId: 'a1', body: 'sample note' })
      return { note, search: searchNotes([note], b?.note?.candidateId ?? 'c1', b?.query) }
    },
  },
  'subscription-proration': {
    methods: ['POST'],
    description: 'Prorate a plan change mid-cycle',
    handle: (b) => prorate(b?.input ?? {
      fromPlan: { id: 'basic', name: 'Basic', priceMonthly: 29, priceAnnual: 290 },
      toPlan: { id: 'pro', name: 'Pro', priceMonthly: 99, priceAnnual: 990 },
      dayOfCycle: 15,
      cycleLength: 30,
      cadence: 'monthly',
    }),
  },
  'coupon-engine': {
    methods: ['POST'],
    description: 'Validate + apply a coupon code',
    handle: (b) => validateCoupon(b?.coupon ?? { code: 'X', type: 'percentage', amount: 10 }, b?.ctx ?? { orderTotalCents: 5000 }),
  },
  'job-dedupe': {
    methods: ['POST'],
    description: 'Find likely duplicate job postings',
    handle: (b) => ({
      pairs: findDuplicates(b?.jobs ?? [], b?.threshold ?? 70),
      sampleSimilarity: b?.a && b?.b ? similarity(b.a, b.b) : null,
    }),
  },
  'job-posting-schema': {
    methods: ['POST'],
    description: 'Generate JobPosting JSON-LD',
    handle: (b) => {
      const schema = jobPostingJsonLd(b?.input ?? { title: 'Senior FE', description: 'Build things', company: 'Acme', datePosted: '2026-01-05', url: 'https://example.com/jobs/1' })
      return { schema, scriptTag: jobPostingScriptTag(schema) }
    },
  },
  'audit-filter': {
    methods: ['POST'],
    description: 'Filter admin audit events',
    handle: (b) => ({
      events: filterAudit(b?.events ?? [], b?.query ?? {}),
      summary: summarize(b?.events ?? []),
    }),
  },
  'onboarding-progress': {
    methods: ['POST'],
    description: 'Onboarding checklist progress',
    handle: (b) => ({
      progress: progress(b?.steps ?? []),
      next: nextStep(b?.steps ?? []),
    }),
  },
  'application-timeline': {
    methods: ['POST'],
    description: 'Sort + group application events by day',
    handle: (b) => ({
      sorted: sortTimeline(b?.events ?? []),
      groups: groupByDay(b?.events ?? []),
      duration: duration(b?.events ?? []),
    }),
  },
  'resume-quality-scorer': {
    methods: ['POST'],
    description: 'Resume quality signals (length/bullets/verbs/metrics)',
    handle: (b) => scoreResume(b?.signals ?? { rawText: '' }),
  },
  'csv-bulk-import': {
    methods: ['POST'],
    description: 'Parse + validate a candidate CSV',
    handle: (b) => validateAndBuild(b?.csv ?? ''),
  },
  'job-embedding': {
    methods: ['POST'],
    description: 'TF embed + cosine similar jobs',
    handle: (b) => {
      const seed = embed(b?.seed ?? { id: 'q', title: '' })
      const all = (b?.others ?? []).map((o: any) => embed(o))
      return { seed, similar: similarJobs(all, seed, b?.topK ?? 5) }
    },
  },
  'resume-diff': {
    methods: ['POST'],
    description: 'Diff two resume versions',
    handle: (b) => diffResume(
      b?.a ?? { rawText: '', skills: [], experienceBullets: [], yearsExperience: 0 },
      b?.b ?? { rawText: '', skills: [], experienceBullets: [], yearsExperience: 0 },
    ),
  },
  'webhook-delivery': {
    methods: ['POST'],
    description: 'Sign + retry a webhook delivery (no real send by default)',
    handle: (b) => {
      const body = JSON.stringify(b?.payload ?? {})
      const signature = sign(String(b?.secret ?? 'demo'), body)
      return {
        signature,
        backoffMs: nextBackoffMs(b?.attempts ?? 1),
        delivery: b?.simulate
          ? null
          : { signature, bodyPreview: body.slice(0, 80), attempts: 0, status: 'pending' },
      }
    },
  },
  'job-slug': {
    methods: ['POST'],
    description: 'Generate + uniquify a job slug',
    handle: (b) => ({
      slug: jobSlug(b?.title ?? '', b?.company ?? '', b?.taken ?? []),
      base: slugify(`${b?.title ?? ''}-${b?.company ?? ''}`),
      uniquified: uniquify(slugify(b?.base ?? ''), b?.taken ?? []),
    }),
  },
  'alert-digest': {
    methods: ['POST'],
    description: 'Build a per-user alert digest',
    handle: (b) => {
      const d = buildAlertDigest(b?.rule, b?.jobs ?? [], { maxItems: b?.maxItems ?? 25 })
      return { items: d.items, subject: alertDigestSubject(d), generatedAt: d.generatedAt }
    },
  },
  'job-posting-scorer': {
    methods: ['POST'],
    description: 'Score a job posting for quality',
    handle: (b) => scoreJobPosting(b?.posting ?? { title: '', description: '', companyName: '' }),
  },
  'employer-brand': {
    methods: ['POST'],
    description: 'Employer brand profile completeness',
    handle: (b) => scoreBrandCompleteness(b?.profile ?? { employerId: 'demo', assets: [] }),
  },
  'profile-strength': {
    methods: ['POST'],
    description: 'Profile strength meter',
    handle: (b) => profileStrength(b?.signals ?? { skills: [], experienceCount: 0, educationCount: 0, hasAvatar: false, hasResumeFile: false, links: [] }),
  },
  'referral-rewards': {
    methods: ['POST'],
    description: 'Referral earnings summary',
    handle: (b) => ({
      earnings: earnings(b?.referrals ?? []),
      sampleReward: rewardFor(b?.status ?? 'hired'),
      canTransition: canTransitionReferral(b?.from ?? 'pending', b?.to ?? 'in_progress'),
    }),
  },
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params
  const entry = TOOL_HANDLERS[tool]
  if (!entry) return NextResponse.json({ error: 'unknown_tool', tool, available: Object.keys(TOOL_HANDLERS) }, { status: 404 })
  return NextResponse.json({ tool, description: entry.description, methods: entry.methods, sample: entry.handle({}) })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params
  const entry = TOOL_HANDLERS[tool]
  if (!entry) return NextResponse.json({ error: 'unknown_tool', tool, available: Object.keys(TOOL_HANDLERS) }, { status: 404 })
  let body: any = {}
  try { body = await req.json() } catch { body = {} }
  try {
    const result = entry.handle(body)
    return NextResponse.json({ tool, ok: true, result })
  } catch (e) {
    return NextResponse.json({ tool, ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 400 })
  }
}
