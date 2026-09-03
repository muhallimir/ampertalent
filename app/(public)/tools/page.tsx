'use client'

import { useState } from 'react'
import { JobMatchBadge } from '@/components/features/job-match-badge'
import { AtsBreakdownPanel } from '@/components/features/ats-breakdown-panel'
import { SalaryDisplay } from '@/components/features/salary-display'
import { FxConverterForm } from '@/components/features/fx-converter-form'
import { ApplicationStatusPill } from '@/components/features/application-status-pill'
import { CreditsBadge } from '@/components/features/credits-badge'
import { InterviewSlotList } from '@/components/features/interview-slot-list'
import { TalentCard } from '@/components/features/talent-card'
import { DigestPreview } from '@/components/features/digest-preview'
import { FeedbackSummaryCard } from '@/components/features/feedback-summary-card'
import { BenchmarkChart } from '@/components/features/benchmark-chart'
import { NotesList } from '@/components/features/notes-list'
import { ProrationSummary } from '@/components/features/proration-summary'
import { CouponResult } from '@/components/features/coupon-result'
import { DuplicateList } from '@/components/features/duplicate-list'
import { JobSchemaInspector } from '@/components/features/job-schema-inspector'
import { AuditTable } from '@/components/features/audit-table'
import { OnboardingChecklist } from '@/components/features/onboarding-checklist'
import { Timeline } from '@/components/features/timeline'
import { ResumeScoreCard } from '@/components/features/resume-score-card'
import { ImportResultPanel } from '@/components/features/import-result-panel'
import { SimilarJobsList } from '@/components/features/similar-jobs-list'
import { ResumeDiffCard } from '@/components/features/resume-diff-card'
import { WebhookStatusPill } from '@/components/features/webhook-status-pill'
import { SlugPreview } from '@/components/features/slug-preview'
import { AlertDigestList } from '@/components/features/alert-digest-list'
import { PostingScoreCard } from '@/components/features/posting-score-card'
import { BrandChecklist } from '@/components/features/brand-checklist'
import { ProfileStrengthMeter } from '@/components/features/profile-strength-meter'
import { EarningsCard } from '@/components/features/earnings-card'

interface FeatureDef {
  id: string
  title: string
  endpoint: string
  description: string
  body?: any
}

const FEATURES: FeatureDef[] = [
  { id: 'job-alert-matcher', title: 'Job alert matcher', endpoint: '/api/tools/job-alert-matcher', description: 'Score/rank jobs against alert criteria', body: { job: { id: 'j1', title: 'Senior React Developer', description: 'Next.js, TypeScript' }, criteria: { keywords: ['react', 'nextjs'], remoteOnly: true } } },
  { id: 'ats-fit-scorer', title: 'ATS fit scorer', endpoint: '/api/tools/ats-fit-scorer', description: 'Resume vs job description ATS fit', body: { resume: { skills: ['react', 'typescript'], yearsExperience: 5, pastTitles: ['Senior Frontend'] }, job: { requiredSkills: ['react', 'graphql'], niceToHaveSkills: ['docker'], title: 'senior frontend' } } },
  { id: 'salary-normalizer', title: 'Salary normalizer', endpoint: '/api/tools/salary-normalizer', description: 'Normalize salary across periods', body: { input: { amount: 60, currency: 'USD', period: 'hourly' } } },
  { id: 'fx', title: 'FX converter', endpoint: '/api/tools/fx', description: 'Convert between supported currencies', body: { amount: 100, from: 'USD', to: 'EUR' } },
  { id: 'application-state-machine', title: 'Application state machine', endpoint: '/api/tools/application-state-machine', description: 'Validate state transitions', body: { from: 'submitted', to: 'screening', actor: 'employer' } },
  { id: 'employer-credits', title: 'Employer credits', endpoint: '/api/tools/employer-credits', description: 'Job posting credit ledger', body: { employerId: 'demo', transactions: [{ kind: 'purchase', amount: 25, reason: 'pack' }] } },
  { id: 'interview-slot-picker', title: 'Interview slot picker', endpoint: '/api/tools/interview-slot-picker', description: 'Generate interview availability', body: { today: '2026-01-05', weekday: 1, days: 3, configs: [{ weekday: 1, start: '10:00', end: '12:00', slotMinutes: 30, interviewer: 'Maya' }] } },
  { id: 'talent-search', title: 'Talent search', endpoint: '/api/tools/talent-search', description: 'Search a talent pool', body: { profiles: [{ id: 'p1', name: 'Sam', headline: 'Senior React', skills: ['react', 'ts'], yearsExperience: 6, status: 'open' }], query: { text: 'react' } } },
  { id: 'job-digest', title: 'Job digest', endpoint: '/api/tools/job-digest', description: 'Compose a daily digest', body: { recipientName: 'Sam', sections: [{ heading: 'Engineering', jobs: [{ id: 'j1', title: 'Senior FE', company: 'Acme', url: 'https://example.com' }] }] } },
  { id: 'interview-feedback', title: 'Interview feedback', endpoint: '/api/tools/interview-feedback', description: 'Summarize structured feedback', body: { feedback: { interviewer: 'Maya', candidateId: 'c1', scores: { technical: 4, communication: 5, culture: 4, problemSolving: 4 }, notes: 'Strong candidate', recommendation: 'hire' } } },
  { id: 'comp-benchmark', title: 'Comp benchmark', endpoint: '/api/tools/comp-benchmark', description: 'Salary percentiles from a dataset', body: { points: [{ currency: 'USD', level: 3, jobFamily: 'engineering', amount: 130000 }, { currency: 'USD', level: 3, jobFamily: 'engineering', amount: 140000 }, { currency: 'USD', level: 3, jobFamily: 'engineering', amount: 110000 }], request: { currency: 'USD', level: 3, jobFamily: 'engineering' } } },
  { id: 'candidate-notes', title: 'Candidate notes', endpoint: '/api/tools/candidate-notes', description: 'Add + search private notes', body: { note: { candidateId: 'c1', authorId: 'a1', body: 'Strong React', tags: ['top'] } } },
  { id: 'subscription-proration', title: 'Subscription proration', endpoint: '/api/tools/subscription-proration', description: 'Prorate a plan change', body: { fromPlan: { id: 'b', name: 'Basic', priceMonthly: 29, priceAnnual: 290 }, toPlan: { id: 'p', name: 'Pro', priceMonthly: 99, priceAnnual: 990 }, dayOfCycle: 15, cycleLength: 30, cadence: 'monthly' } },
  { id: 'coupon-engine', title: 'Coupon engine', endpoint: '/api/tools/coupon-engine', description: 'Validate + apply a coupon', body: { coupon: { code: 'SAVE10', type: 'percentage', amount: 10, expiresAt: '2099-01-01' }, ctx: { orderTotalCents: 5000 } } },
  { id: 'job-dedupe', title: 'Job dedupe', endpoint: '/api/tools/job-dedupe', description: 'Find duplicate postings', body: { jobs: [{ id: '1', title: 'Senior FE', company: 'Acme' }, { id: '2', title: 'Senior Frontend', company: 'Acme' }], threshold: 50 } },
  { id: 'job-posting-schema', title: 'JobPosting JSON-LD', endpoint: '/api/tools/job-posting-schema', description: 'Generate schema.org JSON-LD', body: { title: 'Senior FE', description: 'Build things', company: 'Acme', datePosted: '2026-01-05', url: 'https://example.com/jobs/1' } },
  { id: 'audit-filter', title: 'Audit filter', endpoint: '/api/tools/audit-filter', description: 'Filter admin audit events', body: { events: [{ id: '1', at: '2026-01-05T10:00:00Z', actor: 'admin', action: 'user.create' }], query: { actor: 'admin' } } },
  { id: 'onboarding-progress', title: 'Onboarding progress', endpoint: '/api/tools/onboarding-progress', description: 'Onboarding checklist progress', body: { steps: [{ id: 'profile', label: 'Profile', completed: true, required: true }, { id: 'avatar', label: 'Avatar', completed: false, required: true }] } },
  { id: 'application-timeline', title: 'Application timeline', endpoint: '/api/tools/application-timeline', description: 'Group events by day', body: { events: [{ id: '1', at: '2026-01-05T10:00:00Z', type: 'created', by: 'system', summary: 'Created' }] } },
  { id: 'resume-quality-scorer', title: 'Resume quality', endpoint: '/api/tools/resume-quality-scorer', description: 'Resume signals', body: { signals: { rawText: 'Built a React app. Reduced load time by 40%. Led a team of 3. Shipped 5 features. Designed architecture. Increased revenue by 25%.' } } },
  { id: 'csv-bulk-import', title: 'CSV bulk import', endpoint: '/api/tools/csv-bulk-import', description: 'Parse + validate a CSV', body: { csv: 'name,email\nSam,sam@example.com\nBob,not-an-email' } },
  { id: 'job-embedding', title: 'Job embedding + similarity', endpoint: '/api/tools/job-embedding', description: 'TF embed + cosine similar', body: { seed: { id: 'q', title: 'Senior React', description: 'Next.js, TS' }, others: [{ id: 'a', title: 'Senior React Engineer', description: 'Next.js' }, { id: 'b', title: 'Data Scientist', description: 'Python' }] } },
  { id: 'resume-diff', title: 'Resume diff', endpoint: '/api/tools/resume-diff', description: 'Diff two resume versions', body: { a: { rawText: 'Built X', skills: ['react'], experienceBullets: ['old'], yearsExperience: 3 }, b: { rawText: 'Built Y', skills: ['react', 'rust'], experienceBullets: ['old', 'new'], yearsExperience: 4 } } },
  { id: 'webhook-delivery', title: 'Webhook delivery', endpoint: '/api/tools/webhook-delivery', description: 'Sign + retry webhook', body: { secret: 'demo', payload: { event: 'ping' } } },
  { id: 'job-slug', title: 'Job slug', endpoint: '/api/tools/job-slug', description: 'Generate + uniquify slug', body: { title: 'Senior FE', company: 'Acme', taken: ['senior-fe-acme'] } },
  { id: 'alert-digest', title: 'Alert digest', endpoint: '/api/tools/alert-digest', description: 'Per-user alert digest', body: { rule: { userId: 'u1', keywords: ['react'] }, jobs: [{ id: 'j1', title: 'Senior React', company: 'Acme', url: 'https://x', postedAt: '2026-01-05' }] } },
  { id: 'job-posting-scorer', title: 'Posting quality', endpoint: '/api/tools/job-posting-scorer', description: 'Score a job posting', body: { posting: { title: 'Senior FE', description: 'Build things. ' + 'lorem ipsum '.repeat(50), companyName: 'Acme', salaryMin: 100000, salaryMax: 150000, location: 'Remote', remote: true, employmentType: 'FULL_TIME', applyUrl: 'https://example.com' } } },
  { id: 'employer-brand', title: 'Employer brand', endpoint: '/api/tools/employer-brand', description: 'Brand profile completeness', body: { profile: { employerId: 'demo', assets: [{ id: 'a', type: 'logo', url: 'x' }], about: 'We are a remote-first team focused on... lorem ipsum.' } } },
  { id: 'profile-strength', title: 'Profile strength', endpoint: '/api/tools/profile-strength', description: 'Profile strength meter', body: { signals: { name: 'Sam', headline: 'Senior FE', about: 'Built many things. ' + 'x'.repeat(150), skills: ['react', 'ts', 'next', 'node', 'graphql'], experienceCount: 2, educationCount: 1, hasAvatar: true, hasResumeFile: true, links: [{ label: 'GH', url: 'https://gh' }] } } },
  { id: 'referral-rewards', title: 'Referral rewards', endpoint: '/api/tools/referral-rewards', description: 'Referral earnings', body: { referrals: [{ id: '1', referrerId: 'u1', candidateId: 'c1', jobId: 'j1', status: 'hired', rewardCents: 50000, createdAt: '2026-01-01' }], status: 'hired' } },
]

export default function ToolsPage() {
  const [results, setResults] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  async function run(f: FeatureDef) {
    setLoading((s) => ({ ...s, [f.id]: true }))
    try {
      const r = await fetch(f.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f.body ?? {}) })
      const json = await r.json()
      setResults((s) => ({ ...s, [f.id]: { status: r.status, body: json } }))
    } catch (e) {
      setResults((s) => ({ ...s, [f.id]: { error: e instanceof Error ? e.message : String(e) } }))
    } finally {
      setLoading((s) => ({ ...s, [f.id]: false }))
    }
  }

  return (
    <main data-testid="tools-page" className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-bold">ampertalent · tools showcase</h1>
      <p className="mt-2 text-gray-600">30 features shipped behind one public route. Click <em>Run</em> on any card to hit the live API and render the real component.</p>
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {FEATURES.map((f) => (
          <Card key={f.id} f={f} loading={loading[f.id]} result={results[f.id]} onRun={() => run(f)} />
        ))}
      </div>
    </main>
  )
}

function Card({ id, f, loading, result, onRun }: { id?: string; f: FeatureDef; loading?: boolean; result?: any; onRun: () => void }) {
  const fid = id ?? f.id
  return (
    <section data-testid={`card-${fid}`} className="rounded-md border bg-white p-4 shadow-sm">
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{f.title}</h2>
        <code className="text-xs text-gray-500">{f.endpoint}</code>
      </header>
      <p className="mt-1 text-sm text-gray-600">{f.description}</p>
      <button data-testid={`run-${fid}`} onClick={onRun} disabled={loading} className="mt-3 rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">
        {loading ? 'Running…' : 'Run'}
      </button>
      {result && (
        <div data-testid={`result-${fid}`} className="mt-3 rounded border bg-gray-50 p-3 text-xs">
          <div className="mb-1 text-gray-500">HTTP {result.status ?? '—'}</div>
          <pre className="overflow-auto whitespace-pre-wrap" data-testid={`payload-${fid}`}>{JSON.stringify(result.body ?? result, null, 2)}</pre>
        </div>
      )}
      <RenderPreview id={fid} result={result} />
    </section>
  )
}

function RenderPreview({ id, result }: { id: string; result?: any }) {
  if (!result?.body?.result) return null
  const r = result.body.result
  try {
    switch (id) {
      case 'job-alert-matcher':
        return r.score != null ? <div className="mt-2"><JobMatchBadge score={r.score} /></div> : null
      case 'ats-fit-scorer':
        return <div className="mt-2"><AtsBreakdownPanel score={r.overall} matched={r.matched} missing={r.missing} niceMatched={r.niceMatched} /></div>
      case 'salary-normalizer':
        return r.normalized ? <div className="mt-2"><SalaryDisplay annual={r.normalized.annual} monthly={r.normalized.monthly} weekly={r.normalized.weekly} hourly={r.normalized.hourly} currency={r.normalized.currency} /></div> : null
      case 'fx':
        return r.converted != null ? <div className="mt-2"><FxConverterForm amount={100} from="USD" to="EUR" converted={r.converted} /></div> : null
      case 'application-state-machine':
        return <div className="mt-2"><ApplicationStatusPill status={r.terminal ? 'hired' : 'interviewing'} /></div>
      case 'employer-credits':
        return <div className="mt-2"><CreditsBadge balance={r.balance ?? 0} /></div>
      case 'interview-slot-picker':
        return r.slots ? <div className="mt-2"><InterviewSlotList slots={r.slots.slice(0, 6)} /></div> : null
      case 'talent-search':
        return Array.isArray(r) ? <div className="mt-2">{r.slice(0, 3).map((t: any) => <TalentCard key={t.profile.id} id={t.profile.id} name={t.profile.name} headline={t.profile.headline} skills={t.profile.skills} yearsExperience={t.profile.yearsExperience} status={t.profile.status} score={t.score} />)}</div> : null
      case 'job-digest':
        return <div className="mt-2"><DigestPreview subject={r.subject ?? 'digest'} preheader={r.preheader ?? ''} totalJobs={r.totalJobs ?? 0} sections={[]} /></div>
      case 'interview-feedback':
        return r.summary ? <div className="mt-2"><FeedbackSummaryCard overall={r.summary.overall} recommendation={r.summary.recommendation} weighted={r.summary.weighted} redFlags={r.summary.redFlags} highlights={r.summary.highlights} /></div> : null
      case 'comp-benchmark':
        return <div className="mt-2"><BenchmarkChart currency={r.currency} level={r.level} p25={r.p25} p50={r.p50} p75={r.p75} p90={r.p90} source={r.source} /></div>
      case 'candidate-notes':
        return r.note ? <div className="mt-2"><NotesList notes={[r.note]} /></div> : null
      case 'subscription-proration':
        return <div className="mt-2"><ProrationSummary refund={r.refund} cost={r.cost} net={r.net} daysRemaining={r.daysRemaining} /></div>
      case 'coupon-engine':
        return <div className="mt-2"><CouponResult ok={r.ok} reason={r.reason} discountCents={r.discountCents} newTotalCents={r.newTotalCents} /></div>
      case 'job-dedupe':
        return Array.isArray(r.pairs) ? <div className="mt-2"><DuplicateList pairs={r.pairs} /></div> : null
      case 'job-posting-schema':
        return r.schema ? <div className="mt-2"><JobSchemaInspector schema={r.schema} /></div> : null
      case 'audit-filter':
        return Array.isArray(r.events) ? <div className="mt-2"><AuditTable events={r.events} /></div> : null
      case 'onboarding-progress':
        return r.progress ? <div className="mt-2"><OnboardingChecklist steps={[{ id: 'a', label: 'Profile', completed: r.progress.done > 0, required: true }]} /></div> : null
      case 'application-timeline':
        return Array.isArray(r.sorted) ? <div className="mt-2"><Timeline events={r.sorted} /></div> : null
      case 'resume-quality-scorer':
        return <div className="mt-2"><ResumeScoreCard overall={r.overall} signals={r.signals} suggestions={r.suggestions} /></div>
      case 'csv-bulk-import':
        return <div className="mt-2"><ImportResultPanel total={r.total} imported={r.imported} issues={r.issues} /></div>
      case 'job-embedding':
        return r.similar ? <div className="mt-2"><SimilarJobsList items={r.similar.map((s: any) => ({ id: s.id, title: s.id, score: s.score }))} /></div> : null
      case 'resume-diff':
        return <div className="mt-2"><ResumeDiffCard addedSkills={r.addedSkills} removedSkills={r.removedSkills} addedBullets={r.addedBullets} removedBullets={r.removedBullets} yearsDelta={r.yearsDelta} wordsAdded={r.wordsAdded} wordsRemoved={r.wordsRemoved} summary={r.summary} /></div>
      case 'webhook-delivery':
        return <div className="mt-2"><WebhookStatusPill status="pending" attempts={1} /></div>
      case 'job-slug':
        return r.slug ? <div className="mt-2"><SlugPreview source={`${f.body?.title} · ${f.body?.company}`} slug={r.slug} /></div> : null
      case 'alert-digest':
        return r.items ? <div className="mt-2"><AlertDigestList items={r.items.map((i: any) => ({ job: i.job, matched: i.matched, score: i.score }))} /></div> : null
      case 'job-posting-scorer':
        return <div className="mt-2"><PostingScoreCard overall={r.overall} reasons={r.reasons} signals={r.signals} suggestions={r.suggestions} /></div>
      case 'employer-brand':
        return <div className="mt-2"><BrandChecklist hasLogo={r.hasLogo} hasBanner={r.hasBanner} hasAbout={r.hasAbout} hasTestimonial={r.hasTestimonial} photoCount={r.photoCount} videoCount={r.videoCount} score={r.score} missing={r.missing} /></div>
      case 'profile-strength':
        return <div className="mt-2"><ProfileStrengthMeter score={r.score} level={r.level} missing={r.missing} /></div>
      case 'referral-rewards':
        return r.earnings ? <div className="mt-2"><EarningsCard totalCents={r.earnings.totalCents} pendingCents={r.earnings.pendingCents} paidCents={r.earnings.paidCents} byJob={r.earnings.byJob} /></div> : null
      default:
        return null
    }
  } catch (e) {
    return <div className="mt-2 text-xs text-red-600">Render error: {e instanceof Error ? e.message : String(e)}</div>
  }
}
